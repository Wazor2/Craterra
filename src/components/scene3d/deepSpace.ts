import * as THREE from "three";

const BASE_PATH = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

export interface DeepSpaceEnvironment {
  group: THREE.Group;
  dispose: () => void;
}

export interface DeepSpaceOptions {
  /** Radius of the outer nebula / starmap sky dome */
  domeRadius?: number;
  /** Pixel ratio for crisp GLSL star point sizes */
  pixelRatio: number;
  /** Max hardware anisotropy */
  maxAnisotropy: number;
  /** Callback invoked when NASA 4K starmap finishes async loading */
  onTextureReady?: () => void;
  /** Tilt of sky dome to frame the Milky Way & nebula arc cleanly behind the scene */
  rotationEuler?: [number, number, number];
}

function createStarLayer(
  count: number,
  radiusMin: number,
  radiusMax: number,
  sizeMin: number,
  sizeMax: number,
  seedInit: number,
  pixelRatio: number,
  galacticBias: number,
  diffractionCross: boolean
): {
  points: THREE.Points;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
} {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const col = new THREE.Color();

  let seed = seedInit >>> 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let i = 0; i < count; i++) {
    const u = rand();
    const v = rand();
    const w = rand();
    const c = rand();

    const az = u * Math.PI * 2;
    // Concentrate a natural share along the galactic equator while keeping full 4pi coverage
    let yNorm = v * 2 - 1;
    if (galacticBias > 0 && rand() < galacticBias) {
      yNorm = (rand() + rand() - 1) * 0.34;
    }
    const rHoriz = Math.sqrt(Math.max(0.0001, 1 - yNorm * yNorm));
    const r = radiusMin + rand() * (radiusMax - radiusMin);

    positions[i * 3] = r * rHoriz * Math.cos(az);
    positions[i * 3 + 1] = r * yNorm;
    positions[i * 3 + 2] = r * rHoriz * Math.sin(az);

    const mag = Math.pow(w, 2.8);
    sizes[i] = (sizeMin + mag * (sizeMax - sizeMin)) * pixelRatio;

    const brightness = 0.42 + mag * 0.58;
    // Realistic astronomical spectral distribution (O/B cyan-blue, A white, F/G cream, K/M warm amber)
    if (c > 0.78) {
      col.setRGB(0.68 * brightness, 0.84 * brightness, 1.0 * brightness);
    } else if (c > 0.52) {
      col.setRGB(0.88 * brightness, 0.92 * brightness, 1.0 * brightness);
    } else if (c < 0.16) {
      col.setRGB(1.0 * brightness, 0.79 * brightness, 0.58 * brightness);
    } else if (c < 0.32) {
      col.setRGB(0.96 * brightness, 0.87 * brightness, 0.98 * brightness);
    } else {
      col.setRGB(0.96 * brightness, 0.97 * brightness, 1.0 * brightness);
    }

    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: `
      attribute float aSize;
      varying vec3 vColor;
      void main() {
        vColor = color;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize;
      }
    `,
    fragmentShader: diffractionCross
      ? `
        varying vec3 vColor;
        void main() {
          vec2 d = gl_PointCoord - vec2(0.5);
          float dist = length(d) * 2.0;
          if (dist > 1.0) discard;
          float core = exp(-dist * dist * 9.5);
          float halo = exp(-dist * 3.6) * 0.32;
          float spikeX = exp(-abs(d.y) * 26.0) * exp(-abs(d.x) * 4.5);
          float spikeY = exp(-abs(d.x) * 26.0) * exp(-abs(d.y) * 4.5);
          float alpha = clamp(core + halo + (spikeX + spikeY) * 0.42, 0.0, 1.0);
          gl_FragColor = vec4(vColor, alpha);
        }
      `
      : `
        varying vec3 vColor;
        void main() {
          vec2 d = gl_PointCoord - vec2(0.5);
          float dist = length(d) * 2.0;
          if (dist > 1.0) discard;
          float core = exp(-dist * dist * 5.6);
          gl_FragColor = vec4(vColor, core);
        }
      `,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return { points, geometry, material };
}

/**
 * Builds a multi-layered astronomical deep-space environment combining:
 * 1. NASA SVS #4851 Deep Star Maps 2020 (4K Gaia DR2 + Hipparcos-2 + Tycho-2)
 * 2. Seamless 3D spherical-noise nebula formations, cosmic dust lanes, deep-space
 *    indigo/midnight-blue/violet/magenta/cyan gradients & subtle distant galaxies
 * 3. Three depth shells of naturally distributed spectral pinpoint stars
 */
export function createDeepSpaceEnvironment({
  domeRadius = 3400,
  pixelRatio,
  maxAnisotropy,
  onTextureReady,
  rotationEuler = [0.34, 0.68, -0.44],
}: DeepSpaceOptions): DeepSpaceEnvironment {
  const group = new THREE.Group();
  group.rotation.set(rotationEuler[0], rotationEuler[1], rotationEuler[2]);

  let disposed = false;
  let starmapTex: THREE.Texture | null = null;

  // 1. Seamless 3D Spherical Nebula, Galactic Dust & Distant Galaxies Sky Dome
  const skyGeo = new THREE.SphereGeometry(domeRadius, 64, 48);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      uStarMap: { value: null },
      uHasStarMap: { value: 0.0 },
    },
    vertexShader: `
      varying vec3 vDir;
      varying vec2 vUv;
      void main() {
        vDir = normalize(position);
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uStarMap;
      uniform float uHasStarMap;
      varying vec3 vDir;
      varying vec2 vUv;

      float hash31(vec3 p) {
        p = fract(p * 0.1031);
        p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }

      float noise3(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        vec3 u = f * f * (3.0 - 2.0 * f);
        float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
        float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
        float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
        float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
        float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
        float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
        float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
        float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
        float nx00 = mix(n000, n100, u.x);
        float nx10 = mix(n010, n110, u.x);
        float nx01 = mix(n001, n101, u.x);
        float nx11 = mix(n011, n111, u.x);
        return mix(mix(nx00, nx10, u.y), mix(nx01, nx11, u.y), u.z);
      }

      float fbm3(vec3 p) {
        float sum = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 4; i++) {
          sum += amp * noise3(p);
          p = p * 2.06 + vec3(13.7, -7.3, 9.1);
          amp *= 0.5;
        }
        return sum;
      }

      vec3 renderDistantGalaxy(
        vec3 dir,
        vec3 centerDir,
        vec3 axisU,
        vec3 axisV,
        float angularScale,
        float tiltAspect,
        vec3 diskTint,
        vec3 coreTint,
        float spiralArms
      ) {
        float align = dot(dir, centerDir);
        if (align < 0.96) return vec3(0.0);
        vec3 delta = dir - centerDir * align;
        vec2 local = vec2(dot(delta, axisU), dot(delta, axisV) / tiltAspect) / angularScale;
        float r = length(local);
        if (r > 2.8) return vec3(0.0);
        float ang = atan(local.y, local.x);
        float core = exp(-r * r * 14.0);
        float spiral = 0.68 + 0.32 * cos(spiralArms * ang - r * 5.8);
        float disk = exp(-r * 1.9) * spiral * smoothstep(2.6, 0.35, r);
        return coreTint * core * 0.28 + diskTint * disk * 0.14;
      }

      void main() {
        vec3 dir = normalize(vDir);

        // Deep-space atmospheric sky gradient: midnight blue -> deep indigo -> velvety void
        float galLat = abs(dir.y);
        float bandWide = exp(-galLat * galLat * 5.2);
        float bandCore = exp(-galLat * galLat * 24.0);

        vec3 colDeepVoid = vec3(0.011, 0.016, 0.044);     // #03040b
        vec3 colMidnight = vec3(0.024, 0.043, 0.105);     // midnight blue
        vec3 colIndigo   = vec3(0.048, 0.045, 0.138);     // deep indigo
        vec3 colViolet   = vec3(0.095, 0.054, 0.155);     // astronomical violet
        vec3 colCyanVeil = vec3(0.055, 0.165, 0.235);     // subtle [O III] cyan nebula
        vec3 colMagenta  = vec3(0.185, 0.068, 0.175);     // subtle [H-alpha] rose-magenta

        // Subtle whole-sky cosmic gradient
        float skyGrad = 0.5 + 0.5 * dot(dir, normalize(vec3(0.35, 0.45, -0.82)));
        vec3 sky = mix(colDeepVoid, colMidnight, 0.38 + 0.42 * skyGrad);
        sky = mix(sky, colIndigo, bandWide * 0.52);

        // Domain-warped 3D nebula clouds & filaments (zero UV seam across all 4pi sky)
        vec3 warp = vec3(
          fbm3(dir * 2.3 + vec3(1.4, -2.1, 0.8)),
          fbm3(dir * 2.3 + vec3(-3.2, 1.9, 4.1)),
          fbm3(dir * 2.3 + vec3(2.7, 3.6, -1.5))
        );
        float nebMain = fbm3(dir * 3.1 + (warp - 0.5) * 2.1);
        float nebFine = fbm3(dir * 6.8 - (warp - 0.5) * 1.4);
        float dustLane = fbm3(dir * 4.9 + vec3(0.0, warp.y * 1.8, warp.z * 1.4));

        // Natural astronomical clouds strongest along the Milky Way belt & high-latitude cirrus
        float nebEnvelope = 0.24 + 0.76 * bandWide;
        float veilMask = smoothstep(0.42, 0.78, nebMain) * nebEnvelope;
        float filamentMask = smoothstep(0.48, 0.82, nebFine) * (0.32 + 0.68 * bandCore);
        float dustAbsorption = 1.0 - smoothstep(0.47, 0.69, dustLane) * bandCore * 0.62;

        // Subtle spectral nebula regions (violet -> cyan O-III -> muted rose-magenta H-alpha)
        float regionMix = smoothstep(0.32, 0.68, warp.x);
        float ionMix = smoothstep(0.46, 0.78, warp.z);
        vec3 nebColor = mix(colViolet, colCyanVeil, regionMix * 0.85);
        nebColor = mix(nebColor, colMagenta, ionMix * 0.68);

        sky += nebColor * veilMask * 0.62;
        sky += mix(colCyanVeil, colMagenta, regionMix) * filamentMask * 0.34;

        // Subtle warm Galactic Bulge glow behind dust rift
        float coreBulge = pow(max(0.0, dot(dir, normalize(vec3(0.84, 0.04, 0.54)))), 6.0);
        sky += vec3(0.115, 0.088, 0.135) * coreBulge * bandWide * 0.75;

        // Apply cosmic dark dust lanes cleanly across the nebula & Milky Way core
        sky *= dustAbsorption;

        // Blend genuine NASA SVS #4851 Gaia DR2 + Hipparcos-2 4K Starmap
        if (uHasStarMap > 0.5) {
          vec3 starTex = texture2D(uStarMap, vUv).rgb;
          float texLum = dot(starTex, vec3(0.2126, 0.7152, 0.0722));
          // Keep background dust subtle while preserving crisp bright Gaia stars
          vec3 starBoost = starTex * mix(0.68, 1.08, smoothstep(0.06, 0.45, texLum));
          sky += starBoost * (0.72 + 0.28 * dustAbsorption);
        }

        // Subtle distant deep-field spiral & elliptical galaxies
        sky += renderDistantGalaxy(
          dir,
          normalize(vec3(-0.56, 0.64, 0.52)),
          normalize(vec3(0.76, 0.26, 0.59)),
          normalize(vec3(-0.28, 0.72, -0.63)),
          0.028,
          0.42,
          vec3(0.36, 0.50, 0.86),
          vec3(0.95, 0.86, 0.72),
          2.0
        );
        sky += renderDistantGalaxy(
          dir,
          normalize(vec3(0.42, -0.71, -0.56)),
          normalize(vec3(0.84, 0.48, -0.24)),
          normalize(vec3(0.26, -0.34, 0.90)),
          0.021,
          0.55,
          vec3(0.56, 0.46, 0.82),
          vec3(0.98, 0.88, 0.76),
          2.0
        );
        sky += renderDistantGalaxy(
          dir,
          normalize(vec3(-0.22, -0.66, 0.72)),
          normalize(vec3(0.94, 0.10, 0.32)),
          normalize(vec3(-0.18, 0.74, 0.65)),
          0.016,
          0.36,
          vec3(0.38, 0.64, 0.85),
          vec3(0.92, 0.88, 0.82),
          3.0
        );
        sky += renderDistantGalaxy(
          dir,
          normalize(vec3(0.68, 0.58, -0.45)),
          normalize(vec3(0.54, -0.74, -0.40)),
          normalize(vec3(0.46, 0.24, 0.85)),
          0.018,
          0.62,
          vec3(0.62, 0.50, 0.76),
          vec3(1.0, 0.90, 0.78),
          2.0
        );

        gl_FragColor = vec4(sky, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });

  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  skyDome.frustumCulled = false;
  group.add(skyDome);

  // Load genuine NASA SVS #4851 Gaia DR2 + Hipparcos-2 4K Starmap (mipmapped & anisotropic)
  const texLoader = new THREE.TextureLoader();
  texLoader.load(`${BASE_PATH}/textures/starmap_2020_4k.webp`, (tex) => {
    if (disposed) {
      tex.dispose();
      return;
    }
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = maxAnisotropy;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    starmapTex = tex;
    skyMat.uniforms.uStarMap.value = tex;
    skyMat.uniforms.uHasStarMap.value = 1.0;
    onTextureReady?.();
  });

  // 2. Multi-Layer Spectral Starfields (Depth & Magnitude Separation)
  const deepFaintStars = createStarLayer(
    3200,
    domeRadius * 0.86,
    domeRadius * 0.94,
    0.85,
    1.75,
    19690720,
    pixelRatio,
    0.45,
    false
  );
  const midSpectralStars = createStarLayer(
    1500,
    domeRadius * 0.76,
    domeRadius * 0.85,
    1.35,
    3.0,
    19721211,
    pixelRatio,
    0.6,
    false
  );
  const nearBrightStars = createStarLayer(
    220,
    domeRadius * 0.66,
    domeRadius * 0.75,
    2.7,
    5.2,
    20261201,
    pixelRatio,
    0.35,
    true
  );

  group.add(deepFaintStars.points);
  group.add(midSpectralStars.points);
  group.add(nearBrightStars.points);

  return {
    group,
    dispose: () => {
      disposed = true;
      skyGeo.dispose();
      skyMat.dispose();
      starmapTex?.dispose();
      deepFaintStars.geometry.dispose();
      deepFaintStars.material.dispose();
      midSpectralStars.geometry.dispose();
      midSpectralStars.material.dispose();
      nearBrightStars.geometry.dispose();
      nearBrightStars.material.dispose();
    },
  };
}
