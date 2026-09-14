import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { Terrarium } from "./terrarium";

/** All solid scenery shares dimensions and transforms with the physics manifest. */
export function addHabitat(scene: THREE.Scene, world: Terrarium) {
  const spec = world.engine.manifest.environment!;
  const objects = new Map<string, THREE.Group>();
  const material = (color: number) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.83 });
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(spec.halfWidth * 2, spec.halfWidth * 2, 0.18),
    material(0xc8c3a1),
  );
  floor.position.z = spec.floorZ - 0.09;
  floor.receiveShadow = true;
  scene.add(floor);
  // Flat pigment speckles, not unmodelled solid pebbles above the contact plane.
  let seed = 1462;
  const random = () =>
    (seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296;
  const grit = new THREE.InstancedMesh(
    new THREE.CircleGeometry(0.015, 5),
    material(0xaaa080),
    700,
  );
  const transform = new THREE.Object3D();
  for (let i = 0; i < 700; i++) {
    transform.position.set(
      (random() - 0.5) * 24,
      (random() - 0.5) * 24,
      0.0005,
    );
    transform.scale.setScalar(0.6 + random() * 1.6);
    transform.updateMatrix();
    grit.setMatrixAt(i, transform.matrix);
  }
  scene.add(grit);
  for (const [x, y, sx, sy] of [
    [0, 12, 12, 0.1],
    [0, -12, 12, 0.1],
    [12, 0, 0.1, 12],
    [-12, 0, 0.1, 12],
  ]) {
    const geometry = new THREE.BoxGeometry(sx * 2, sy * 2, spec.wallHeight);
    const wall = new THREE.Mesh(
      geometry,
      new THREE.MeshPhysicalMaterial({
        color: 0xc5d4c1,
        transparent: true,
        opacity: 0.045,
        roughness: 0.1,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    wall.position.set(x, y, spec.wallHeight / 2);
    scene.add(wall);
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({
        color: 0x89927c,
        transparent: true,
        opacity: 0.25,
      }),
    );
    edge.position.copy(wall.position);
    scene.add(edge);
  }
  for (const s of world.sources) {
    const g = new THREE.Group();
    const color =
      s.kind === "food"
        ? 0xcf994b
        : s.kind === "repellent"
          ? 0x9257a7
          : 0x97c7d1;
    const patch = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 20),
      new THREE.MeshStandardMaterial({
        color,
        roughness: s.kind === "water" ? 0.18 : 0.7,
        metalness: 0,
      }),
    );
    patch.scale.set(s.radius, s.radius, s.radius * 0.1);
    patch.position.z = s.radius * 0.1;
    patch.castShadow = true;
    patch.receiveShadow = true;
    g.add(patch);
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(s.radius + 0.06, s.radius + 0.085, 48),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    halo.position.z = 0.003;
    g.add(halo);
    scene.add(g);
    objects.set(s.id, g);
  }
  const banana = new THREE.Group();
  banana.position.fromArray(spec.banana.position);
  banana.rotation.z = spec.banana.rotationZ;
  scene.add(banana);
  let disposed = false;
  const ready = new GLTFLoader()
    .loadAsync("/props/banana/" + spec.banana.visual)
    .then((gltf) => {
      if (disposed) {
        gltf.scene.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.dispose();
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            mats.forEach((m) => m.dispose());
          }
        });
        return;
      }
      // Export is explicitly Z-up; no implicit glTF axis conversion or placement offset.
      gltf.scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      banana.add(gltf.scene);
    });
  return {
    ready,
    update: () => {
      for (const s of world.sources) {
        const g = objects.get(s.id)!;
        g.position.set(s.x, s.y, 0);
        g.visible = s.enabled;
      }
    },
    dispose: () => {
      disposed = true;
    },
  };
}
