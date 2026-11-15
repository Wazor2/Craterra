import * as THREE from "three";

/**
 * Deterministic PRNG for procedural lunar textures.
 */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Tileable 2D value noise (periodic over integer grid period `p`).
 */
function periodicNoise2D(
  x: number,
  y: number,
  period: number,
  seed: number
): number {
  const xi0 = ((Math.floor(x) % period) + period) % period;
  const yi0 = ((Math.floor(y) % period) + period) % period;
  const xi1 = (xi0 + 1) % period;
  const yi1 = (yi0 + 1) % period;

  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);

  const hash = (ix: number, iy: number) => {
    let h = Math.imul(ix + 374761393, 668265263) ^ Math.imul(iy + seed, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };

  const a = hash(xi0, yi0);
  const b = hash(xi1, yi0);
  const c = hash(xi0, yi1);
  const d = hash(xi1, yi1);

  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

function fbmTileable(u: number, v: number, octaves: number, seed: number): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let freq = 4;
  for (let o = 0; o < octaves; o++) {
    sum += amp * periodicNoise2D(u * freq, v * freq, freq, seed + o * 97);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

export interface RegolithPBRMaps {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  aoMap: THREE.CanvasTexture;
}

let cachedRegolithCanvases: {
  color: HTMLCanvasElement;
  normal: HTMLCanvasElement;
  rough: HTMLCanvasElement;
  ao: HTMLCanvasElement;
} | null = null;

function buildRegolithCanvases() {
  if (cachedRegolithCanvases) return cachedRegolithCanvases;

  const size = 768;
  const rand = mulberry32(20260720);

  const height = new Float32Array(size * size);
  const mareField = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const macro = fbmTileable(u, v, 4, 101);
      const micro = fbmTileable(u, v, 3, 509);
      const fine = fbmTileable(u * 2.0, v * 2.0, 2, 733);
      height[y * size + x] =
        0.5 + (macro - 0.5) * 0.28 + (micro - 0.5) * 0.16 + (fine - 0.5) * 0.08;
      mareField[y * size + x] = fbmTileable(u + 0.17, v + 0.43, 3, 911);
    }
  }

  interface Crater {
    cx: number;
    cy: number;
    r: number;
    depth: number;
    rim: number;
    brightEjecta: boolean;
  }
  const craters: Crater[] = [];
  for (let i = 0; i < 420; i++) {
    const isLarge = i < 20;
    const isMed = i >= 20 && i < 105;
    const r = isLarge
      ? 28 + rand() * 34
      : isMed
        ? 10 + rand() * 17
        : 2.5 + rand() * 6.5;
    craters.push({
      cx: rand() * size,
      cy: rand() * size,
      r,
      depth: isLarge ? 0.31 : isMed ? 0.22 : 0.14,
      rim: isLarge ? 0.135 : isMed ? 0.095 : 0.055,
      brightEjecta: isLarge && rand() > 0.3,
    });
  }

  const ejectaBoost = new Float32Array(size * size);

  for (const c of craters) {
    const reach = Math.ceil(c.r * (c.brightEjecta ? 2.3 : 1.48));
    for (let dy = -reach; dy <= reach; dy++) {
      const py = (((Math.round(c.cy) + dy) % size) + size) % size;
      for (let dx = -reach; dx <= reach; dx++) {
        const px = (((Math.round(c.cx) + dx) % size) + size) % size;
        const dist = Math.hypot(dx, dy);
        const nr = dist / c.r;
        const idx = py * size + px;

        if (nr < 1.0) {
          const bowl = (1 - nr * nr) * c.depth;
          height[idx] -= bowl;
        }
        const rimDist = (nr - 1.02) / 0.21;
        const rimProfile = Math.exp(-rimDist * rimDist) * c.rim;
        height[idx] += rimProfile;

        if (c.brightEjecta && nr >= 0.85 && nr < 2.25) {
          const ang = Math.atan2(dy, dx);
          const ray = 0.5 + 0.5 * Math.sin(ang * 8 + c.cx) * Math.cos(ang * 13 - c.cy);
          const falloff = Math.max(0, 1 - (nr - 0.85) / 1.4);
          ejectaBoost[idx] = Math.min(
            0.48,
            ejectaBoost[idx] + falloff * (0.1 + 0.2 * ray)
          );
        }
      }
    }
  }

  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = size;
  colorCanvas.height = size;
  const colorCtx = colorCanvas.getContext("2d")!;
  const colorImg = colorCtx.createImageData(size, size);

  const normalCanvas = document.createElement("canvas");
  normalCanvas.width = size;
  normalCanvas.height = size;
  const normalCtx = normalCanvas.getContext("2d")!;
  const normalImg = normalCtx.createImageData(size, size);

  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = size;
  roughCanvas.height = size;
  const roughCtx = roughCanvas.getContext("2d")!;
  const roughImg = roughCtx.createImageData(size, size);

  const aoCanvas = document.createElement("canvas");
  aoCanvas.width = size;
  aoCanvas.height = size;
  const aoCtx = aoCanvas.getContext("2d")!;
  const aoImg = aoCtx.createImageData(size, size);

  const normalStrength = 8.2;

  for (let y = 0; y < size; y++) {
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const idx = y * size + x;
      const p4 = idx * 4;

      const h = height[idx];
      const hL = height[y * size + xm];
      const hR = height[y * size + xp];
      const hU = height[ym * size + x];
      const hD = height[yp * size + x];

      let nx = (hL - hR) * normalStrength;
      let ny = (hU - hD) * normalStrength;
      let nz = 1.0;
      const invLen = 1 / Math.hypot(nx, ny, nz);
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;

      normalImg.data[p4] = Math.round((nx * 0.5 + 0.5) * 255);
      normalImg.data[p4 + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      normalImg.data[p4 + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      normalImg.data[p4 + 3] = 255;

      const mareMix = THREE.MathUtils.smoothstep(mareField[idx], 0.35, 0.68);
      const baseGray = 192 - mareMix * 54;
      const speckleRand = rand();
      const clast = speckleRand > 0.992 ? 42 : speckleRand < 0.01 ? -46 : 0;
      const grain = (rand() - 0.5) * 26;
      const reliefTint = (h - 0.5) * 92;
      const ejecta = ejectaBoost[idx] * 112;
      const lum = THREE.MathUtils.clamp(
        baseGray + grain + clast + reliefTint + ejecta,
        46,
        248
      );
      colorImg.data[p4] = Math.round(lum * 0.99);
      colorImg.data[p4 + 1] = Math.round(lum * 0.995);
      colorImg.data[p4 + 2] = Math.round(Math.min(255, lum * 1.015));
      colorImg.data[p4 + 3] = 255;

      const slope = Math.hypot(hR - hL, hD - hU);
      const rVal = THREE.MathUtils.clamp(
        238 - slope * 140 + (rand() - 0.5) * 20,
        165,
        252
      );
      roughImg.data[p4] = rVal;
      roughImg.data[p4 + 1] = rVal;
      roughImg.data[p4 + 2] = rVal;
      roughImg.data[p4 + 3] = 255;

      const aoVal = THREE.MathUtils.clamp(
        Math.round(212 + (h - 0.5) * 210),
        84,
        255
      );
      aoImg.data[p4] = aoVal;
      aoImg.data[p4 + 1] = aoVal;
      aoImg.data[p4 + 2] = aoVal;
      aoImg.data[p4 + 3] = 255;
    }
  }

  colorCtx.putImageData(colorImg, 0, 0);
  normalCtx.putImageData(normalImg, 0, 0);
  roughCtx.putImageData(roughImg, 0, 0);
  aoCtx.putImageData(aoImg, 0, 0);

  cachedRegolithCanvases = {
    color: colorCanvas,
    normal: normalCanvas,
    rough: roughCanvas,
    ao: aoCanvas,
  };
  return cachedRegolithCanvases;
}

/**
 * High-resolution lunar regolith PBR texture set (cached source canvases).
 */
export function createRegolithTexture(maxAnisotropy: number): RegolithPBRMaps {
  const canvases = buildRegolithCanvases();

  const configureTex = (
    canvas: HTMLCanvasElement,
    isColor: boolean
  ): THREE.CanvasTexture => {
    const tex = new THREE.CanvasTexture(canvas);
    if (isColor) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = maxAnisotropy;
    return tex;
  };

  return {
    map: configureTex(canvases.color, true),
    normalMap: configureTex(canvases.normal, false),
    roughnessMap: configureTex(canvases.rough, false),
    aoMap: configureTex(canvases.ao, false),
  };
}

/**
 * Procedural solar photovoltaic cell grid texture for lander solar arrays.
 */
export function createSolarPanelTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const w = 256;
  const h = 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#10203a";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "#3b587a";
  ctx.lineWidth = 2;
  for (let x = 0; x <= w; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(148, 197, 238, 0.35)";
  ctx.lineWidth = 1;
  for (let x = 8; x < w; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * High-detail procedural Earth marble texture (continents, deserts, polar caps, clouds).
 */
export function createEarthTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  const ocean = ctx.createLinearGradient(0, 0, 0, h);
  ocean.addColorStop(0, "#e6f0ff");
  ocean.addColorStop(0.11, "#18598a");
  ocean.addColorStop(0.5, "#156ca8");
  ocean.addColorStop(0.89, "#18598a");
  ocean.addColorStop(1, "#e6f0ff");
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, w, h);

  const img = ctx.getImageData(0, 0, w, h);
  for (let y = 0; y < h; y++) {
    const v = y / h;
    const latFactor = Math.abs(v - 0.5) * 2;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const p4 = (y * w + x) * 4;
      const cont = fbmTileable(u, v, 4, 314);
      const moisture = fbmTileable(u + 0.3, v + 0.1, 3, 777);
      const clouds = fbmTileable(u * 1.5, v * 1.5, 4, 888);

      let r = img.data[p4];
      let g = img.data[p4 + 1];
      let b = img.data[p4 + 2];

      if (latFactor > 0.84 - cont * 0.08) {
        // Polar ice cap
        r = 228;
        g = 238;
        b = 250;
      } else if (cont > 0.51) {
        // Landmass: lush green vs arid ochre
        const arid = THREE.MathUtils.smoothstep(moisture, 0.35, 0.65);
        r = Math.round(58 + arid * 95);
        g = Math.round(115 + arid * 25);
        b = Math.round(68 + arid * 22);
      }

      // Cyclonic cloud bands
      const bandBoost = Math.sin(v * Math.PI * 5 + cont * 2) * 0.06;
      const cloudAlpha = THREE.MathUtils.smoothstep(clouds + bandBoost, 0.53, 0.78) * 0.72;
      r = Math.round(r * (1 - cloudAlpha) + 245 * cloudAlpha);
      g = Math.round(g * (1 - cloudAlpha) + 248 * cloudAlpha);
      b = Math.round(b * (1 - cloudAlpha) + 255 * cloudAlpha);

      img.data[p4] = r;
      img.data[p4 + 1] = g;
      img.data[p4 + 2] = b;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Equirectangular Milky Way & Deep-Space Galaxy sky dome texture.
 */
export function createGalaxySkyTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#06080f";
  ctx.fillRect(0, 0, w, h);

  const img = ctx.getImageData(0, 0, w, h);
  const rand = mulberry32(424242);

  for (let y = 0; y < h; y++) {
    const v = y / h;
    // Galactic plane curves smoothly across the sky hemisphere
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const planeCenter = 0.42 + 0.14 * Math.sin(u * Math.PI * 2 + 0.8);
      const distFromPlane = Math.abs(v - planeCenter);
      const band = Math.exp(-Math.pow(distFromPlane / 0.095, 2));

      if (band > 0.01) {
        const cloud = fbmTileable(u * 2.0, v * 2.0, 4, 1337);
        const dustLane = fbmTileable(u * 3.0 + 0.4, v * 3.0, 3, 2029);
        const coreProximity = Math.exp(-Math.pow((u - 0.58) / 0.18, 2));

        // Dark dust rift cuts subtly through bright galactic core
        const rift = 1 - THREE.MathUtils.smoothstep(dustLane, 0.44, 0.64) * 0.55;
        const glow = band * THREE.MathUtils.smoothstep(cloud, 0.34, 0.82) * rift;

        const warm = coreProximity * 0.85;
        const r = 6 + glow * (38 + warm * 46);
        const g = 8 + glow * (44 + warm * 28);
        const b = 15 + glow * (68 + (1 - warm) * 26);

        const p4 = (y * w + x) * 4;
        img.data[p4] = Math.min(255, Math.round(r));
        img.data[p4 + 1] = Math.min(255, Math.round(g));
        img.data[p4 + 2] = Math.min(255, Math.round(b));
        img.data[p4 + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);

  // Subtle unresolved pinpoint Milky Way starlight speckle along the band
  for (let i = 0; i < 2400; i++) {
    const u = rand();
    const planeCenter = 0.42 + 0.14 * Math.sin(u * Math.PI * 2 + 0.8);
    const spread = (rand() + rand() - 1) * 0.13;
    const x = u * w;
    const y = THREE.MathUtils.clamp(planeCenter + spread, 0.01, 0.99) * h;
    const alpha = 0.12 + rand() * 0.38;
    const tint = rand();
    ctx.fillStyle =
      tint > 0.72
        ? `rgba(255, 224, 178, ${alpha})`
        : tint < 0.3
          ? `rgba(186, 222, 255, ${alpha})`
          : `rgba(237, 240, 245, ${alpha})`;
    const sz = rand() > 0.92 ? 1.5 : 0.9;
    ctx.fillRect(x, y, sz, sz);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Soft radial star point sprite so WebGL Points render as crisp glowing stars.
 */
export function createStarSpriteTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  grad.addColorStop(0, "rgba(255, 255, 255, 1)");
  grad.addColorStop(0.22, "rgba(255, 255, 255, 0.85)");
  grad.addColorStop(0.55, "rgba(210, 225, 255, 0.2)");
  grad.addColorStop(1, "rgba(210, 225, 255, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Soft warm solar corona glow sprite for the celestial Sun.
 */
export function createGlowSpriteTexture(
  innerRgba: string,
  midRgba: string
): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, innerRgba);
  grad.addColorStop(0.35, midRgba);
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Procedural compass rose ring texture placed on the lunar landing pad.
 */
export function createCompassRingTexture(
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;

  ctx.clearRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(237, 240, 245, 0.36)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(c, c, size * 0.46, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(237, 240, 245, 0.18)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(c, c, size * 0.34, 0, Math.PI * 2);
  ctx.stroke();

  for (let deg = 0; deg < 360; deg += 15) {
    const rad = ((deg - 90) * Math.PI) / 180;
    const major = deg % 90 === 0;
    const rOuter = size * 0.46;
    const rInner = size * (major ? 0.415 : 0.438);
    ctx.strokeStyle = major
      ? "rgba(234, 179, 84, 0.85)"
      : "rgba(154, 163, 178, 0.45)";
    ctx.lineWidth = major ? 3.5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(rad) * rInner, c + Math.sin(rad) * rInner);
    ctx.lineTo(c + Math.cos(rad) * rOuter, c + Math.sin(rad) * rOuter);
    ctx.stroke();
  }

  const cardinals: Array<[number, string, string]> = [
    [0, "N 0°", "#eab354"],
    [90, "E 90°", "#edf0f5"],
    [180, "S 180°", "#eab354"],
    [270, "W 270°", "#edf0f5"],
  ];
  ctx.font = '600 32px "IBM Plex Mono", monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const [deg, label, color] of cardinals) {
    const rad = ((deg - 90) * Math.PI) / 180;
    const rText = size * 0.375;
    ctx.fillStyle = color;
    ctx.fillText(label, c + Math.cos(rad) * rText, c + Math.sin(rad) * rText);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}
