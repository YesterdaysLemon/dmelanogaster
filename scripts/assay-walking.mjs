import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createEngine } from "../src/engine.ts";
import { Terrarium } from "../src/terrarium.ts";
const read = (p) => readFile(new URL("../" + p, import.meta.url));
const manifest = JSON.parse(await read("public/model/walking-manifest.json"));
const wiring = JSON.parse(await read("public/data/manc-walking.json"));
const engine = await createEngine(manifest, (p) => read("public/model/" + p));
const world = new Terrarium(engine, wiring),
  runs = [];
for (const mode of [
  "bridge",
  "E1-silenced",
  "passive",
  "observed-network-only",
  "half-timestep",
]) {
  world.bridge = mode !== "observed-network-only";
  world.passive = mode === "passive";
  world.ablate(mode === "E1-silenced");
  world.reset();
  const dt = mode === "half-timestep" ? 0.0001 : 0.0002;
  engine.model.opt.timestep = dt;
  let minHeight = Infinity,
    minUp = Infinity,
    maxContacts = 0;
  for (let i = 0; i < Math.round(3 / dt); i++) {
    engine.step();
    minHeight = Math.min(minHeight, engine.data.qpos[2]);
    if (i % 20 === 0) {
      const o = world.observation();
      minUp = Math.min(minUp, o.up);
      maxContacts = Math.max(maxContacts, o.physicalContacts);
    }
  }
  const o = world.observation();
  runs.push({
    mode,
    duration: 3,
    timestep: dt,
    position: o.position,
    netDistance: Math.hypot(...o.position.slice(0, 2)),
    travel: o.travel,
    neuralCycles: o.neuralCycles,
    minHeight,
    minUp,
    maxContacts,
    finite: o.qpos.every(Number.isFinite),
    externalForcesZero: [
      ...engine.data.xfrc_applied,
      ...engine.data.qfrc_applied,
    ].every((v) => v === 0),
  });
}
engine.dispose();
const files = [
  "src/circuit.ts",
  "src/terrarium.ts",
  "src/engine.ts",
  "public/model/walking.xml",
  "public/data/manc-walking.json",
];
const sourceFiles = await Promise.all(
  files.map(async (path) => ({
    path,
    sha256: createHash("sha256")
      .update(await read(path))
      .digest("hex"),
  })),
);
const report = {
  version: "0.2.0",
  generatedAt: new Date().toISOString(),
  engine: "MuJoCo WASM 3.13.0",
  scope:
    "Software intervention assays; not biological validation. Baseline sources and hand-specified experimental bridge.",
  sourceFiles,
  runs,
};
await writeFile(
  new URL("../public/data/walking-assay.json", import.meta.url),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
