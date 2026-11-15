import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Compass } from "lucide-react";
import type { Site } from "../lib/types";
import { createDeepSpaceEnvironment } from "./scene3d/deepSpace";
import { createRegolithTexture } from "./scene3d/textures";

interface MoonGlobe3DProps {
  sites: Site[];
  selectedSiteId: string;
  onSelectSiteForTerrain: (siteId: string) => void;
  fullScreen?: boolean;
}

type GlobePreset = "south_pole" | "nearside" | "full_orbit";

interface ProjectedPin {
  site: Site;
  x: number;
  y: number;
  visible: boolean;
}

const DEG = Math.PI / 180;
const MOON_RADIUS = 100;
const BASE_PATH = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

function latLonToDir(latDeg: number, lonDeg: number): THREE.Vector3 {
  const theta = (90 - latDeg) * DEG;
  const phi = (180 + lonDeg) * DEG;
  return new THREE.Vector3(
    -Math.cos(phi) * Math.sin(theta),
    Math.cos(theta),
    Math.sin(phi) * Math.sin(theta)
  ).normalize();
}

function isSoftwareContext(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  try {
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export function MoonGlobe3D({
  sites,
  selectedSiteId,
  onSelectSiteForTerrain,
  fullScreen = true,
}: MoonGlobe3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [preset, setPreset] = useState<GlobePreset>("south_pole");
  const [hoveredSiteId, setHoveredSiteId] = useState<string | null>(null);
  const [projectedPins, setProjectedPins] = useState<ProjectedPin[]>([]);
  const [showLabels, setShowLabels] = useState(true);
  const [contextLost, setContextLost] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);

  const sitesRef = useRef<Site[]>(sites);
  sitesRef.current = sites;
  const selectedRef = useRef<string>(selectedSiteId);
  selectedRef.current = selectedSiteId;
  const hoveredRef = useRef<string | null>(hoveredSiteId);
  hoveredRef.current = hoveredSiteId;
  const onSelectRef = useRef(onSelectSiteForTerrain);
  onSelectRef.current = onSelectSiteForTerrain;

  const presetTriggerRef = useRef<(p: GlobePreset) => void>(() => {});
  const requestRenderRef = useRef<() => void>(() => {});
  const rebuildMarkersRef = useRef<() => void>(() => {});

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 600;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "default",
      });
    } catch (err) {
      setWebglError(
        err instanceof Error
          ? err.message
          : "WebGL 3D context could not be initialized."
      );
      return;
    }

    setWebglError(null);
    const isSoftwareGl = isSoftwareContext(renderer.getContext());
    const pixelRatio = isSoftwareGl
      ? 1
      : Math.min(window.devicePixelRatio || 1, 2);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
      requestRenderRef.current();
    };
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    renderer.domElement.addEventListener(
      "webglcontextrestored",
      onContextRestored
    );

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x03050a);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 8000);
    // Initial view focused cleanly toward the Lunar South Pole sites
    camera.position.set(28, -172, 46);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.panSpeed = 1.15;
    controls.zoomSpeed = 1.25;
    controls.minDistance = 104;
    controls.maxDistance = 920;
    controls.target.set(0, 0, 0);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const fallbackMaps = createRegolithTexture(maxAniso);

    // Multi-layer Astronomical Deep-Space Environment (NASA Gaia 4K + 3D Nebula, Dust & Galaxies)
    const deepSpace = createDeepSpaceEnvironment({
      domeRadius: 3400,
      pixelRatio,
      maxAnisotropy: maxAniso,
      rotationEuler: [0.34, 0.68, -0.44],
      onTextureReady: () => requestRenderRef.current(),
    });
    scene.add(deepSpace.group);

    let nasaMoonColorTex: THREE.Texture | null = null;
    let nasaMoonNormalTex: THREE.Texture | null = null;
    let nasaMoonElevTex: THREE.Texture | null = null;
    let lolaSpNormalTex: THREE.Texture | null = null;
    let lolaSpReliefTex: THREE.Texture | null = null;
    let disposed = false;

    const texLoader = new THREE.TextureLoader();

    const configureEquirectTex = (tex: THREE.Texture, isColor: boolean) => {
      if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.anisotropy = maxAniso;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
    };

    const configurePolarTex = (tex: THREE.Texture) => {
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.anisotropy = maxAniso;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
    };

    // Complete 3D Moon Globe (NASA LROC Dec 2025 4K + LOLA 4K Normals + Regional 80m/px South Pole)
    const moonGeo = new THREE.SphereGeometry(MOON_RADIUS, 128, 96);
    const moonUniforms = {
      uHasSpNormal: { value: 0.0 },
      uHasSpRelief: { value: 0.0 },
      uHasElevMap: { value: 0.0 },
      uSpNormalMap: { value: null as THREE.Texture | null },
      uSpReliefMap: { value: null as THREE.Texture | null },
      uElevMap: { value: null as THREE.Texture | null },
    };

    const moonMat = new THREE.MeshStandardMaterial({
      map: fallbackMaps.map,
      roughness: 0.92,
      metalness: 0.0,
      color: 0xffffff,
    });
    moonMat.customProgramCacheKey = () => "lunar_moon_albedo_lola_sp_v3";
    moonMat.onBeforeCompile = (shader) => {
      shader.uniforms.uHasSpNormal = moonUniforms.uHasSpNormal;
      shader.uniforms.uHasSpRelief = moonUniforms.uHasSpRelief;
      shader.uniforms.uHasElevMap = moonUniforms.uHasElevMap;
      shader.uniforms.uSpNormalMap = moonUniforms.uSpNormalMap;
      shader.uniforms.uSpReliefMap = moonUniforms.uSpReliefMap;
      shader.uniforms.uElevMap = moonUniforms.uElevMap;

      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          varying vec3 vMoonObjPos;
          varying vec3 vMoonViewX;
          varying vec3 vMoonViewY;
          varying vec3 vMoonViewZ;`
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          vMoonObjPos = position;
          vMoonViewX = normalize(normalMatrix * vec3(1.0, 0.0, 0.0));
          vMoonViewY = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));
          vMoonViewZ = normalize(normalMatrix * vec3(0.0, 0.0, 1.0));`
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          varying vec3 vMoonObjPos;
          varying vec3 vMoonViewX;
          varying vec3 vMoonViewY;
          varying vec3 vMoonViewZ;
          uniform float uHasSpNormal;
          uniform float uHasSpRelief;
          uniform float uHasElevMap;
          uniform sampler2D uSpNormalMap;
          uniform sampler2D uSpReliefMap;
          uniform sampler2D uElevMap;`
        )
        .replace(
          "#include <map_fragment>",
          `#include <map_fragment>
          vec3 moonObjN = normalize(vMoonObjPos);
          // South Polar Stereographic UVs for 80S..90S (tan(5 deg) = 0.08748866, 0E = +Y_uv, 90E = +X_uv)
          vec2 spProj = vec2(-moonObjN.z, moonObjN.x) / (max(0.05, 1.0 - moonObjN.y) * 0.08748866);
          vec2 spUv = clamp(spProj * 0.5 + 0.5, 0.0, 1.0);
          float spFeather = smoothstep(0.9848, 0.9892, -moonObjN.y);

          if (uHasSpRelief > 0.5 && spFeather > 0.001) {
            float spRelief = texture2D(uSpReliefMap, spUv).r;
            // Subtle genuine 80m/px topographic ridge/crater-wall contrast without synthetic grain
            float reliefMult = mix(1.0, 0.85 + spRelief * 0.34, spFeather);
            diffuseColor.rgb *= reliefMult;
          }

          if (uHasElevMap > 0.5) {
            float elevSample = texture2D(uElevMap, vMapUv).r;
            // Gentle authentic basin vs highland albedo separation without crushing shadows
            diffuseColor.rgb *= mix(0.95, 1.06, elevSample);
          }

          // Luminous highland whites preserving crisp maria & crater detail
          float luma = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          float stretched = smoothstep(0.07, 0.72, luma);
          float boosted = mix(luma * 0.94, pow(max(stretched, 0.0001), 0.80) * 1.24, 0.74);
          float lumScale = luma > 0.001 ? boosted / luma : 1.0;
          diffuseColor.rgb = clamp(diffuseColor.rgb * lumScale, 0.0, 1.0);`
        )
        .replace(
          "#include <normal_fragment_maps>",
          `#include <normal_fragment_maps>
          if (uHasSpNormal > 0.5 && spFeather > 0.001) {
            vec3 spTexN = texture2D(uSpNormalMap, spUv).xyz * 2.0 - 1.0;
            // Map polar stereographic tangent basis (+X=90E=-Z_obj, +Y=0E=+X_obj, +Z=out=-Y_obj) to object space
            vec3 spObjN = normalize(vec3(spTexN.y, -spTexN.z, -spTexN.x));
            vec3 spViewN = normalize(
              vMoonViewX * spObjN.x +
              vMoonViewY * spObjN.y +
              vMoonViewZ * spObjN.z
            );
            normal = normalize(mix(normal, spViewN, spFeather * 0.82));
          }`
        );
    };

    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    scene.add(moonMesh);

    texLoader.load(`${BASE_PATH}/textures/lroc_color_4k.webp`, (tex) => {
      if (disposed) {
        tex.dispose();
        return;
      }
      configureEquirectTex(tex, true);
      nasaMoonColorTex = tex;
      moonMat.map = tex;
      moonMat.needsUpdate = true;
      requestRenderRef.current();
    });

    texLoader.load(`${BASE_PATH}/textures/lola_normal_4k.webp`, (tex) => {
      if (disposed) {
        tex.dispose();
        return;
      }
      configureEquirectTex(tex, false);
      nasaMoonNormalTex = tex;
      moonMat.normalMap = tex;
      moonMat.normalScale.set(1.15, 1.15);
      moonMat.needsUpdate = true;
      requestRenderRef.current();
    });

    texLoader.load(`${BASE_PATH}/textures/lola_elev_4k.webp`, (tex) => {
      if (disposed) {
        tex.dispose();
        return;
      }
      configureEquirectTex(tex, false);
      nasaMoonElevTex = tex;
      moonUniforms.uElevMap.value = tex;
      moonUniforms.uHasElevMap.value = 1.0;
      requestRenderRef.current();
    });

    texLoader.load(`${BASE_PATH}/textures/lola_sp_80s_normal_2k.webp`, (tex) => {
      if (disposed) {
        tex.dispose();
        return;
      }
      configurePolarTex(tex);
      lolaSpNormalTex = tex;
      moonUniforms.uSpNormalMap.value = tex;
      moonUniforms.uHasSpNormal.value = 1.0;
      requestRenderRef.current();
    });

    texLoader.load(`${BASE_PATH}/textures/lola_sp_80s_relief_2k.webp`, (tex) => {
      if (disposed) {
        tex.dispose();
        return;
      }
      configurePolarTex(tex);
      lolaSpReliefTex = tex;
      moonUniforms.uSpReliefMap.value = tex;
      moonUniforms.uHasSpRelief.value = 1.0;
      requestRenderRef.current();
    });

    // Subtle Lunar South Pole latitude reference circle (-80° S)
    const lat80R = MOON_RADIUS * Math.cos(80 * DEG) + 0.15;
    const lat80Y = -MOON_RADIUS * Math.sin(80 * DEG);
    const poleRingGeo = new THREE.RingGeometry(lat80R - 0.18, lat80R + 0.18, 96);
    poleRingGeo.rotateX(Math.PI / 2);
    const poleRingMat = new THREE.MeshBasicMaterial({
      color: 0xeab354,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
    });
    const poleRing = new THREE.Mesh(poleRingGeo, poleRingMat);
    poleRing.position.y = lat80Y;
    scene.add(poleRing);

    // Balanced, luminous space illumination keeping crisp crater detail across both poles & nearside
    const ambientLight = new THREE.AmbientLight(0xdbe4f0, 0.92);
    scene.add(ambientLight);
    const sunKey = new THREE.DirectionalLight(0xfff9f0, 2.55);
    sunKey.position.set(240, -110, 145);
    scene.add(sunKey);
    const earthshineFill = new THREE.DirectionalLight(0x9bc4ec, 0.85);
    earthshineFill.position.set(-220, 130, -155);
    scene.add(earthshineFill);

    // Interactive Highlighted Landing Site Markers (scaled proportionally to ~1.2 unit South Pole spacing)
    const markersGroup = new THREE.Group();
    scene.add(markersGroup);

    const ringGeo = new THREE.RingGeometry(0.85, 1.32, 32);
    const outerRingGeo = new THREE.RingGeometry(1.65, 1.98, 32);
    const stemGeo = new THREE.CylinderGeometry(0.11, 0.11, 2.8, 8);
    const orbGeo = new THREE.SphereGeometry(0.62, 16, 16);
    const hitGeo = new THREE.SphereGeometry(2.15, 12, 12);
    const hitMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    interface MarkerEntry {
      site: Site;
      group: THREE.Group;
      hitMesh: THREE.Mesh;
      ringMat: THREE.MeshBasicMaterial;
      outerMat: THREE.MeshBasicMaterial;
      orbMat: THREE.MeshBasicMaterial;
      stemMat: THREE.MeshBasicMaterial;
      dir: THREE.Vector3;
      labelAnchor: THREE.Vector3;
    }

    let markers: MarkerEntry[] = [];

    const rebuildMarkers = () => {
      for (const m of markers) {
        markersGroup.remove(m.group);
        m.ringMat.dispose();
        m.outerMat.dispose();
        m.orbMat.dispose();
        m.stemMat.dispose();
      }
      markers = [];

      const up = new THREE.Vector3(0, 0, 1);
      const yUp = new THREE.Vector3(0, 1, 0);

      for (const site of sitesRef.current) {
        const dir = latLonToDir(site.lat, site.lon);
        const isApollo = site.type === "apollo";
        const baseHex = isApollo ? 0x56b4e9 : 0xeab354;

        const group = new THREE.Group();
        group.position.copy(dir).multiplyScalar(MOON_RADIUS + 0.2);

        const ringMat = new THREE.MeshBasicMaterial({
          color: baseHex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.94,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.quaternion.setFromUnitVectors(up, dir);
        group.add(ringMesh);

        const outerMat = new THREE.MeshBasicMaterial({
          color: baseHex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.45,
        });
        const outerMesh = new THREE.Mesh(outerRingGeo, outerMat);
        outerMesh.quaternion.setFromUnitVectors(up, dir);
        group.add(outerMesh);

        const stemMat = new THREE.MeshBasicMaterial({
          color: baseHex,
          transparent: true,
          opacity: 0.88,
        });
        const stemMesh = new THREE.Mesh(stemGeo, stemMat);
        stemMesh.quaternion.setFromUnitVectors(yUp, dir);
        stemMesh.position.copy(dir).multiplyScalar(1.4);
        group.add(stemMesh);

        const orbMat = new THREE.MeshBasicMaterial({ color: baseHex });
        const orbMesh = new THREE.Mesh(orbGeo, orbMat);
        orbMesh.position.copy(dir).multiplyScalar(2.9);
        group.add(orbMesh);

        const hitMesh = new THREE.Mesh(hitGeo, hitMat);
        hitMesh.position.copy(dir).multiplyScalar(1.8);
        hitMesh.userData = { siteId: site.id };
        group.add(hitMesh);

        markersGroup.add(group);
        markers.push({
          site,
          group,
          hitMesh,
          ringMat,
          outerMat,
          orbMat,
          stemMat,
          dir,
          labelAnchor: dir.clone().multiplyScalar(MOON_RADIUS + 4.1),
        });
      }
    };

    rebuildMarkers();
    rebuildMarkersRef.current = rebuildMarkers;

    // Raycasting for clicking & hovering highlighted Moon sites
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const pickSiteAt = (clientX: number, clientY: number): string | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(
        markers.map((m) => m.hitMesh),
        false
      );
      for (const hit of hits) {
        const sid = hit.object.userData?.siteId as string | undefined;
        if (!sid) continue;
        const entry = markers.find((m) => m.site.id === sid);
        if (!entry) continue;
        // Only pick markers on the camera-facing hemisphere
        const toCam = camera.position
          .clone()
          .sub(entry.group.position)
          .normalize();
        if (toCam.dot(entry.dir) > -0.05) {
          return sid;
        }
      }
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      const hitId = pickSiteAt(e.clientX, e.clientY);
      if (hitId !== hoveredRef.current) {
        hoveredRef.current = hitId;
        setHoveredSiteId(hitId);
        renderer.domElement.style.cursor = hitId ? "pointer" : "grab";
        requestRenderRef.current();
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const moved = Math.hypot(
        e.clientX - pointerDownPos.x,
        e.clientY - pointerDownPos.y
      );
      if (moved > 6) return; // Was an orbit drag, not a click
      const hitId = pickSiteAt(e.clientX, e.clientY);
      if (hitId) {
        onSelectRef.current(hitId);
      }
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    // Camera Presets
    const _camTargetPos = new THREE.Vector3();
    const _ctrlTargetPos = new THREE.Vector3();
    let transitionActive = false;

    const applyPresetTarget = (p: GlobePreset) => {
      if (p === "south_pole") {
        _camTargetPos.set(28, -172, 46);
        _ctrlTargetPos.set(0, 0, 0);
      } else if (p === "nearside") {
        _camTargetPos.set(232, 34, -104);
        _ctrlTargetPos.set(0, 0, 0);
      } else {
        _camTargetPos.set(250, -95, 250);
        _ctrlTargetPos.set(0, 0, 0);
      }
      transitionActive = true;
      requestRenderRef.current();
    };
    presetTriggerRef.current = applyPresetTarget;

    const onControlStart = () => {
      transitionActive = false;
    };
    controls.addEventListener("start", onControlStart);

    // Sync marker highlights & 2D projected overlay pins
    const _proj = new THREE.Vector3();
    const _toCam = new THREE.Vector3();
    const syncOverlayPins = () => {
      const w = container.clientWidth || 960;
      const h = container.clientHeight || 600;
      const nextPins: ProjectedPin[] = [];

      for (const m of markers) {
        const isActive =
          m.site.id === selectedRef.current || m.site.id === hoveredRef.current;
        const scale = isActive ? 1.4 : 1.0;
        m.group.scale.setScalar(scale);
        const isApollo = m.site.type === "apollo";
        const highlightHex = isActive ? 0xffffff : isApollo ? 0x56b4e9 : 0xeab354;
        m.orbMat.color.setHex(highlightHex);
        m.outerMat.opacity = isActive ? 0.85 : 0.45;

        _toCam.copy(camera.position).sub(m.group.position).normalize();
        const facingCam = _toCam.dot(m.dir) > 0.08;

        _proj.copy(m.labelAnchor).project(camera);
        const sx = (_proj.x * 0.5 + 0.5) * w;
        const sy = (-_proj.y * 0.5 + 0.5) * h;
        const inFrame =
          _proj.z > -1 && _proj.z < 1 && sx > 16 && sx < w - 16 && sy > 16 && sy < h - 16;

        nextPins.push({
          site: m.site,
          x: sx,
          y: sy,
          visible: facingCam && inFrame,
        });
      }

      // Gently nudge clustered South Pole labels vertically apart across 2 passes
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < nextPins.length; i++) {
          if (!nextPins[i].visible) continue;
          for (let j = 0; j < i; j++) {
            if (!nextPins[j].visible) continue;
            const dx = Math.abs(nextPins[i].x - nextPins[j].x);
            const dy = Math.abs(nextPins[i].y - nextPins[j].y);
            if (dx < 148 && dy < 28) {
              nextPins[i].y = nextPins[j].y + (nextPins[i].y >= nextPins[j].y ? 30 : -30);
            }
          }
        }
      }

      setProjectedPins(nextPins);
    };

    // Coalesced on-demand renderer
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync !== "function") {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const syncState = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (syncState === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        if (disposed) {
          renderBusy = false;
          return;
        }
        renderDirty = false;
        const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
        lastTime = now;

        if (transitionActive) {
          camera.position.x = THREE.MathUtils.damp(
            camera.position.x,
            _camTargetPos.x,
            6,
            dt
          );
          camera.position.y = THREE.MathUtils.damp(
            camera.position.y,
            _camTargetPos.y,
            6,
            dt
          );
          camera.position.z = THREE.MathUtils.damp(
            camera.position.z,
            _camTargetPos.z,
            6,
            dt
          );
          controls.target.x = THREE.MathUtils.damp(
            controls.target.x,
            _ctrlTargetPos.x,
            6,
            dt
          );
          controls.target.y = THREE.MathUtils.damp(
            controls.target.y,
            _ctrlTargetPos.y,
            6,
            dt
          );
          controls.target.z = THREE.MathUtils.damp(
            controls.target.z,
            _ctrlTargetPos.z,
            6,
            dt
          );
          if (
            camera.position.distanceTo(_camTargetPos) < 0.25 &&
            controls.target.distanceTo(_ctrlTargetPos) < 0.1
          ) {
            transitionActive = false;
          } else {
            renderDirty = true;
          }
        }

        const dampingChanged = controls.update();
        if (dampingChanged && controls.enableDamping) {
          renderDirty = true;
        }

        camera.updateMatrixWorld();
        syncOverlayPins();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (!disposed && renderDirty) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    requestRenderRef.current = requestRender;
    controls.addEventListener("change", requestRender);

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        requestRender();
      }
    });
    resizeObserver.observe(container);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener("start", onControlStart);
      controls.removeEventListener("change", requestRender);
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener(
        "webglcontextlost",
        onContextLost
      );
      renderer.domElement.removeEventListener(
        "webglcontextrestored",
        onContextRestored
      );
      for (const m of markers) {
        m.ringMat.dispose();
        m.outerMat.dispose();
        m.orbMat.dispose();
        m.stemMat.dispose();
      }
      ringGeo.dispose();
      outerRingGeo.dispose();
      stemGeo.dispose();
      orbGeo.dispose();
      hitGeo.dispose();
      hitMat.dispose();
      poleRingGeo.dispose();
      poleRingMat.dispose();
      moonGeo.dispose();
      moonMat.dispose();
      deepSpace.dispose();
      fallbackMaps.map.dispose();
      fallbackMaps.normalMap.dispose();
      fallbackMaps.roughnessMap.dispose();
      fallbackMaps.aoMap.dispose();
      nasaMoonColorTex?.dispose();
      nasaMoonNormalTex?.dispose();
      nasaMoonElevTex?.dispose();
      lolaSpNormalTex?.dispose();
      lolaSpReliefTex?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    rebuildMarkersRef.current();
    requestRenderRef.current();
  }, [sites]);

  useEffect(() => {
    requestRenderRef.current();
  }, [selectedSiteId]);

  const handlePreset = (nextPreset: GlobePreset) => {
    setPreset(nextPreset);
    presetTriggerRef.current(nextPreset);
  };

  return (
    <section
      aria-label="Interactive 3D Moon Globe with highlighted landing sites"
      className={
        fullScreen
          ? "relative h-full w-full overflow-hidden bg-[#03050a]"
          : "relative h-[460px] w-full overflow-hidden rounded-[6px] border border-[#1f2530] bg-[#03050a]"
      }
    >
      <div
        ref={mountRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        aria-label="3D Moon globe: click any highlighted landing site to inspect"
      />

      {/* Projected Clickable Landing Site Pins on the Visible Hemisphere */}
      {showLabels && (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          {projectedPins.map((pin) => {
            if (!pin.visible) return null;
            const isApollo = pin.site.type === "apollo";
            const isSelected = pin.site.id === selectedSiteId;
            const isHovered = pin.site.id === hoveredSiteId;
            return (
              <button
                key={pin.site.id}
                type="button"
                onClick={() => onSelectSiteForTerrain(pin.site.id)}
                onMouseEnter={() => setHoveredSiteId(pin.site.id)}
                onMouseLeave={() => setHoveredSiteId(null)}
                style={{
                  left: `${pin.x}px`,
                  top: `${pin.y}px`,
                  transform: "translate(-50%, -125%)",
                }}
                className={`pointer-events-auto absolute inline-flex items-center gap-1.5 rounded-[5px] border px-2 py-0.5 text-[11px] font-medium shadow-[0_4px_14px_rgba(0,0,0,0.65)] transition-colors whitespace-nowrap ${
                  isHovered || isSelected
                    ? isApollo
                      ? "border-[#56B4E9] bg-[#151922]/[0.95] text-[#edf0f5]"
                      : "border-[#eab354] bg-[#151922]/[0.95] text-[#edf0f5]"
                    : "border-[#2d3544]/90 bg-[#090b10]/[0.85] text-[#edf0f5] hover:border-[#eab354]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    isApollo ? "bg-[#56B4E9]" : "bg-[#eab354]"
                  }`}
                />
                <span>{pin.site.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {(contextLost || webglError) && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#03050a]/95 p-6 text-center">
          <p className="text-sm text-[#d9826c]">
            {webglError
              ? "3D WebGL viewport is currently unavailable in this browser session."
              : "WebGL context was temporarily suspended. Restoring 3D Moon globe..."}
          </p>
          {webglError && (
            <div className="flex flex-wrap justify-center gap-2">
              {sites.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectSiteForTerrain(s.id)}
                  className="rounded-[5px] border border-[#2d3544] bg-[#151922] px-3 py-1.5 text-xs font-medium text-[#edf0f5] hover:border-[#eab354]"
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Minimal Bottom-Right Globe Camera Presets */}
      <div className="pointer-events-auto absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-10 flex items-center gap-1.5 rounded-[6px] border border-[#1f2530] bg-[#0f1218]/[0.90] p-1 text-[11px] shadow-[0_10px_28px_rgba(0,0,0,0.55)]">
        <div
          role="group"
          aria-label="Moon globe camera presets"
          className="flex items-center gap-1"
        >
          {(
            [
              ["south_pole", "South Pole"],
              ["nearside", "Nearside"],
              ["full_orbit", "Orbit"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => handlePreset(id)}
              className={`rounded-[4px] px-2.5 py-1 font-medium whitespace-nowrap transition-colors ${
                preset === id
                  ? "bg-[#edf0f5] text-[#090b10]"
                  : "text-[#9aa3b2] hover:bg-[#151922] hover:text-[#edf0f5]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <span aria-hidden="true" className="h-4 w-px bg-[#1f2530]" />

        <button
          type="button"
          onClick={() => setShowLabels((v) => !v)}
          aria-pressed={showLabels}
          title={showLabels ? "Hide site labels" : "Show site labels"}
          className={`inline-flex items-center gap-1 rounded-[4px] px-2 py-1 font-medium whitespace-nowrap transition-colors ${
            showLabels
              ? "text-[#eab354] hover:bg-[#151922]"
              : "text-[#687283] hover:bg-[#151922] hover:text-[#edf0f5]"
          }`}
        >
          <Compass size={12} />
          <span className="hidden sm:inline">Pins</span>
        </button>
      </div>
    </section>
  );
}
