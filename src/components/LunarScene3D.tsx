import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { ChevronDown, ChevronUp, Compass, Eye } from "lucide-react";
import type { BodyState } from "../lib/events";
import { getNasaTerrainProfile } from "../lib/nasaTerrainProfiles";
import type { LoadedHorizon } from "../lib/types";
import { createLunarLander, type LanderRig } from "./scene3d/lander";
import { createDeepSpaceEnvironment } from "./scene3d/deepSpace";
import {
  createLunarTerrain,
  loadSouthPoleDemPatches,
  type LunarTerrainBuild,
  type SouthPoleDemPatch,
} from "./scene3d/terrain";
import {
  createCompassRingTexture,
  createEarthTexture,
  createGlowSpriteTexture,
  createRegolithTexture,
  createSolarPanelTexture,
} from "./scene3d/textures";

interface LunarScene3DProps {
  siteId: string;
  siteName: string;
  horizon: LoadedHorizon;
  state: BodyState;
  fullScreen?: boolean;
}

type CameraPreset = "overview" | "wide" | "mast" | "top";

const DEG = Math.PI / 180;
const _sunVec = new THREE.Vector3();
const _earthVec = new THREE.Vector3();
const _camTargetPos = new THREE.Vector3();
const _ctrlTargetPos = new THREE.Vector3();

function azElToVector(
  azDeg: number,
  elDeg: number,
  radius: number,
  out: THREE.Vector3
) {
  const az = azDeg * DEG;
  const el = elDeg * DEG;
  const cosEl = Math.cos(el);
  out.set(
    radius * cosEl * Math.sin(az),
    radius * Math.sin(el),
    -radius * cosEl * Math.cos(az)
  );
  return out;
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

export function LunarScene3D({
  siteId,
  siteName,
  horizon,
  state,
  fullScreen = false,
}: LunarScene3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [preset, setPreset] = useState<CameraPreset>("overview");
  const [showRays, setShowRays] = useState(true);
  const [hudCollapsed, setHudCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 640;
  });
  const [contextLost, setContextLost] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);

  const stateRef = useRef<BodyState>(state);
  stateRef.current = state;
  const showRaysRef = useRef<boolean>(showRays);
  showRaysRef.current = showRays;
  const presetTriggerRef = useRef<(p: CameraPreset) => void>(() => {});
  const requestRenderRef = useRef<() => void>(() => {});

  const terrainSwapRef = useRef<
    ((h: LoadedHorizon, id: string) => void) | null
  >(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 520;

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
    const pixelRatio = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    // Faint outer horizon fade blends the 220-unit terrain perimeter cleanly into deep space
    scene.fog = new THREE.FogExp2(0x03050a, 0.0022);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.25, 6000);
    camera.position.set(26, 12.5, 32);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    roomEnv.dispose();
    pmrem.dispose();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.panSpeed = 1.25;
    controls.zoomSpeed = 1.25;
    controls.minDistance = 2.5;
    controls.maxDistance = 320;
    controls.maxPolarAngle = Math.PI * 0.492;
    controls.target.set(0, 1.0, 0);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const regolithMaps = createRegolithTexture(maxAniso);
    const solarTex = createSolarPanelTexture(maxAniso);
    const earthTex = createEarthTexture(maxAniso);
    const compassTex = createCompassRingTexture(maxAniso);
    const sunGlowTex = createGlowSpriteTexture(
      "rgba(255, 228, 168, 0.95)",
      "rgba(234, 179, 84, 0.36)"
    );
    const earthGlowTex = createGlowSpriteTexture(
      "rgba(148, 214, 255, 0.65)",
      "rgba(86, 180, 233, 0.18)"
    );

    let disposed = false;

    // Multi-layer Astronomical Deep-Space Environment (NASA Gaia 4K + 3D Nebula, Dust & Galaxies)
    const deepSpace = createDeepSpaceEnvironment({
      domeRadius: 3200,
      pixelRatio,
      maxAnisotropy: maxAniso,
      rotationEuler: [0.32, 0.62, -0.36],
      onTextureReady: () => requestRenderRef.current(),
    });
    scene.add(deepSpace.group);

    // Compass rose ground overlay (coplanar polygonOffset)
    const compassGeo = new THREE.PlaneGeometry(9.6, 9.6);
    compassGeo.rotateX(-Math.PI / 2);
    const compassMat = new THREE.MeshBasicMaterial({
      map: compassTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const compassRing = new THREE.Mesh(compassGeo, compassMat);
    compassRing.position.y = 0.025;
    scene.add(compassRing);

    // Soft contact shadow directly under lander
    const contactCanvas = document.createElement("canvas");
    contactCanvas.width = 128;
    contactCanvas.height = 128;
    const cctx = contactCanvas.getContext("2d")!;
    const cGrad = cctx.createRadialGradient(64, 64, 6, 64, 64, 60);
    cGrad.addColorStop(0, "rgba(0,0,0,0.68)");
    cGrad.addColorStop(0.6, "rgba(0,0,0,0.28)");
    cGrad.addColorStop(1, "rgba(0,0,0,0)");
    cctx.fillStyle = cGrad;
    cctx.fillRect(0, 0, 128, 128);
    const contactTex = new THREE.CanvasTexture(contactCanvas);
    const contactGeo = new THREE.PlaneGeometry(3.4, 3.4);
    contactGeo.rotateX(-Math.PI / 2);
    const contactMat = new THREE.MeshBasicMaterial({
      map: contactTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const contactShadow = new THREE.Mesh(contactGeo, contactMat);
    contactShadow.position.y = 0.015;
    scene.add(contactShadow);

    // Composite Lunar Lander Rig
    const lander: LanderRig = createLunarLander(solarTex);
    scene.add(lander.group);

    // Lighting Rig: Crisp Airless Solar Key + Subtle Space Fill + Rim
    const hemiLight = new THREE.HemisphereLight(0x9ec0e6, 0x10131b, 0.22);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff4de, 2.85);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 210;
    const d = 68;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);
    scene.add(sunLight.target);

    const rimLight = new THREE.DirectionalLight(0x7fb4e6, 0.36);
    rimLight.position.set(-20, 14, -18);
    scene.add(rimLight);

    // Celestial Sun Disc, Corona Sprite & Ring
    const sunGroup = new THREE.Group();
    const sunSphereGeo = new THREE.SphereGeometry(14, 24, 24);
    const sunSphereMat = new THREE.MeshBasicMaterial({
      color: 0xfbe2a8,
      fog: false,
    });
    const sunSphere = new THREE.Mesh(sunSphereGeo, sunSphereMat);
    sunGroup.add(sunSphere);

    const sunGlowMat = new THREE.SpriteMaterial({
      map: sunGlowTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const sunGlowSprite = new THREE.Sprite(sunGlowMat);
    sunGlowSprite.scale.set(78, 78, 1);
    sunGroup.add(sunGlowSprite);

    const sunRingGeo = new THREE.RingGeometry(18, 20.5, 32);
    const sunRingMat = new THREE.MeshBasicMaterial({
      color: 0xeab354,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
      fog: false,
    });
    const sunRing = new THREE.Mesh(sunRingGeo, sunRingMat);
    sunGroup.add(sunRing);
    scene.add(sunGroup);

    // Celestial Earth Globe, Atmospheric Glow & Ring
    const earthGroup = new THREE.Group();
    const earthSphereGeo = new THREE.SphereGeometry(17, 32, 24);
    const earthSphereMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.62,
      metalness: 0.05,
      emissive: 0x164e63,
      emissiveIntensity: 0.48,
      fog: false,
    });
    const earthSphere = new THREE.Mesh(earthSphereGeo, earthSphereMat);
    earthGroup.add(earthSphere);

    const earthGlowMat = new THREE.SpriteMaterial({
      map: earthGlowTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const earthGlowSprite = new THREE.Sprite(earthGlowMat);
    earthGlowSprite.scale.set(60, 60, 1);
    earthGroup.add(earthGlowSprite);

    const earthRingGeo = new THREE.RingGeometry(21.5, 24, 32);
    const earthRingMat = new THREE.MeshBasicMaterial({
      color: 0x56b4e9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      fog: false,
    });
    const earthRing = new THREE.Mesh(earthRingGeo, earthRingMat);
    earthGroup.add(earthRing);
    scene.add(earthGroup);

    // Sightline Rays from mast (0, 2.16, 0) out to celestial dome
    const sunRayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 2.16, 0),
      new THREE.Vector3(0, 12, -550),
    ]);
    const sunRayMat = new THREE.LineBasicMaterial({
      color: 0xeab354,
      transparent: true,
      opacity: 0.75,
    });
    const sunRay = new THREE.Line(sunRayGeo, sunRayMat);
    scene.add(sunRay);

    const earthRayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 2.16, 0),
      new THREE.Vector3(0, 12, -550),
    ]);
    const earthRayMat = new THREE.LineBasicMaterial({
      color: 0x56b4e9,
      transparent: true,
      opacity: 0.75,
    });
    const earthRay = new THREE.Line(earthRayGeo, earthRayMat);
    scene.add(earthRay);

    // Local NASA LOLA Lunar Terrain Holder (220-unit radius, standalone without Moon globe)
    let currentTerrain: LunarTerrainBuild | null = null;
    let activeHorizon = horizon;
    let activeSiteId = siteId;
    let loadedPatches: Record<string, SouthPoleDemPatch> | null = null;

    const mountTerrain = (h: LoadedHorizon, id: string) => {
      activeHorizon = h;
      activeSiteId = id;
      if (currentTerrain) {
        scene.remove(currentTerrain.terrainMesh);
        scene.remove(currentTerrain.bouldersMesh);
        currentTerrain.dispose();
      }
      currentTerrain = createLunarTerrain(
        h.elev_deg,
        id,
        regolithMaps,
        loadedPatches?.[id]
      );
      scene.add(currentTerrain.terrainMesh);
      scene.add(currentTerrain.bouldersMesh);
    };
    mountTerrain(horizon, siteId);
    terrainSwapRef.current = mountTerrain;

    loadSouthPoleDemPatches().then((patches) => {
      if (disposed || !patches) return;
      loadedPatches = patches;
      if (patches[activeSiteId]) {
        mountTerrain(activeHorizon, activeSiteId);
        requestRenderRef.current();
      }
    });

    // Camera presets
    let transitionActive = false;
    const applyPresetTarget = (p: CameraPreset) => {
      if (p === "overview") {
        _camTargetPos.set(26, 12.5, 32);
        _ctrlTargetPos.set(0, 1.0, 0);
      } else if (p === "wide") {
        _camTargetPos.set(96, 42, 118);
        _ctrlTargetPos.set(0, 0, 0);
      } else if (p === "mast") {
        const st = stateRef.current;
        azElToVector(st.sunAz, Math.max(-5, st.sunEl), 1, _sunVec);
        _camTargetPos.set(-_sunVec.x * 3.8, 2.7, -_sunVec.z * 3.8);
        _ctrlTargetPos.set(_sunVec.x * 18, 2.1, _sunVec.z * 18);
      } else {
        _camTargetPos.set(0.01, 165, 0.01);
        _ctrlTargetPos.set(0, 0, 0);
      }
      transitionActive = true;
      requestRender();
    };
    presetTriggerRef.current = applyPresetTarget;

    const onControlStart = () => {
      transitionActive = false;
    };
    controls.addEventListener("start", onControlStart);

    // Sync scene state from ephemeris & horizon telemetry
    const syncTelemetry = () => {
      const st = stateRef.current;
      const domeRadius = 680;

      azElToVector(st.sunAz, st.sunEl, domeRadius, _sunVec);
      sunGroup.position.copy(_sunVec);
      sunRing.lookAt(camera.position);
      sunSphereMat.color.setHex(st.sunVisible ? 0xfbe2a8 : 0x57482a);
      sunRingMat.opacity = st.sunVisible ? 0.78 : 0.28;
      sunGlowMat.opacity = st.sunVisible ? 0.92 : 0.16;

      sunLight.position.copy(_sunVec).normalize().multiplyScalar(110);
      sunLight.intensity = st.sunVisible
        ? 2.35 + Math.min(0.75, Math.max(0, st.sunMargin) * 0.08)
        : 0.32;

      azElToVector(st.earthAz, st.earthEl, domeRadius, _earthVec);
      earthGroup.position.copy(_earthVec);
      earthRing.lookAt(camera.position);
      earthRingMat.opacity = st.earthVisible ? 0.85 : 0.25;
      earthGlowMat.opacity = st.earthVisible ? 0.75 : 0.2;
      earthSphereMat.emissiveIntensity = st.earthVisible ? 0.55 : 0.14;

      lander.dishPivot.lookAt(_earthVec);
      lander.solarPivot.lookAt(_sunVec);

      const show = showRaysRef.current;
      sunRay.visible = show;
      earthRay.visible = show;
      if (show) {
        const sPos = sunRayGeo.attributes.position as THREE.BufferAttribute;
        sPos.setXYZ(1, _sunVec.x * 0.94, _sunVec.y * 0.94, _sunVec.z * 0.94);
        sPos.needsUpdate = true;
        sunRayMat.opacity = st.sunVisible ? 0.78 : 0.22;

        const ePos = earthRayGeo.attributes.position as THREE.BufferAttribute;
        ePos.setXYZ(
          1,
          _earthVec.x * 0.94,
          _earthVec.y * 0.94,
          _earthVec.z * 0.94
        );
        ePos.needsUpdate = true;
        earthRayMat.opacity = st.earthVisible ? 0.78 : 0.22;
      }
    };

    // Coalesced on-demand renderer + afterDraw pacing for software WebGL
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
            camera.position.distanceTo(_camTargetPos) < 0.05 &&
            controls.target.distanceTo(_ctrlTargetPos) < 0.05
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

        syncTelemetry();
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
      renderer.domElement.removeEventListener(
        "webglcontextlost",
        onContextLost
      );
      renderer.domElement.removeEventListener(
        "webglcontextrestored",
        onContextRestored
      );
      if (currentTerrain) currentTerrain.dispose();
      lander.dispose();
      regolithMaps.map.dispose();
      regolithMaps.normalMap.dispose();
      regolithMaps.roughnessMap.dispose();
      regolithMaps.aoMap.dispose();
      solarTex.dispose();
      earthTex.dispose();
      compassTex.dispose();
      contactTex.dispose();
      deepSpace.dispose();
      sunGlowTex.dispose();
      earthGlowTex.dispose();
      compassGeo.dispose();
      compassMat.dispose();
      contactGeo.dispose();
      contactMat.dispose();
      sunSphereGeo.dispose();
      sunSphereMat.dispose();
      sunGlowMat.dispose();
      sunRingGeo.dispose();
      sunRingMat.dispose();
      earthSphereGeo.dispose();
      earthSphereMat.dispose();
      earthGlowMat.dispose();
      earthRingGeo.dispose();
      earthRingMat.dispose();
      sunRayGeo.dispose();
      sunRayMat.dispose();
      earthRayGeo.dispose();
      earthRayMat.dispose();
      envRT.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      terrainSwapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (terrainSwapRef.current) {
      terrainSwapRef.current(horizon, siteId);
      requestRenderRef.current();
    }
  }, [horizon, siteId]);

  useEffect(() => {
    requestRenderRef.current();
  }, [state, showRays]);

  const handlePreset = (nextPreset: CameraPreset) => {
    setPreset(nextPreset);
    presetTriggerRef.current(nextPreset);
  };

  const terrainProfile = getNasaTerrainProfile(siteId);

  return (
    <section
      aria-label="Interactive 3D lunar terrain and horizon observatory"
      className={
        fullScreen
          ? "relative h-full w-full overflow-hidden bg-[#06080f]"
          : "relative overflow-hidden rounded-[6px] border border-[#1f2530] bg-[#06080f]"
      }
    >
      {/* Top overlay telemetry only in boxed/split mode; fullScreen uses the floating Planner HUD */}
      {!fullScreen && (
        <>
          <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-[5px] border border-[#1f2530] bg-[#0f1218]/94 px-3 py-1.5 text-xs">
            <span className="font-display font-semibold text-[#edf0f5]">
              {siteName}
            </span>
            <span aria-hidden="true" className="text-[#2d3544]">
              ·
            </span>
            <span
              className={`font-mono text-[11px] tabular-nums ${
                state.sunVisible ? "text-[#eab354]" : "text-[#d9826c]"
              }`}
            >
              {state.sunVisible ? "● Sunlit" : "○ Dark"}{" "}
              {state.sunMargin >= 0 ? "+" : ""}
              {state.sunMargin.toFixed(1)}°
            </span>
            <span aria-hidden="true" className="text-[#2d3544]">
              ·
            </span>
            <span
              className={`font-mono text-[11px] tabular-nums ${
                state.earthVisible ? "text-[#56B4E9]" : "text-[#d9826c]"
              }`}
            >
              {state.earthVisible ? "◆ Earth" : "◇ Occulted"}{" "}
              {state.earthMargin >= 0 ? "+" : ""}
              {state.earthMargin.toFixed(1)}°
            </span>
            <span aria-hidden="true" className="hidden md:inline text-[#2d3544]">
              ·
            </span>
            <span className="hidden md:inline font-mono text-[11px] text-[#9aa3b2] tabular-nums">
              LOLA {terrainProfile.elevationM >= 0 ? "+" : ""}
              {terrainProfile.elevationM.toLocaleString("en-US")} m · Pad{" "}
              {terrainProfile.padSlopeDeg[0]}–{terrainProfile.padSlopeDeg[1]}° /
              Flank {terrainProfile.flankSlopeDeg[0]}–
              {terrainProfile.flankSlopeDeg[1]}°
            </span>
          </div>

          <div className="pointer-events-none absolute right-3 top-3 z-10 hidden sm:flex items-center gap-3 rounded-[5px] border border-[#1f2530] bg-[#0f1218]/94 px-3 py-1.5 font-mono text-[11px] text-[#9aa3b2]">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#eab354]" />
              <span>Sun</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rotate-45 bg-[#56B4E9]" />
              <span>Earth</span>
            </span>
          </div>
        </>
      )}

      {/* Dedicated isolated WebGL canvas mount */}
      <div
        ref={mountRef}
        className={
          fullScreen
            ? "h-full w-full cursor-grab active:cursor-grabbing"
            : "h-[380px] w-full cursor-grab active:cursor-grabbing sm:h-[460px] lg:h-[540px]"
        }
        aria-label="Interactive 3D lunar terrain viewport: drag to orbit, scroll to zoom"
      />

      {(contextLost || webglError) && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#06080f]/95 p-6 text-center text-sm text-[#d9826c]">
          {webglError
            ? "3D WebGL viewport is unavailable in this browser session. Switch to 2D Horizon or Timelines above."
            : "WebGL context was temporarily suspended. Restoring 3D lunar surface..."}
        </div>
      )}

      {/* Compact Camera Preset Dock (clears slim TimeScrubber in fullScreen mode) */}
      <div
        className={
          fullScreen
            ? "pointer-events-auto absolute bottom-[62px] lg:bottom-4 right-3 sm:right-4 z-10 flex items-center gap-1 rounded-[6px] border border-[#1f2530] bg-[#0f1218]/[0.90] p-1 text-[11px] shadow-[0_10px_28px_rgba(0,0,0,0.55)]"
            : "pointer-events-none absolute bottom-3 left-1/2 z-10 flex w-[calc(100%-24px)] max-w-[740px] -translate-x-1/2 flex-col items-center"
        }
      >
        {!fullScreen && (
          <div className="pointer-events-auto mb-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHudCollapsed((c) => !c)}
              className="inline-flex items-center gap-1 rounded-[5px] border border-[#1f2530] bg-[#0f1218]/94 px-2.5 py-1 text-[11px] font-medium text-[#9aa3b2] hover:text-[#edf0f5] transition-colors"
            >
              {hudCollapsed ? (
                <>
                  <ChevronUp size={13} />
                  <span>Camera</span>
                </>
              ) : (
                <>
                  <ChevronDown size={13} />
                  <span>Hide Camera</span>
                </>
              )}
            </button>
          </div>
        )}

        {(fullScreen || !hudCollapsed) && (
          <div
            className={
              fullScreen
                ? "flex items-center gap-1"
                : "pointer-events-auto flex w-full flex-wrap items-center justify-between gap-2 rounded-[6px] border border-[#1f2530] bg-[#0f1218]/94 px-3 py-2 text-xs shadow-[0_12px_32px_rgba(0,0,0,0.55)]"
            }
          >
            <div
              role="group"
              aria-label="3D camera presets"
              className="flex items-center gap-1"
            >
              {(
                [
                  ["overview", "Overview"],
                  ["wide", "Wide"],
                  ["mast", "Mast"],
                  ["top", "Top"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handlePreset(id)}
                  className={`rounded-[4px] px-2 py-1 font-medium whitespace-nowrap transition-colors ${
                    preset === id
                      ? "bg-[#edf0f5] text-[#090b10]"
                      : fullScreen
                        ? "text-[#9aa3b2] hover:bg-[#151922] hover:text-[#edf0f5]"
                        : "bg-[#151922] text-[#9aa3b2] hover:text-[#edf0f5]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {fullScreen && (
              <span aria-hidden="true" className="h-4 w-px bg-[#1f2530]" />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRays((v) => !v)}
                aria-pressed={showRays}
                className={`inline-flex items-center gap-1 rounded-[4px] px-2 py-1 font-medium whitespace-nowrap transition-colors ${
                  fullScreen
                    ? showRays
                      ? "text-[#eab354] hover:bg-[#151922]"
                      : "text-[#687283] hover:bg-[#151922] hover:text-[#edf0f5]"
                    : showRays
                      ? "border border-[#eab354]/60 bg-[#151922] text-[#eab354]"
                      : "border border-[#1f2530] bg-[#090b10] text-[#687283] hover:text-[#edf0f5]"
                }`}
              >
                <Eye size={12} />
                <span>Rays</span>
              </button>

              {!fullScreen && (
                <span className="hidden md:inline-flex items-center gap-1 font-mono text-[11px] text-[#687283]">
                  <Compass size={12} />
                  <span>Drag to orbit · Scroll to zoom</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
