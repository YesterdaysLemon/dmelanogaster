import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createMotionBench } from "../src/motion.ts";
const manifest = JSON.parse(
  await readFile("public/motion/manifest.json", "utf8"),
);
const recording = JSON.parse(
  await readFile("public/motion/recording.json", "utf8"),
);
const bench = await createMotionBench(manifest, recording, (p) =>
  readFile("public/motion/" + p),
);
const tracking = bench.run("tracking"),
  passive = bench.run("passive"),
  half = bench.run("tracking", 0.00005);
const sourceFiles = await Promise.all(
  [
    "src/motion.ts",
    "public/motion/motion.xml",
    "public/motion/recording.json",
  ].map(async (path) => ({
    path,
    sha256: createHash("sha256")
      .update(await readFile(path))
      .digest("hex"),
  })),
);
const compact = ({ qpos, landmarks, activation, forces, ...metrics }) => ({
  ...metrics,
  finalQpos: qpos.at(-1),
});
const report = {
  scope:
    "Tethered 0.3-second recorded-trajectory assay; no neural or locomotion claim",
  sourceFiles,
  tracking: compact(tracking),
  passive: compact(passive),
  halfTimestep: compact(half),
};
const changes = recording.qpos.slice(1).flatMap((q, frame) =>
  q.map((v, j) => ({
    joint: recording.jointNames[j],
    fromSourceFrame: recording.sourceFrames[frame],
    toSourceFrame: recording.sourceFrames[frame + 1],
    degrees: (Math.abs(v - recording.qpos[frame][j]) * 180) / Math.PI,
  })),
);
report.targetDiagnostics = {
  largestFrameChange: changes.reduce((a, b) => (a.degrees > b.degrees ? a : b)),
  interpretation:
    "IK coordinate changes can reflect annotation noise and branch ambiguity; they are not measured physiological velocities.",
};
await writeFile(
  "public/motion/assay.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
