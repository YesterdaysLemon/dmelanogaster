import type { FlyEngine } from "./engine";
import { RateCircuit, type Wiring } from "./circuit.ts";

import { sampleStep, type RecordedSteps } from "./steps.ts";
import { contactMetrics, surfaceBounds } from "./contact.ts";

export const legs = ["LF", "LM", "LH", "RF", "RM", "RH"];
export interface Stimulus {
  id: string;
  kind: "food" | "repellent" | "water";
  x: number;
  y: number;
  radius: number;
  strength: number;
  enabled: boolean;
}
export class Terrarium {
  readonly circuit: RateCircuit;
  readonly engine: FlyEngine;
  readonly sources: Stimulus[];
  bridge = true;
  sensory = true;
  passive = false;
  phase = 0;
  cycles = 0;
  contacts: boolean[] = Array(6).fill(false);
  odor = [0, 0];
  aversion = [0, 0];
  energy = 0.55;
  foodContact = 0;
  travel = 0;
  reward = 0;
  lastPulse = -1;
  period = 0.12;
  jointKp = 20;
  jointKd = 0.08;
  private neuralElapsed = 0;
  private mean = 0;
  private previous = 0;
  private rising = false;
  private center = [0, 0];
  private trace: {
    time: number;
    signal: number;
    phase: number;
    x: number;
    y: number;
    contacts: number;
  }[] = [];
  private rhythmIndex: number;
  private body: number;
  private amplitude = 0;
  readonly steps: RecordedSteps;
  private patchIds: number[];
  constructor(engine: FlyEngine, wiring: Wiring, steps: RecordedSteps) {
    this.engine = engine;
    this.sources = structuredClone(engine.manifest.environment!.stimuli);
    this.steps = steps;
    this.circuit = new RateCircuit(wiring);
    this.rhythmIndex = wiring.nodes.findIndex((n) => n.id === "11751");
    if (this.rhythmIndex < 0) throw new Error("MANC LF E2 identity missing");
    if (steps.joints.length !== 42 || engine.model.nu !== 90)
      throw new Error("NMF body / step roster mismatch");
    const mj = engine.mujoco;
    this.body = mj.mj_name2id(
      engine.model,
      mj.mjtObj.mjOBJ_BODY.value,
      "Thorax",
    );
    this.patchIds = this.sources.map((s) => {
      const id = mj.mj_name2id(
        engine.model,
        mj.mjtObj.mjOBJ_BODY.value,
        "patch_" + s.id,
      );
      return engine.model.body_mocapid[id];
    });
    engine.beforeStep = (dt) => this.step(dt);
    engine.selected = 4;
    engine.speed = 0.25;
  }
  reset() {
    this.engine.reset();
    this.circuit.reset();
    this.phase = 0;
    this.amplitude = 0;
    this.cycles = 0;
    this.lastPulse = -1;
    this.period = 0.12;
    this.mean = 0;
    this.previous = 0;
    this.rising = false;
    this.neuralElapsed = 0;
    this.center = [0, 0];
    this.travel = 0;
    this.trace = [];
    this.energy = 0.55;
    this.foodContact = 0;
    this.reward = 0;
    this.contacts.fill(false);
    this.odor = [0, 0];
    this.aversion = [0, 0];
    this.syncPatches();
  }
  ablate(active: boolean) {
    this.circuit.silenced.clear();
    if (active)
      this.circuit.wiring.nodes.forEach((n, i) => {
        if (n.name === "IN17A001") this.circuit.silenced.add(i);
      });
  }
  field(x: number, y: number, kind: string) {
    return this.sources.reduce(
      (a, s) =>
        a +
        (s.enabled && s.kind === kind
          ? s.strength * Math.exp(-Math.hypot(x - s.x, y - s.y) / 2)
          : 0),
      0,
    );
  }
  setSource(
    id: string,
    patch: Partial<Pick<Stimulus, "x" | "y" | "strength" | "enabled">>,
  ) {
    const source = this.sources.find((s) => s.id === id);
    if (!source) throw new Error("Unknown stimulus");
    const before = { ...source };
    for (const k of ["x", "y", "strength"] as const)
      if (patch[k] !== undefined && !Number.isFinite(patch[k]))
        throw new Error("Stimuli must be finite");
    if (patch.x !== undefined) source.x = Math.max(-10, Math.min(10, patch.x));
    if (patch.y !== undefined) source.y = Math.max(-10, Math.min(10, patch.y));
    if (patch.strength !== undefined)
      source.strength = Math.max(0, Math.min(5, patch.strength));
    if (patch.enabled !== undefined) source.enabled = Boolean(patch.enabled);
    this.syncPatches();
    // Moving a prop must not teleport a solid into the animal. Validate the actual
    // collision geometry and restore the previous placement if there is overlap.
    const mj = this.engine.mujoco,
      d = this.engine.data;
    const geom = mj.mj_name2id(
      this.engine.model,
      mj.mjtObj.mjOBJ_GEOM.value,
      "prop_" + id,
    );
    for (let i = 0; i < d.ncon; i++) {
      const c = d.contact.get(i)!;
      if (c.dist < 0 && (c.geom1 === geom || c.geom2 === geom)) {
        Object.assign(source, before);
        this.syncPatches();
        throw new Error(
          "This patch overlaps the fly. Choose a clear position.",
        );
      }
    }
  }
  private syncPatches() {
    this.sources.forEach((s, i) => {
      const p = this.patchIds[i] * 3;
      this.engine.data.mocap_pos.set(
        [s.x, s.y, s.enabled ? s.radius * 0.1 : -10],
        p,
      );
    });
    this.engine.mujoco.mj_forward(this.engine.model, this.engine.data);
  }
  step(dt: number) {
    const { data: d } = this.engine,
      r = d.xmat,
      b = this.body * 9,
      pos = this.body * 3;
    const x = d.xpos[pos],
      y = d.xpos[pos + 1];
    this.neuralElapsed += dt;
    if (this.neuralElapsed >= 0.0008 - 1e-10) {
      this.circuit.step(this.neuralElapsed);
      this.neuralElapsed = 0;
      const signal = this.circuit.rates[this.rhythmIndex];
      this.mean += ((signal - this.mean) * 0.0008) / 0.15;
      const rising = signal > this.previous;
      // Peak-triggered shared timing is a hypothesis, not a measured inter-leg circuit.
      if (
        !rising &&
        this.rising &&
        signal > this.mean + 0.15 &&
        d.time > 0.12 &&
        d.time - this.lastPulse > 0.025
      ) {
        if (this.lastPulse >= 0)
          this.period = Math.max(0.055, Math.min(0.2, d.time - this.lastPulse));
        this.lastPulse = d.time;
        this.cycles++;
      }
      this.rising = rising;
      this.previous = signal;
    }
    const alive =
      this.lastPulse >= 0 &&
      d.time - this.lastPulse < Math.min(0.15, this.period * 1.8);
    if (alive) this.phase += dt / (2 * this.period); // Two candidate-CPG cycles per exploratory stride, explicitly assumed.
    for (let side = 0; side < 2; side++) {
      const lateral = side === 0 ? 0.25 : -0.25;
      const ax = x + r[b] * 0.55 + r[b + 1] * lateral,
        ay = y + r[b + 3] * 0.55 + r[b + 4] * lateral;
      this.odor[side] = this.field(ax, ay, "food");
      this.aversion[side] = this.field(ax, ay, "repellent");
    }
    const steering = this.sensory
      ? Math.max(
          -0.25,
          Math.min(
            0.25,
            3 *
              (this.odor[0] -
                this.odor[1] -
                2 * (this.aversion[0] - this.aversion[1])),
          ),
        )
      : 0;
    this.foodContact = this.sources.some(
      (s) =>
        s.enabled &&
        s.kind === "food" &&
        Math.hypot(x - s.x, y - s.y) < s.radius,
    )
      ? 1
      : 0;
    this.reward =
      this.foodContact - (this.aversion[0] + this.aversion[1]) * 0.1;
    this.energy = Math.max(
      0,
      Math.min(1, this.energy + dt * (this.foodContact * 0.04 - 0.001)),
    );
    this.travel += Math.hypot(x - this.center[0], y - this.center[1]);
    this.center = [x, y];
    // Published single-step shapes; invented six-leg timing and ideal feedback remain explicit.
    // A stopped neural signal smoothly returns to stance and cannot advance the clock.
    this.amplitude = Math.max(
      0,
      Math.min(1, this.amplitude + ((alive ? 1 : -1) * dt) / 0.15),
    );
    d.ctrl.fill(0);
    if (!this.passive)
      for (let leg = 0; leg < 6; leg++) {
        const phase = this.phase + ([0, 2, 4].includes(leg) ? 0 : 0.5);
        const p = ((phase % 1) + 1) % 1;
        const magnitude =
          this.amplitude * (1 + (leg < 3 ? -steering : steering));
        if (this.bridge) {
          // Native contact-only adhesion, as in NMF. No force is applied to airborne feet.
          d.ctrl[84 + leg] = !alive || p > this.steps.stanceStart[leg] ? 1 : 0;
          for (let j = 0; j < 7; j++) {
            const q = leg * 7 + j,
              sample = sampleStep(this.steps, q, phase);
            const target =
              this.steps.neutral[q] +
              magnitude * (sample.angle - this.steps.neutral[q]);
            const velocity = alive
              ? (magnitude * sample.derivative) / (2 * this.period)
              : 0;
            const torque =
              this.jointKp * (target - d.qpos[this.steps.qids[q]]) +
              this.jointKd * (velocity - d.qvel[this.steps.vids[q]]);
            d.ctrl[q * 2] = Math.min(0.95, Math.max(0, torque / 9));
            d.ctrl[q * 2 + 1] = Math.min(0.95, Math.max(0, -torque / 9));
          }
        } else {
          // Limited pooled-MN hypothesis only on principal pitch axes. No assignments
          // are invented for roll/yaw/tarsus axes without an identified muscle bridge.
          for (const [joint, positive, negative] of [
            [1, "coxa stance", "coxa swing"],
            [3, "femur/tr flex", "femur/tr extend"],
            [5, "tibia extend", "tibia flex"],
          ] as const) {
            const a = (leg * 7 + joint) * 2;
            d.ctrl[a] = Math.min(
              1,
              this.circuit.pool(legs[leg], positive) / 40,
            );
            d.ctrl[a + 1] = Math.min(
              1,
              this.circuit.pool(legs[leg], negative) / 40,
            );
          }
        }
      }
    if (Math.floor(d.time / 0.01) > Math.floor((d.time - dt) / 0.01)) {
      this.contacts = contactMetrics(this.engine).feet;
      this.trace.push({
        time: d.time,
        signal: this.previous,
        phase: this.phase,
        x,
        y,
        contacts: this.contacts.filter(Boolean).length,
      });
      if (this.trace.length > 3000) this.trace.shift();
    }
  }
  observation() {
    const contact = contactMetrics(this.engine);
    this.contacts = contact.feet;
    return {
      contact,
      surface: surfaceBounds(this.engine),
      adhesionCommands: Array.from(this.engine.data.ctrl.slice(84)),
      time: this.engine.data.time,
      up: this.engine.data.xmat[this.body * 9 + 8],
      physicalContacts: this.engine.data.ncon,
      position: Array.from(this.engine.data.qpos.slice(0, 3)),
      qpos: Array.from(this.engine.data.qpos),
      qvel: Array.from(this.engine.data.qvel),
      rates: Array.from(this.circuit.rates),
      muscleActivation: Array.from(this.engine.data.act),
      contacts: this.contacts.slice(),
      odor: this.odor.slice(),
      aversion: this.aversion.slice(),
      energyProxy: this.energy,
      reward: this.reward,
      foodContact: this.foodContact,
      travel: this.travel,
      neuralCycles: this.cycles,
      bridge: this.bridge,
      sensory: this.sensory,
      passive: this.passive,
      silencedIds: [...this.circuit.silenced].map(
        (i) => this.circuit.wiring.nodes[i].id,
      ),
    };
  }
  export() {
    return {
      schema: 3,
      scope:
        "Experimental neural-timing / muscle-group terrarium; not a reconstructed whole fly",
      model: this.engine.manifest,
      network: this.circuit.wiring,
      environment: this.sources,
      processedStepSource: this.steps.sourceSha256,
      parameters: {
        drive: this.circuit.drive,
        jointKp: this.jointKp,
        jointKd: this.jointKd,
        stepShape: "NMF v2 processed single step",
        interLegPhases: [0, 0.5, 0, 0.5, 0, 0.5],
        adhesionGain: 40,
        muscleRateScale: 40,
      },
      observation: this.observation(),
      trace: this.trace,
    };
  }
}
