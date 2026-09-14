import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createEngine, modelAssetPath } from "../src/engine.ts";
import { Terrarium } from "../src/terrarium.ts";
import { surfaceBounds } from "../src/contact.ts";
import { contactAssays } from "../scripts/contact-assay.mjs";
const read = (p) => readFile(new URL("../public" + p, import.meta.url));
const manifest = JSON.parse(await read("/model/walking-manifest.json"));
let engine, world;
before(async () => {
  engine = await createEngine(manifest, (p) =>
    read(modelAssetPath(manifest, p)),
  );
  world = new Terrarium(
    engine,
    JSON.parse(await read("/data/manc-walking.json")),
    JSON.parse(await read("/data/nmf-steps.json")),
  );
});
after(() => engine?.dispose());
test("all anatomical and banana contact assets match their manifest; active axes bind by identity", async () => {
  for (const file of manifest.files)
    assert.equal(
      createHash("sha256")
        .update(await read(modelAssetPath(manifest, file.target)))
        .digest("hex"),
      file.sha256,
      file.target,
    );
  const { model: m, mujoco: mj } = engine;
  for (const joint of manifest.joints) {
    const id = mj.mj_name2id(m, mj.mjtObj.mjOBJ_JOINT.value, joint.name);
    assert.equal(m.jnt_qposadr[id], joint.qposIndex);
    assert.equal(m.jnt_dofadr[id], joint.qvelIndex);
  }
  assert.equal(m.na, 84);
  assert.equal(manifest.adhesion.length, 6);
  assert.equal(manifest.passiveTarsi.count, 24);
  assert.equal(manifest.environment.banana.pieces.length, 94);
});
test("convex-hull clearance equals the complete visible surface support", () => {
  const { model: m, data: d, mujoco: mj } = engine;
  world.reset();
  d.qpos.set([Math.cos(0.15), 0, Math.sin(0.15), 0], 3);
  d.qpos[2] = 3;
  mj.mj_forward(m, d);
  let minimum = Infinity;
  const vertices = m.mesh_vert,
    rot = d.geom_xmat,
    pos = d.geom_xpos;
  for (let g = 0; g < m.ngeom; g++) {
    if (m.geom_type[g] !== 7 || m.geom_group[g] === 3) continue;
    const mesh = m.geom_dataid[g],
      start = m.mesh_vertadr[mesh] * 3,
      end = start + m.mesh_vertnum[mesh] * 3;
    for (let v = start; v < end; v += 3)
      minimum = Math.min(
        minimum,
        pos[g * 3 + 2] +
          rot[g * 9 + 6] * vertices[v] +
          rot[g * 9 + 7] * vertices[v + 1] +
          rot[g * 9 + 8] * vertices[v + 2],
      );
  }
  assert.ok(Math.abs(surfaceBounds(engine).floorClearanceMM - minimum) < 1e-8);
  world.reset();
});
test("the banana peel has a real open gap between collidable flesh and flap", () => {
  const { model: m, data: d, mujoco: mj } = engine;
  world.reset();
  const cast = (y) => {
    const x = -1.5,
      a = manifest.environment.banana.rotationZ,
      [bx, by] = manifest.environment.banana.position;
    // Only environment geoms. Binding returns distance; output buffers are not
    // assumed to be copied back to JS by the current WASM ray binding.
    return mj.mj_ray(
      m,
      d,
      [
        bx + x * Math.cos(a) - y * Math.sin(a),
        by + x * Math.sin(a) + y * Math.cos(a),
        3,
      ],
      [0, 0, -1],
      [0, 0, 0, 1, 0, 0],
      true,
      -1,
      new Int32Array(1),
      new Float64Array(3),
    );
  };
  assert.ok(Math.abs(cast(0.8) - 3) < 1e-6, "gap ray reaches the floor");
  assert.ok(cast(0) < 2, "flesh ray hits above the floor");
  assert.ok(cast(1.4) < 2.9, "flap ray hits above the floor");
});
test("floor, side, banana drops and a wall impact retain visible surfaces within 5 micrometres", () => {
  const reports = contactAssays(engine, world);
  for (const r of reports) {
    assert.ok(r.finite && r.allCommandsZero, r.mode);
    assert.ok(r.maxPenetrationMM < 0.005, JSON.stringify(r));
    assert.ok(r.minFloorClearanceMM > -0.005, JSON.stringify(r));
    assert.ok(r.minWallClearanceMM > -0.005, JSON.stringify(r));
  }
  assert.ok(
    reports.find((r) => r.mode === "banana-drop").bananaContactSamples > 0,
  );
  assert.ok(
    reports.find((r) => r.mode === "wall-impact").wallContactSamples > 0,
  );
});
test("moving a substrate updates its collider and rejects overlap without moving the animal", () => {
  world.passive = true;
  world.reset();
  world.setSource("yeast", { x: 7, y: 7 });
  const { model: m, data: d, mujoco: mj } = engine;
  const id = mj.mj_name2id(m, mj.mjtObj.mjOBJ_BODY.value, "patch_yeast");
  assert.equal(d.xpos[id * 3], 7);
  assert.equal(d.xpos[id * 3 + 1], 7);
  engine.step(5000);
  const initial = Array.from(d.qpos),
    before = { ...world.sources[0] };
  // The deepest foot's geometry is genuinely resting on the substrate.
  let foot = -1,
    z = Infinity;
  for (let g = 0; g < m.ngeom; g++) {
    const name = mj.mj_id2name(m, mj.mjtObj.mjOBJ_GEOM.value, g) || "";
    if (name.includes("Tarsus5") && d.geom_xpos[g * 3 + 2] < z) {
      foot = g;
      z = d.geom_xpos[g * 3 + 2];
    }
  }
  assert.throws(
    () =>
      world.setSource("yeast", {
        x: d.geom_xpos[foot * 3],
        y: d.geom_xpos[foot * 3 + 1],
      }),
    /overlaps/,
  );
  assert.deepEqual(world.sources[0], before);
  assert.deepEqual(Array.from(d.qpos), initial);
  world.setSource("yeast", { enabled: false });
  assert.equal(d.xpos[id * 3 + 2], -10);
});
