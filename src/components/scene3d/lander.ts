import * as THREE from "three";

export interface LanderRig {
  group: THREE.Group;
  solarPivot: THREE.Group;
  dishPivot: THREE.Group;
  dispose: () => void;
}

/**
 * Composite 8-part procedural lunar lander grounded at bottom-center (y = 0).
 * Includes octagonal Kapton foil descent stage, 4 landing struts & footpads,
 * ascent equipment bay, 2m telemetry mast, articulated Sun-tracking solar array,
 * and Earth-tracking parabolic high-gain antenna.
 */
export function createLunarLander(
  solarTexture: THREE.Texture
): LanderRig {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  // Materials with >0.25 roughness/metalness contrast across adjacent parts
  const kaptonGold = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc9963b,
      metalness: 0.85,
      roughness: 0.28,
    })
  );
  const titaniumMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb8bec8,
      metalness: 0.88,
      roughness: 0.22,
    })
  );
  const darkCarbonMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x262930,
      metalness: 0.35,
      roughness: 0.68,
    })
  );
  const ceramicMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe2e4e9,
      metalness: 0.1,
      roughness: 0.52,
    })
  );
  const solarMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: solarTexture,
      metalness: 0.45,
      roughness: 0.2,
    })
  );

  // 1. Landing Struts + Footpads (4 corners, grounded flush at y = 0)
  const padGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.28, 0.06, 16));
  const strutGeo = trackGeo(new THREE.CylinderGeometry(0.035, 0.045, 1.05, 10));
  const braceGeo = trackGeo(new THREE.CylinderGeometry(0.025, 0.025, 0.88, 8));

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const padX = Math.cos(angle) * 1.18;
    const padZ = Math.sin(angle) * 1.18;

    const pad = new THREE.Mesh(padGeo, titaniumMat);
    pad.position.set(padX, 0.03, padZ);
    pad.castShadow = true;
    pad.receiveShadow = true;
    group.add(pad);

    // Primary strut angled from pad up to descent stage corner
    const strut = new THREE.Mesh(strutGeo, titaniumMat);
    strut.position.set(padX * 0.78, 0.48, padZ * 0.78);
    strut.lookAt(padX * 0.45, 0.85, padZ * 0.45);
    strut.rotateX(Math.PI / 2);
    strut.castShadow = true;
    group.add(strut);

    // Secondary cross brace
    const brace = new THREE.Mesh(braceGeo, darkCarbonMat);
    brace.position.set(padX * 0.7, 0.36, padZ * 0.7);
    brace.lookAt(0, 0.62, 0);
    brace.rotateX(Math.PI / 2);
    brace.castShadow = true;
    group.add(brace);
  }

  // 2. Descent Engine Nozzle (underneath center, above ground clearance)
  const nozzlePoints = [
    new THREE.Vector2(0.08, 0.42),
    new THREE.Vector2(0.16, 0.28),
    new THREE.Vector2(0.24, 0.14),
  ];
  const nozzleGeo = trackGeo(new THREE.LatheGeometry(nozzlePoints, 20));
  const nozzle = new THREE.Mesh(nozzleGeo, darkCarbonMat);
  nozzle.castShadow = true;
  group.add(nozzle);

  // 3. Octagonal Thermal-Foil Descent Stage Body (primary silhouette)
  const descentGeo = trackGeo(new THREE.CylinderGeometry(0.76, 0.78, 0.56, 8));
  const descentBody = new THREE.Mesh(descentGeo, kaptonGold);
  descentBody.position.y = 0.72;
  descentBody.castShadow = true;
  descentBody.receiveShadow = true;
  group.add(descentBody);

  // 4. Upper Structural Equipment Deck (secondary read)
  const upperDeckGeo = trackGeo(new THREE.CylinderGeometry(0.62, 0.68, 0.34, 8));
  const upperDeck = new THREE.Mesh(upperDeckGeo, ceramicMat);
  upperDeck.position.y = 1.17;
  upperDeck.castShadow = true;
  upperDeck.receiveShadow = true;
  group.add(upperDeck);

  // 5. Recessed Instrument Collar & Thermal Louver Ring
  const collarGeo = trackGeo(new THREE.CylinderGeometry(0.66, 0.66, 0.08, 16));
  const collar = new THREE.Mesh(collarGeo, darkCarbonMat);
  collar.position.y = 1.02;
  collar.castShadow = true;
  group.add(collar);

  // 6. Telemetry Mast (2.0 m equivalent scale)
  const mastGeo = trackGeo(new THREE.CylinderGeometry(0.035, 0.05, 0.85, 12));
  const mast = new THREE.Mesh(mastGeo, titaniumMat);
  mast.position.set(0, 1.74, 0);
  mast.castShadow = true;
  group.add(mast);

  // 7. Articulated High-Gain Parabolic Dish (tracks Earth)
  const dishPivot = new THREE.Group();
  dishPivot.position.set(0, 2.16, 0);

  const dishPoints = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.12, 0.02),
    new THREE.Vector2(0.24, 0.08),
    new THREE.Vector2(0.32, 0.16),
  ];
  const dishGeo = trackGeo(new THREE.LatheGeometry(dishPoints, 24));
  // Orient dish local +Z toward target so lookAt aligns dish face cleanly
  dishGeo.rotateX(Math.PI / 2);
  const dishMesh = new THREE.Mesh(dishGeo, ceramicMat);
  dishMesh.castShadow = true;
  dishPivot.add(dishMesh);

  const feedHornGeo = trackGeo(new THREE.CylinderGeometry(0.014, 0.024, 0.24, 10));
  feedHornGeo.rotateX(Math.PI / 2);
  const feedHorn = new THREE.Mesh(feedHornGeo, kaptonGold);
  feedHorn.position.z = 0.16;
  dishPivot.add(feedHorn);

  group.add(dishPivot);

  // 8. Twin Articulated Solar Array Wings (tracks Sun)
  const solarPivot = new THREE.Group();
  solarPivot.position.set(0, 1.38, 0);

  const yokeGeo = trackGeo(new THREE.CylinderGeometry(0.024, 0.024, 2.55, 10));
  yokeGeo.rotateZ(Math.PI / 2);
  const yoke = new THREE.Mesh(yokeGeo, titaniumMat);
  yoke.castShadow = true;
  solarPivot.add(yoke);

  const wingGeo = trackGeo(new THREE.BoxGeometry(0.95, 0.03, 0.48));
  const leftWing = new THREE.Mesh(wingGeo, solarMat);
  leftWing.position.set(-0.92, 0, 0);
  leftWing.castShadow = true;
  leftWing.receiveShadow = true;
  solarPivot.add(leftWing);

  const rightWing = new THREE.Mesh(wingGeo, solarMat);
  rightWing.position.set(0.92, 0, 0);
  rightWing.castShadow = true;
  rightWing.receiveShadow = true;
  solarPivot.add(rightWing);

  group.add(solarPivot);

  return {
    group,
    solarPivot,
    dishPivot,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
