import * as THREE from "three";
import type { Terrarium } from "./terrarium";

/** Original procedural habitat. Banana scale is illustrative, never an anatomical measurement. */
export function addHabitat(scene: THREE.Scene, world: Terrarium) {
  const objects = new Map<string, THREE.Group>();
  const material = (color: number, roughness = 0.85) =>
    new THREE.MeshStandardMaterial({ color, roughness });
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(24, 24, 0.18),
    material(0xc8c3a1),
  );
  floor.position.z = -0.13;
  floor.receiveShadow = true;
  scene.add(floor);
  let seed = 1462;
  const random = () =>
    (seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296;
  const grit = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.018, 0),
    material(0x97886b),
    800,
  );
  const transform = new THREE.Object3D();
  for (let i = 0; i < 800; i++) {
    transform.position.set((random() - 0.5) * 24, (random() - 0.5) * 24, 0.005);
    transform.scale.setScalar(0.6 + random() * 1.6);
    transform.updateMatrix();
    grit.setMatrixAt(i, transform.matrix);
  }
  scene.add(grit);
  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(24, 24, 2)),
    new THREE.LineBasicMaterial({
      color: 0x89927c,
      transparent: true,
      opacity: 0.35,
    }),
  );
  edge.position.z = 0.95;
  scene.add(edge);
  const foodMat = material(0xcf994b),
    repellentMat = material(0x9257a7),
    waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x97c7d1,
      roughness: 0.1,
      transparent: true,
      opacity: 0.7,
      metalness: 0.1,
    });
  for (const s of world.sources) {
    const g = new THREE.Group();
    const droplet = new THREE.Mesh(
      new THREE.SphereGeometry(s.radius, 28, 18),
      s.kind === "food"
        ? foodMat
        : s.kind === "repellent"
          ? repellentMat
          : waterMat,
    );
    droplet.scale.z = 0.28;
    droplet.position.z = 0.08;
    g.add(droplet);
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(s.radius + 0.06, s.radius + 0.09, 48),
      new THREE.MeshBasicMaterial({
        color:
          s.kind === "food"
            ? 0xab7835
            : s.kind === "repellent"
              ? 0x9556a2
              : 0x6a9ca4,
        side: THREE.DoubleSide,
      }),
    );
    halo.position.z = 0.014;
    g.add(halo);
    if (s.kind === "food")
      for (let i = 0; i < 18; i++) {
        const grain = new THREE.Mesh(
          new THREE.SphereGeometry(0.035, 6, 5),
          material(0xf1d999),
        );
        grain.position.set(
          (random() - 0.5) * 0.8,
          (random() - 0.5) * 0.8,
          0.19,
        );
        g.add(grain);
      }
    scene.add(g);
    objects.set(s.id, g);
  }
  const banana = new THREE.Group();
  banana.position.set(-3.5, -4, 0.3);
  banana.rotation.z = -0.25;
  scene.add(banana);
  const bananaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-3, 0, 0.2),
    new THREE.Vector3(-1.8, 0, 0.6),
    new THREE.Vector3(0, 0, 0.85),
    new THREE.Vector3(1.4, 0, 0.5),
    new THREE.Vector3(2, 0, 0.1),
  ]);
  const flesh = new THREE.Mesh(
    new THREE.TubeGeometry(bananaCurve, 40, 0.48, 14, false),
    material(0xf6e6ae, 0.68),
  );
  banana.add(flesh);
  const skinCurve = new THREE.CatmullRomCurve3(
    Array.from({ length: 12 }, (_, i) =>
      bananaCurve.getPoint(0.52 + (i / 11) * 0.48),
    ),
  );
  banana.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(skinCurve, 20, 0.495, 12, false),
      material(0xe4bb30),
    ),
  );
  // Three broad peel ribbons curl away from the exposed fruit, with darker outer skin.
  for (let k = 0; k < 3; k++) {
    const verts: number[] = [],
      indices: number[] = [],
      angle = (k - 1) * 1.9;
    for (let j = 0; j <= 32; j++) {
      const t = j / 32,
        x = 1.8 - 5.3 * t,
        y = Math.sin(angle) * Math.sin((Math.PI * t) / 2) * 2,
        z = 0.25 + (0.8 * Math.sin(Math.PI * t) - 0.25 * t) * Math.cos(angle);
      const width = 0.36 * Math.sin(Math.PI * (0.08 + 0.9 * t));
      verts.push(
        x,
        y - width,
        z,
        x,
        y + width,
        z + 0.06 * Math.sin(Math.PI * t),
      );
      if (j < 32) {
        const n = j * 2;
        indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const peel = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        color: 0xe1be37,
        roughness: 0.82,
        side: THREE.DoubleSide,
      }),
    );
    banana.add(peel);
    const rim = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(
        Array.from(
          { length: 33 },
          (_, j) =>
            new THREE.Vector3(
              verts[j * 6],
              verts[j * 6 + 1],
              verts[j * 6 + 2] - 0.014,
            ),
        ),
      ),
      new THREE.LineBasicMaterial({ color: 0x9b7930 }),
    );
    banana.add(rim);
  }
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.18, 0.65, 8),
    material(0x7d6330),
  );
  stem.rotation.z = -Math.PI / 2;
  stem.rotation.x = Math.PI / 2;
  stem.position.set(2.2, 0, 0.1);
  banana.add(stem);
  for (let i = 0; i < 32; i++) {
    const spot = new THREE.Mesh(
      new THREE.SphereGeometry(0.025 + random() * 0.035, 5, 4),
      material(0x85682f),
    );
    const t = random();
    spot.position.set(
      -3 + 5 * t,
      (random() - 0.5) * 0.4,
      0.25 + 0.6 * Math.sin(t * Math.PI),
    );
    banana.add(spot);
  }
  banana.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return () => {
    for (const s of world.sources) {
      const g = objects.get(s.id)!;
      g.position.set(s.x, s.y, 0);
      g.visible = s.enabled;
    }
  };
}
