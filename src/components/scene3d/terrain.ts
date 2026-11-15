import * as THREE from "three";
import { horizonAt, normaliseAz } from "../../lib/geometry";
import {
  getNasaTerrainProfile,
  type NasaTerrainProfile,
} from "../../lib/nasaTerrainProfiles";
import type { RegolithPBRMaps } from "./textures";

export interface LunarTerrainBuild {
  terrainMesh: THREE.Mesh;
  bouldersMesh: THREE.InstancedMesh;
  groundHeightAt: (x: number, z: number) => number;
  profile: NasaTerrainProfile;
  dispose: () => void;
}

const BASE_PATH = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
const DEG = Math.PI / 180;

export interface SouthPoleDemPatch {
  size: number;
  stepM: number;
  centerM: number;
  data: number[];
}

let cachedPatches: Record<string, SouthPoleDemPatch> | null = null;
let patchesPromise: Promise<Record<string, SouthPoleDemPatch> | null> | null = null;

export function getCachedSouthPolePatches(): Record<string, SouthPoleDemPatch> | null {
  return cachedPatches;
}

export async function loadSouthPoleDemPatches(): Promise<
  Record<string, SouthPoleDemPatch> | null
> {
  if (cachedPatches) return cachedPatches;
  if (patchesPromise) return patchesPromise;
  patchesPromise = fetch(`${BASE_PATH}/textures/sp_site_patches.json`)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data && typeof data === "object") {
        cachedPatches = data as Record<string, SouthPoleDemPatch>;
      }
      return cachedPatches;
    })
    .catch(() => null);
  return patchesPromise;
}

function samplePatchHeightMeters(
  patch: SouthPoleDemPatch,
  xScene: number,
  zScene: number
): number {
  const n = patch.size;
  const half = (n - 1) / 2;
  // Map scene radius 220 units -> +/- 3,840 m (48 steps * 80 m/px)
  const metersPerUnit = (half * patch.stepM) / 220;
  const gx = half + (xScene * metersPerUnit) / patch.stepM;
  const gy = half + (zScene * metersPerUnit) / patch.stepM;

  const x0 = Math.max(0, Math.min(n - 2, Math.floor(gx)));
  const y0 = Math.max(0, Math.min(n - 2, Math.floor(gy)));
  const tx = Math.max(0, Math.min(1, gx - x0));
  const ty = Math.max(0, Math.min(1, gy - y0));

  const h00 = patch.data[y0 * n + x0];
  const h10 = patch.data[y0 * n + x0 + 1];
  const h01 = patch.data[(y0 + 1) * n + x0];
  const h11 = patch.data[(y0 + 1) * n + x0 + 1];

  const hMeters =
    (h00 * (1 - tx) + h10 * tx) * (1 - ty) + (h01 * (1 - tx) + h11 * tx) * ty;
  // Scale real vertical meters gently into observatory scene height units
  return hMeters * 0.011;
}

interface TerrainCrater {
  x: number;
  z: number;
  r: number;
  depth: number;
  rim: number;
}

function buildSiteCraters(
  siteId: string,
  profile: NasaTerrainProfile
): TerrainCrater[] {
  let seed = siteId
    .split("")
    .reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (31 + i * 7), 1337);
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const craters: TerrainCrater[] = [];
  const count = profile.morphology === "mare_plain" ? 48 : 66;
  const depthScale = profile.morphology === "mare_plain" ? 0.58 : 1.05;

  for (let i = 0; i < count; i++) {
    const isBasin = i < 14;
    const isMedium = i >= 14 && i < 36;
    const dist = isBasin
      ? 36 + rand() * 135
      : isMedium
        ? 12 + rand() * 58
        : 5 + rand() * 28;
    const angle = rand() * Math.PI * 2;
    const radius = isBasin
      ? 9 + rand() * 19
      : isMedium
        ? 3.0 + rand() * 5.5
        : 1.1 + rand() * 2.1;
    if (dist - radius < 4.0) continue;
    craters.push({
      x: Math.cos(angle) * dist,
      z: Math.sin(angle) * dist,
      r: radius,
      depth:
        (isBasin
          ? 1.6 + rand() * 2.1
          : isMedium
            ? 0.55 + rand() * 0.75
            : 0.22 + rand() * 0.34) * depthScale,
      rim:
        (isBasin
          ? 0.65 + rand() * 0.75
          : isMedium
            ? 0.22 + rand() * 0.28
            : 0.08 + rand() * 0.14) * depthScale,
    });
  }
  return craters;
}

/**
 * Sculpt site-specific NASA LRO LOLA / PGDA / SLDEM2015 landform slope & relief
 * over the mid-field (r = 3.5..160), fading cleanly to the exact 360-degree horizon
 * silhouette at r -> 220 so astronomical occultation geometry remains faithful.
 */
function morphologyOffset(
  r: number,
  azDeg: number,
  profile: NasaTerrainProfile
): number {
  const azDiffRad = (azDeg - profile.primaryAzimuthDeg) * DEG;
  const flankSlopeRad =
    ((profile.flankSlopeDeg[0] + profile.flankSlopeDeg[1]) * 0.5) * DEG;
  const padSlopeRad =
    ((profile.padSlopeDeg[0] + profile.padSlopeDeg[1]) * 0.5) * DEG;

  // Envelope: 0 on flat landing pad (r < 3.4), full across mid-field, fades gently toward outer rim
  const startBlend = THREE.MathUtils.smoothstep(r, 3.4, 14.0);
  const rimFade = 1 - THREE.MathUtils.smoothstep(r, 130, 212);
  const envelope = startBlend * rimFade;
  if (envelope <= 0.0001) return 0;

  if (profile.morphology === "crater_rim") {
    // Shackleton Rim: ~30° steep inner crater drop toward primaryAzimuthDeg, ~10° outer ejecta flank
    const inward = Math.cos(azDiffRad); // +1 facing crater interior, -1 outer flank
    const bowlBlend = THREE.MathUtils.smoothstep(inward, -0.15, 0.75);
    const bowlDist = Math.max(0, r - 6.0);
    // Crater wall plunges deeply up to r ~ 75, then curves across the distant crater floor
    const innerDrop =
      -Math.min(28, bowlDist * Math.tan(flankSlopeRad) * 0.85) *
      Math.sin(Math.min(1, bowlDist / 95) * Math.PI * 0.82);
    const outerSlope = -Math.min(9, bowlDist * Math.tan(padSlopeRad * 1.4));
    return envelope * THREE.MathUtils.lerp(outerSlope, innerDrop, bowlBlend);
  }

  if (profile.morphology === "connecting_ridge") {
    // Narrow saddle ridge crest along spine perpendicular to primaryAzimuthDeg,
    // flanked by steep 20°-28° drops into Shackleton & de Gerlache PSRs
    const perpFlank = Math.abs(Math.cos(azDiffRad));
    const dropFactor = THREE.MathUtils.smoothstep(perpFlank, 0.25, 0.85);
    const d = Math.max(0, r - 5.5);
    const flankDrop = -Math.min(24, d * Math.tan(flankSlopeRad) * 0.72);
    const spineUndulation = Math.sin(r * 0.05) * 1.2 * (1 - dropFactor);
    return envelope * (dropFactor * flankDrop + spineUndulation);
  }

  if (profile.morphology === "massif_summit") {
    // Malapert Massif: flat ~4-8° summit plateau out to r=16, then 18-25° escarpment drops
    const plateauTilt =
      Math.cos(azDiffRad) * Math.min(1.6, Math.max(0, r - 3.5) * Math.tan(padSlopeRad));
    const escarpmentR = Math.max(0, r - 15.0);
    const sectorDrop = 0.55 + 0.45 * Math.max(0, Math.cos(azDiffRad));
    const drop = -Math.min(25, escarpmentR * Math.tan(flankSlopeRad) * 0.68 * sectorDrop);
    return envelope * (plateauTilt + drop);
  }

  if (profile.morphology === "highland_plateau") {
    // Nobile Rim: 5-10° highland benches dropping gently toward crater basin
    const basinSide = THREE.MathUtils.smoothstep(Math.cos(azDiffRad), -0.2, 0.8);
    const bench =
      -Math.min(13, Math.max(0, r - 7) * Math.tan(flankSlopeRad * 0.65)) *
      basinSide;
    return envelope * bench;
  }

  if (profile.morphology === "massif_valley") {
    // Apollo 17 Taurus-Littrow: flat E-W valley corridor, towering 25-30° North (0°) & South (180°) Massifs
    const nsWall = Math.abs(Math.cos(azDiffRad)); // 1 at N/S massifs, 0 along E-W valley floor
    const wallBlend = THREE.MathUtils.smoothstep(nsWall, 0.35, 0.85);
    const footDist = Math.max(0, r - 14.0);
    const talus = footDist * Math.tan(flankSlopeRad) * 0.62;
    return envelope * wallBlend * Math.min(34, talus);
  }

  // mare_plain (Apollo 11): nearly flat <2.5° mare basalt plain
  return envelope * Math.sin(r * 0.06 + azDiffRad) * 0.25;
}

/**
 * Compute deterministic height field combining:
 * 1. True NASA LOLA/PGDA local landform slope & morphology (steep crater walls, saddles, massifs, mare plains)
 * 2. Exact 360-degree horizon elevation profile (`horizonAt(elevDeg, azDeg)`) at the outer rim
 * 3. Multi-scale lunar impact craters & regolith micro-relief
 */
export function buildTerrainHeightSampler(
  elevDeg: number[],
  siteId: string,
  spPatch?: SouthPoleDemPatch | null
): (x: number, z: number) => number {
  const profile = getNasaTerrainProfile(siteId);
  const seedOffset = siteId
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0) * 17, 0);
  const craters = buildSiteCraters(siteId, profile);
  const noiseScale = profile.morphology === "mare_plain" ? 0.35 : 1.0;

  return (x: number, z: number): number => {
    const r = Math.hypot(x, z);
    if (r < 0.001) return 0;

    // Azimuth clockwise from North (-Z): atan2(x, -z)
    const azDeg = normaliseAz((Math.atan2(x, -z) * 180) / Math.PI);
    const targetEl = Math.max(-25, Math.min(35, horizonAt(elevDeg, azDeg)));

    // Horizon-line elevation blend so 3D outer ridges match 2D sky occultation angles
    const horizonBlend = THREE.MathUtils.smoothstep(r, 8.0, 48.0);
    const rimHeight = r * Math.tan(targetEl * DEG);

    // NASA LOLA site slope & landform shaping (blended with authentic 80m/px PDS patch when loaded)
    const analyticMorph = morphologyOffset(r, azDeg, profile);
    let morph = analyticMorph;
    if (spPatch) {
      const padBlend = THREE.MathUtils.smoothstep(r, 3.6, 15.0);
      const outerFade = 1 - THREE.MathUtils.smoothstep(r, 150, 212);
      const realLolaRelief = samplePatchHeightMeters(spPatch, x, z);
      morph = THREE.MathUtils.lerp(
        analyticMorph,
        padBlend * outerFade * realLolaRelief,
        0.78
      );
    }

    // Subtle multi-octave lunar ridge undulations + sinuous rille trough
    const ridgeNoise =
      noiseScale *
      (0.32 * Math.sin(x * 0.11 + seedOffset) * Math.cos(z * 0.1) +
        0.16 * Math.sin((x + z) * 0.29) +
        0.08 * Math.cos((x - z) * 0.65));

    const rilleBend = 14 * Math.sin(z * 0.045 + seedOffset * 0.1) + 28;
    const rilleDist = Math.abs(x - rilleBend) / 3.4;
    const rilleMask =
      THREE.MathUtils.smoothstep(r, 24, 48) * (1 - THREE.MathUtils.smoothstep(r, 128, 175));
    const rilleCarve =
      rilleDist < 2.2
        ? -Math.exp(-rilleDist * rilleDist * 1.6) * 1.35 * rilleMask
        : 0;

    const localBlend =
      THREE.MathUtils.smoothstep(r, 3.5, 10.0) *
      (1 - THREE.MathUtils.smoothstep(r, 155, 215));

    let craterOffset = 0;
    for (let i = 0; i < craters.length; i++) {
      const c = craters[i];
      const dx = x - c.x;
      const dz = z - c.z;
      const d2 = dx * dx + dz * dz;
      const maxR = c.r * 1.55;
      if (d2 > maxR * maxR) continue;
      const nr = Math.sqrt(d2) / c.r;
      if (nr < 1.0) {
        craterOffset -= (1 - nr * nr) * c.depth;
      }
      const rimDist = (nr - 1.03) / 0.24;
      craterOffset += Math.exp(-rimDist * rimDist) * c.rim;
    }

    const rawY =
      horizonBlend * rimHeight +
      morph +
      localBlend * (ridgeNoise + craterOffset + rilleCarve);
    return THREE.MathUtils.clamp(rawY, -34, 72);
  };
}

/**
 * Create an angular fractured lunar rock geometry instead of a round ball.
 */
function createAngularRockGeometry(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(0.36, 0);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const jitter =
      0.78 + 0.35 * Math.abs(Math.sin(vx * 7.1 + vy * 11.3 + vz * 5.7));
    pos.setXYZ(i, vx * jitter, vy * jitter * 0.72, vz * jitter);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Build an expansive circular lunar terrain mesh (radius = 220 units) shaped by
 * NASA LRO LOLA elevation & slope profiles, plus angular regolith boulders.
 */
export function createLunarTerrain(
  elevDeg: number[],
  siteId: string,
  regolithMaps: RegolithPBRMaps,
  spPatch?: SouthPoleDemPatch | null
): LunarTerrainBuild {
  const profile = getNasaTerrainProfile(siteId);
  const radialSegs = 82;
  const angularSegs = 228;
  const maxRadius = 220;

  const groundHeightAt = buildTerrainHeightSampler(
    elevDeg,
    siteId,
    spPatch ?? getCachedSouthPolePatches()?.[siteId]
  );

  const geo = new THREE.BufferGeometry();
  const vertCount = (radialSegs + 1) * (angularSegs + 1);
  const positions = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const colors = new Float32Array(vertCount * 3);
  const indices: number[] = [];

  const baseTint = new THREE.Color(profile.regolithTintHex);
  const vColor = new THREE.Color();

  for (let ir = 0; ir <= radialSegs; ir++) {
    const t = ir / radialSegs;
    const r = maxRadius * Math.pow(t, 1.55);

    for (let ia = 0; ia <= angularSegs; ia++) {
      const azRad = (ia / angularSegs) * Math.PI * 2;
      const x = r * Math.sin(azRad);
      const z = -r * Math.cos(azRad);
      const y = groundHeightAt(x, z);

      const idx = ir * (angularSegs + 1) + ia;
      positions[idx * 3] = x;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = z;

      uvs[idx * 2] = x / 34;
      uvs[idx * 2 + 1] = z / 34;

      // Subtle geological mineral albedo contrast in the same lunar regolith palette:
      // Taurus-Littrow bright anorthosite massifs over dark mare floor, or shadowed polar crater bowls
      let shade = 1.0;
      if (profile.morphology === "massif_valley" && y > 4) {
        shade = 1.0 + Math.min(0.28, (y - 4) * 0.015);
      } else if (y < -4) {
        shade = Math.max(0.76, 1.0 + y * 0.01);
      }
      vColor.copy(baseTint).multiplyScalar(shade);
      colors[idx * 3] = vColor.r;
      colors[idx * 3 + 1] = vColor.g;
      colors[idx * 3 + 2] = vColor.b;
    }
  }

  for (let ir = 0; ir < radialSegs; ir++) {
    for (let ia = 0; ia < angularSegs; ia++) {
      const a = ir * (angularSegs + 1) + ia;
      const b = a + angularSegs + 1;
      const c = a + 1;
      const d = b + 1;
      indices.push(a, c, b);
      indices.push(c, d, b);
    }
  }

  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute("uv2", new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    map: regolithMaps.map,
    normalMap: regolithMaps.normalMap,
    normalScale: new THREE.Vector2(2.2, 2.2),
    roughnessMap: regolithMaps.roughnessMap,
    aoMap: regolithMaps.aoMap,
    aoMapIntensity: 0.92,
    envMapIntensity: 0.08,
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.02,
  });

  // Dual-scale non-tiling lunar regolith shader: blends sharp foreground grit with rotated orbital macro features
  terrainMat.customProgramCacheKey = () => "lunar_terrain_dual_uv_v1";
  terrainMat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#ifdef USE_MAP
        vec2 macroUv = vec2(
          vMapUv.x * 0.145 - vMapUv.y * 0.105,
          vMapUv.x * 0.105 + vMapUv.y * 0.145
        );
        vec4 nearSample = texture2D( map, vMapUv * 1.35 );
        vec4 macroSample = texture2D( map, macroUv );
        vec4 blended = mix( nearSample, macroSample, 0.42 );
        float regLuma = dot(blended.rgb, vec3(0.299, 0.587, 0.114));
        float contrast = smoothstep(0.14, 0.86, regLuma);
        float targetLuma = mix(regLuma, contrast * 1.08, 0.55);
        float cScale = regLuma > 0.001 ? targetLuma / regLuma : 1.0;
        blended.rgb = clamp(blended.rgb * cScale, 0.0, 1.0);
        diffuseColor *= blended;
      #endif`
    );
  };

  const terrainMesh = new THREE.Mesh(geo, terrainMat);
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = true;

  // Angular fractured regolith boulders + foreground cobbles (like Apollo surface imagery)
  const rockGeo = createAngularRockGeometry();
  const rockMat = new THREE.MeshStandardMaterial({
    map: regolithMaps.map,
    color: profile.regolithTintHex,
    roughness: 0.94,
    metalness: 0.02,
    envMapIntensity: 0.08,
    flatShading: true,
  });
  const boulderCount = Math.max(72, Math.round(235 * profile.boulderDensity));
  const bouldersMesh = new THREE.InstancedMesh(rockGeo, rockMat, boulderCount);
  bouldersMesh.castShadow = true;
  bouldersMesh.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  for (let i = 0; i < boulderCount; i++) {
    const angle = i * 2.39996 + siteId.length * 0.41;
    const isForegroundCobble = i % 3 !== 0;
    const frac = (i * 0.6180339) % 1;
    const dist = isForegroundCobble
      ? 2.8 + Math.pow(frac, 1.15) * 34
      : 10 + Math.pow(frac, 1.25) * 86;
    const rx = Math.cos(angle) * dist;
    const rz = Math.sin(angle) * dist;
    const ry = groundHeightAt(rx, rz);

    const baseScale = isForegroundCobble
      ? 0.22 + ((i * 0.29) % 0.58)
      : 0.58 + ((i * 0.41) % 1.65);
    dummy.position.set(rx, ry + baseScale * 0.1, rz);
    dummy.rotation.set((i * 1.1) % 3, (i * 2.3) % 6, (i * 0.7) % 3);
    dummy.scale.set(
      baseScale * (0.85 + (i % 3) * 0.18),
      baseScale * (0.58 + (i % 2) * 0.16),
      baseScale * (0.9 + ((i + 1) % 3) * 0.15)
    );
    dummy.updateMatrix();
    bouldersMesh.setMatrixAt(i, dummy.matrix);

    const shade = 0.78 + ((i * 0.17) % 0.36);
    color.setRGB(shade, shade, shade * 1.01);
    bouldersMesh.setColorAt(i, color);
  }
  bouldersMesh.instanceMatrix.needsUpdate = true;
  if (bouldersMesh.instanceColor) {
    bouldersMesh.instanceColor.needsUpdate = true;
  }
  bouldersMesh.computeBoundingSphere();

  return {
    terrainMesh,
    bouldersMesh,
    groundHeightAt,
    profile,
    dispose: () => {
      geo.dispose();
      terrainMat.dispose();
      rockGeo.dispose();
      rockMat.dispose();
    },
  };
}
