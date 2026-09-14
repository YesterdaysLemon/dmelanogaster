import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createMotionBench } from "../src/motion.ts";
import { byteRange } from "../scripts/byte-range.mjs";
const read = (p) => readFile(new URL("../public/motion/" + p, import.meta.url));
const manifest = JSON.parse(await read("manifest.json"));
const recording = JSON.parse(await read("recording.json"));
let bench;
before(async () => {
  bench = await createMotionBench(manifest, recording, read);
});
after(() => {
  bench?.data.delete();
  bench?.model.delete();
});

test("motion sources, anatomy and published assay retain byte provenance", async () => {
  for (const file of [...manifest.files, ...manifest.sourceFiles]) {
    assert.equal(
      createHash("sha256")
        .update(await read(file.target))
        .digest("hex"),
      file.sha256,
      file.target,
    );
  }
  const assay = JSON.parse(await read("assay.json"));
  for (const file of assay.sourceFiles) {
    assert.equal(
      createHash("sha256")
        .update(await readFile(new URL("../" + file.path, import.meta.url)))
        .digest("hex"),
      file.sha256,
      file.path + " needs a fresh assay",
    );
  }
});
test("raw episode retains every source row, independent legs and open endpoints", async () => {
  const csv = (await read("source/annotations.csv"))
    .toString("utf8")
    .trim()
    .split(/\r?\n/)
    .map((l) => l.split(","));
  const header = csv.shift();
  assert.equal(recording.frameCount, 37);
  assert.equal(recording.duration, 0.3);
  assert.equal(recording.annotationHz, 120);
  assert.equal(recording.videoFps, 36);
  for (let f = 0; f < 37; f++) {
    assert.equal(
      recording.sourceFrames[f],
      Number(csv[f][header.indexOf("frame_idx")]),
    );
    for (let l = 0; l < 6; l++)
      for (let p = 0; p < 5; p++)
        for (let a = 0; a < 3; a++) {
          const key =
            recording.legs[l] + "-" + recording.markers[p] + "_" + "xyz"[a];
          assert.equal(
            recording.rawCoordinates[f][l * 5 + p][a],
            Number(csv[f][header.indexOf(key)]),
          );
        }
  }
  assert.notDeepEqual(recording.qpos[0], recording.qpos.at(-1));
  assert.deepEqual(bench.target(0), recording.qpos[0]);
  assert.ok(
    bench
      .target(0.3)
      .every((v, i) => Math.abs(v - recording.qpos.at(-1)[i]) < 1e-12),
  );
});
test("seven-axis fit explains more landmarks than the same-body reduced fit", () => {
  const residual = (poses) =>
    Math.sqrt(
      poses.reduce(
        (sum, ps, f) =>
          sum +
          ps.reduce(
            (s, p, i) =>
              s +
              p.reduce(
                (s, v, a) => s + (v - recording.landmarks[f][i][a]) ** 2,
                0,
              ),
            0,
          ),
        0,
      ) /
        (37 * 30),
    );
  assert.ok(
    Math.abs(
      residual(recording.fittedLandmarks) -
        recording.registration.landmarkRmsMm,
    ) < 1e-10,
  );
  assert.ok(
    Math.abs(
      residual(recording.reducedLandmarks) -
        recording.registration.reducedRmsMm,
    ) < 1e-10,
  );
  assert.ok(
    recording.registration.landmarkRmsMm <
      recording.registration.reducedRmsMm * 0.5,
  );
  // Catches sign/axis/order disagreement between offline IK and browser MuJoCo.
  for (let f = 0; f < 37; f++) {
    bench.pose(f);
    bench
      .points()
      .forEach((p, i) =>
        p.forEach((v, a) =>
          assert.ok(Math.abs(v - recording.fittedLandmarks[f][i][a]) < 1e-7),
        ),
      );
  }
});
test("recorded targets act through native muscle dynamics and fail under excitation removal", () => {
  assert.equal(bench.model.nq, 42);
  assert.equal(bench.model.nu, 84);
  assert.ok(Array.from(bench.model.actuator_dyntype).every((v) => v === 4));
  const active = bench.run("tracking"),
    passive = bench.run("passive");
  assert.ok(active.rmsMarkerMm < passive.rmsMarkerMm * 0.3);
  assert.ok(
    active.rmsMarkerMm > 0.01,
    "tracking must not teleport to target poses",
  );
  assert.ok(active.activation.flat().some((v) => v > 0.1));
  assert.ok(active.forces.flat().some((v) => Math.abs(v) > 1));
  assert.equal(passive.maxExcitation, 0);
  assert.ok(passive.activation.flat().every((v) => v === 0));
  assert.equal(active.externalForceMax, 0);
  assert.ok(
    [...bench.data.qfrc_applied, ...bench.data.xfrc_applied].every(
      (v) => v === 0,
    ),
  );
  const half = bench.run("tracking", 0.00005);
  assert.ok(Math.abs(half.rmsMarkerMm - active.rmsMarkerMm) < 0.002);
  assert.ok(Math.abs(half.rmsAngleDeg - active.rmsAngleDeg) < 0.1);
});
test("video byte ranges support seeking, suffixes and unsatisfiable requests", () => {
  assert.deepEqual(byteRange("bytes=10-19", 100), { start: 10, end: 19 });
  assert.deepEqual(byteRange("bytes=90-", 100), { start: 90, end: 99 });
  assert.deepEqual(byteRange("bytes=-10", 100), { start: 90, end: 99 });
  assert.deepEqual(byteRange("bytes=90-999", 100), { start: 90, end: 99 });
  assert.equal(byteRange("bytes=100-", 100), false);
  assert.equal(byteRange("bytes=-0", 100), false);
  assert.equal(byteRange("bytes=0-", 0), false);
  assert.equal(byteRange("bytes=0-1,4-5", 100), null);
  assert.equal(byteRange(undefined, 100), null);
});
