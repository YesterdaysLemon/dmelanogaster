import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { RateCircuit } from "../src/circuit.ts";
const w = JSON.parse(
  await readFile(new URL("../public/data/manc-walking.json", import.meta.url)),
);
test("MANC identities, anatomical counts and transmitter-sign provenance remain separate", () => {
  assert.equal(w.nodes.length, 532);
  assert.equal(w.edges.length, 10279);
  assert.equal(new Set(w.nodes.map((n) => n.id)).size, w.nodes.length);
  assert.equal(w.nodes.filter((n) => n.role === "motor").length, 392);
  const count = (pre, post) =>
    w.edges.find(
      (e) => w.nodes[e.pre].id === pre && w.nodes[e.post].id === post,
    );
  for (const [pre, post, c, sign] of [
    ["10093", "10707", 187, 1],
    ["10707", "11751", 539, 1],
    ["11751", "10707", 19, 1],
    ["10707", "13905", 17, 1],
    ["11751", "13905", 71, 1],
    ["13905", "10707", 531, -1],
    ["13905", "11751", 172, -1],
  ]) {
    assert.equal(count(pre, post).count, c);
    assert.equal(count(pre, post).sign, sign);
  }
  for (const e of w.edges) {
    assert.ok(Number.isInteger(e.count) && e.count > 0);
    assert.equal(e.evidence, "observed");
    assert.equal(e.signEvidence, "inferred");
    assert.ok(e.pre < w.nodes.length && e.post < w.nodes.length);
  }
});
function minimal() {
  const ids = ["10093", "10707", "11751", "13905"];
  const edges = w.edges
    .filter(
      (e) =>
        ids.includes(w.nodes[e.pre].id) &&
        ids.includes(w.nodes[e.post].id) &&
        e.count >= 5,
    )
    .map((e) => ({
      ...e,
      pre: ids.indexOf(w.nodes[e.pre].id),
      post: ids.indexOf(w.nodes[e.post].id),
    }));
  return {
    ...w,
    nodes: ids.map((id) => w.nodes.find((n) => n.id === id)),
    edges,
  };
}
function assay(dt = 0.0005, lesion = -1, drive = 250) {
  const c = new RateCircuit(minimal());
  c.drive = drive;
  if (lesion >= 0) c.silenced.add(lesion);
  const trace = [];
  for (let i = 0; i < 2 / dt; i++) {
    c.step(dt);
    if (i * dt >= 1) trace.push(c.rates[2]);
  }
  const peaks = trace.filter(
    (v, i, a) => i > 0 && i < a.length - 1 && v > a[i - 1] && v > a[i + 1],
  ).length;
  return { c, peaks, amplitude: Math.max(...trace) - Math.min(...trace) };
}
test("published minimal motif sustains rhythm; E1/E2 lesions and absent input remove it", () => {
  const intact = assay();
  assert.ok(intact.peaks >= 8 && intact.peaks <= 25);
  assert.ok(intact.amplitude > 1);
  for (const run of [assay(0.0005, 1), assay(0.0005, 2), assay(0.0005, -1, 0)])
    assert.ok(run.amplitude < 0.01);
});
test("halved neural timestep retains minimal-circuit frequency and rate state", () => {
  const a = assay(),
    b = assay(0.00025);
  assert.ok(Math.abs(a.peaks - b.peaks) <= 1);
  a.c.rates.forEach((r, i) => assert.ok(Math.abs(r - b.c.rates[i]) < 0.05));
});
