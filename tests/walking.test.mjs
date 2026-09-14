import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createEngine } from "../src/engine.ts";
import { Terrarium } from "../src/terrarium.ts";
const manifest = JSON.parse(
  await readFile(
    new URL("../public/model/walking-manifest.json", import.meta.url),
  ),
);
const wiring = JSON.parse(
  await readFile(new URL("../public/data/manc-walking.json", import.meta.url)),
);
const read = (p) => readFile(new URL("../public/model/" + p, import.meta.url));
let engine, world;
before(async () => {
  engine = await createEngine(manifest, read);
  world = new Terrarium(engine, wiring);
});
after(() => engine?.dispose());
test("published assay identifies the current circuit, bridge and body bytes", async () => {
  const report = JSON.parse(
    await readFile(
      new URL("../public/data/walking-assay.json", import.meta.url),
    ),
  );
  for (const file of report.sourceFiles) {
    const bytes = await readFile(new URL("../" + file.path, import.meta.url));
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      file.sha256,
      file.path + " requires a fresh assay",
    );
  }
});
test("derived body has separate provenance, six free legs and native muscle dynamics", async () => {
  const file = manifest.files.find((f) => f.target === "walking.xml");
  assert.equal(
    createHash("sha256")
      .update(await read(file.target))
      .digest("hex"),
    file.sha256,
  );
  assert.equal(engine.model.nq, 25);
  assert.equal(engine.model.nu, 36);
  assert.equal(engine.model.nv, 24);
  assert.ok([...engine.model.actuator_dyntype].every((v) => v === 4));
  assert.equal(manifest.physics.timestep, 0.0002);
});
function run({
  lesion = false,
  passive = false,
  bridge = true,
  dt = 0.0002,
} = {}) {
  engine.model.opt.timestep = dt;
  world.bridge = bridge;
  world.passive = passive;
  world.ablate(lesion);
  world.reset();
  const min = [Infinity, Infinity],
    max = [0, 0],
    contact = new Set();
  for (let i = 0; i < Math.round(3 / dt); i++) {
    engine.step();
    const z = engine.data.qpos[2];
    min[0] = Math.min(min[0], z);
    if (i % 10 === 0) {
      const o = world.observation();
      min[1] = Math.min(min[1], o.up);
      contact.add(o.contacts.map((v) => (v ? 1 : 0)).join(""));
      max[0] = Math.max(max[0], o.physicalContacts);
      max[1] = Math.max(max[1], ...o.muscleActivation);
    }
  }
  const o = world.observation();
  assert.ok(o.qpos.every(Number.isFinite));
  assert.ok(
    [...engine.data.xfrc_applied, ...engine.data.qfrc_applied].every(
      (v) => v === 0,
    ),
    "no injected root or joint forces",
  );
  return { ...o, min, max, contactPatterns: contact.size };
}
test("neural-timed muscles advance the body; ablated and passive controls do not", () => {
  const active = run(),
    ablated = run({ lesion: true }),
    passive = run({ passive: true });
  assert.ok(active.position[0] > 1.5, JSON.stringify(active.position));
  assert.ok(active.min[0] > 1.4);
  assert.ok(active.min[1] > 0.8);
  assert.ok(
    active.neuralCycles > 10 &&
      active.contactPatterns >= 4 &&
      active.max[0] >= 3 &&
      active.max[1] > 0.1,
  );
  assert.ok(Math.hypot(...ablated.position.slice(0, 2)) < 0.2);
  assert.equal(ablated.neuralCycles, 0);
  assert.ok(passive.position[2] < 0.7);
  assert.ok(Math.hypot(...passive.position.slice(0, 2)) < 0.5);
  assert.ok(passive.muscleActivation.every((v) => v < 1e-6));
});
test("halved physical timestep preserves the locomotion result and upright stance", () => {
  const half = run({ dt: 0.0001 });
  assert.ok(half.position[0] > 1.5);
  assert.ok(half.min[0] > 1.4);
  assert.ok(half.min[1] > 0.8);
  engine.model.opt.timestep = 0.0002;
});
test("bridge timing follows neural activity rather than the presence of a lesion flag", () => {
  engine.model.opt.timestep = 0.0002;
  world.passive = false;
  world.bridge = true;
  world.ablate(false);
  world.reset();
  world.circuit.silenced.add(
    wiring.nodes.findIndex((n) => n.role === "motor" && n.leg === "RH"),
  );
  engine.step(5000);
  assert.ok(
    world.phase > 1,
    "a remote single-MN lesion must not globally gate the bridge",
  );
  world.ablate(true);
  engine.step(2500);
  const phase = world.phase;
  engine.step(2500);
  assert.equal(
    world.phase,
    phase,
    "after neural output settles, no residual clock may advance strides",
  );
});
test("environment stimuli affect observations and reward without changing graph weights", () => {
  world.passive = false;
  world.bridge = true;
  world.ablate(false);
  world.reset();
  const counts = JSON.stringify(wiring.edges);
  world.setSource("yeast", { x: 0, y: 0 });
  engine.step(10);
  assert.equal(world.foodContact, 1);
  assert.ok(world.reward > 0);
  world.setSource("geosmin", { enabled: false });
  engine.step(10);
  assert.deepEqual(world.aversion, [0, 0]);
  world.setSource("yeast", { x: 10, y: 10 });
  engine.step(10);
  assert.equal(world.foodContact, 0);
  assert.equal(JSON.stringify(wiring.edges), counts);
  assert.throws(() => world.setSource("yeast", { x: NaN }));
});
