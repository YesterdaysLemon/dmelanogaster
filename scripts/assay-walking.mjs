import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createEngine, modelAssetPath } from "../src/engine.ts";
import { contactAssays } from "./contact-assay.mjs";
import { Terrarium } from "../src/terrarium.ts";
const read = (p) => readFile(new URL("../" + p, import.meta.url));
const manifest = JSON.parse(await read("public/model/walking-manifest.json"));
const wiring = JSON.parse(await read("public/data/manc-walking.json"));
const engine = await createEngine(manifest, (p) =>
  read("public" + modelAssetPath(manifest, p)),
);
const world = new Terrarium(
    engine,
    wiring,
    JSON.parse(await read("public/data/nmf-steps.json")),
  ),
  runs = [];
for (const mode of [
  "bridge",
  "E1-silenced",
  "passive",
  "observed-network-only",
  "half-timestep",
  "arena-10s",
]) {
  world.bridge = mode !== "observed-network-only";
  world.passive = mode === "passive";
  world.ablate(mode === "E1-silenced");
  world.reset();
  const dt = mode === "half-timestep" ? 0.00005 : 0.0001;
  engine.model.opt.timestep = dt;
  const duration = mode === "arena-10s" ? 10 : 3;
  let minHeight = Infinity,
    minUp = Infinity,
    maxContacts = 0,
    minFloorClearance = Infinity,
    minWallClearance = Infinity,
    maxPenetration = 0;
  for (let i = 0; i < Math.round(duration / dt); i++) {
    engine.step();
    minHeight = Math.min(minHeight, engine.data.qpos[2]);
    if (i % 100 === 0) {
      const o = world.observation();
      minUp = Math.min(minUp, o.up);
      maxContacts = Math.max(maxContacts, o.physicalContacts);
      minFloorClearance = Math.min(
        minFloorClearance,
        o.surface.floorClearanceMM,
      );
      minWallClearance = Math.min(minWallClearance, o.surface.wallClearanceMM);
      maxPenetration = Math.max(maxPenetration, o.contact.maxPenetrationMM);
    }
  }
  const o = world.observation();
  console.log(mode, o.position, {
    minFloorClearance,
    minWallClearance,
    maxPenetration,
  });
  runs.push({
    mode,
    duration,
    timestep: dt,
    position: o.position,
    netDistance: Math.hypot(...o.position.slice(0, 2)),
    travel: o.travel,
    neuralCycles: o.neuralCycles,
    minHeight,
    minUp,
    maxContacts,
    minFloorClearanceMM: minFloorClearance,
    minWallClearanceMM: minWallClearance,
    maxPenetrationMM: maxPenetration,
    finite: o.qpos.every(Number.isFinite),
    externalForcesZero: [
      ...engine.data.xfrc_applied,
      ...engine.data.qfrc_applied,
    ].every((v) => v === 0),
  });
}
engine.model.opt.timestep = 0.0001;
const contacts = contactAssays(engine, world);
engine.dispose();
const files = [
  "src/circuit.ts",
  "src/terrarium.ts",
  "src/engine.ts",
  "src/steps.ts",
  "src/contact.ts",
  "scripts/contact-assay.mjs",
  "public/data/nmf-steps.json",
  "public/model/walking-manifest.json",
  "public/props/banana/manifest.json",
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
  version: "0.4.0",
  generatedAt: new Date().toISOString(),
  engine: "MuJoCo WASM 3.13.0",
  scope:
    "Software intervention assays; not biological validation. Baseline sources and hand-specified experimental bridge.",
  sourceFiles,
  runs,
  contacts,
  sampling:
    "Walking surface/contact metrics sampled every 100 physics steps; drop/impact penetration inspected at every solver step, surface support every 50 steps. Finite protocols, not a universal non-penetration guarantee.",
};
await writeFile(
  new URL("../public/data/walking-assay.json", import.meta.url),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
