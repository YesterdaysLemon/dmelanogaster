import { readFile } from "node:fs/promises";
import { createEngine } from "../src/engine.ts";
const path = process.argv[2];
if (!path) throw new Error("Usage: node scripts/replay-trial.mjs trial.json");
const trial = JSON.parse(await readFile(path, "utf8"));
const manifest = JSON.parse(
  await readFile(
    new URL("../public/model/manifest.json", import.meta.url),
    "utf8",
  ),
);
if (
  trial.schema !== 1 ||
  trial.model.commit !== manifest.commit ||
  trial.timestep !== manifest.physics.timestep
)
  throw new Error(
    "Trial schema, source or timestep differs from this checkout",
  );
if (
  !Number.isFinite(trial.simulatedUntil) ||
  trial.simulatedUntil < 0 ||
  trial.simulatedUntil > 3600
)
  throw new Error("Invalid or excessive trial duration");
const engine = await createEngine(manifest, (p) =>
  readFile(new URL("../public/model/" + p, import.meta.url)),
);
try {
  let next = 0;
  const steps = Math.round(trial.simulatedUntil / trial.timestep);
  for (let step = 0; step < steps; step++) {
    while (
      next < trial.events.length &&
      trial.events[next].time <= engine.data.time + 1e-10
    ) {
      const event = trial.events[next++];
      if (event.action === "pulse") {
        engine.select(event.muscle);
        engine.pulse(event.value, event.duration);
      } else if (event.action === "release") engine.release();
      else throw new Error("Unsupported control event");
    }
    engine.step();
  }
  const errors = trial.finalQpos.map((v, i) =>
    Math.abs(v - engine.data.qpos[i]),
  );
  const maximum = Math.max(...errors);
  console.log(
    JSON.stringify(
      {
        sourceCommit: manifest.commit,
        seconds: engine.data.time,
        maxQposDifference: maximum,
        reproduced: maximum < 1e-8,
      },
      null,
      2,
    ),
  );
  if (maximum >= 1e-8) process.exitCode = 1;
} finally {
  engine.dispose();
}
