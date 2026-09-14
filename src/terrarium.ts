import type { FlyEngine } from "./engine";
import { RateCircuit, type Wiring } from "./circuit.ts";

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
  readonly sources: Stimulus[] = [
    {
      id: "yeast",
      kind: "food",
      x: 4,
      y: 1.5,
      radius: 0.65,
      strength: 1,
      enabled: true,
    },
    {
      id: "geosmin",
      kind: "repellent",
      x: 2,
      y: -3,
      radius: 0.65,
      strength: 1,
      enabled: true,
    },
    {
      id: "water",
      kind: "water",
      x: -3,
      y: -2,
      radius: 0.5,
      strength: 1,
      enabled: true,
    },
  ];
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
  private footIds: number[];
  private inverseJac: number[][][] = [];
  private bases = [
    [0.7, 1.2, -1.77],
    [-0.55, 1.6, -1.77],
    [-1.8, 1.4, -1.77],
    [0.7, -1.2, -1.77],
    [-0.55, -1.6, -1.77],
    [-1.8, -1.4, -1.77],
  ];
  constructor(engine: FlyEngine, wiring: Wiring) {
    this.engine = engine;
    this.circuit = new RateCircuit(wiring);
    // A named observed LF premotor cell provides timing to the experimental bridge.
    this.rhythmIndex = wiring.nodes.findIndex((n) => n.id === "11751");
    if (this.rhythmIndex < 0) throw new Error("MANC LF E2 identity missing");
    const mj = engine.mujoco;
    this.body = mj.mj_name2id(
      engine.model,
      mj.mjtObj.mjOBJ_BODY.value,
      "Thorax",
    );
    this.footIds = legs.map((l) =>
      mj.mj_name2id(engine.model, mj.mjtObj.mjOBJ_SITE.value, l + "_foot_site"),
    );
    const d = engine.data;
    this.inverseJac = this.footIds.map((sid, i) => {
      const cols = Array.from({ length: 3 }, (_, j) => {
        const a = (1 + i * 3 + j) * 3,
          dx = d.site_xpos[3 * sid] - d.xanchor[a],
          dy = d.site_xpos[3 * sid + 1] - d.xanchor[a + 1],
          dz = d.site_xpos[3 * sid + 2] - d.xanchor[a + 2];
        return [
          d.xaxis[a + 1] * dz - d.xaxis[a + 2] * dy,
          d.xaxis[a + 2] * dx - d.xaxis[a] * dz,
          d.xaxis[a] * dy - d.xaxis[a + 1] * dx,
        ];
      });
      const cross = (u: number[], v: number[]) => [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
      ];
      const first = cross(cols[1], cols[2]),
        det = first.reduce((s, v, k) => s + v * cols[0][k], 0);
      if (Math.abs(det) < 1e-8)
        throw new Error("Neutral leg Jacobian is singular");
      return [first, cross(cols[2], cols[0]), cross(cols[0], cols[1])].map(
        (row) => row.map((v) => v / det),
      );
    });
    engine.beforeStep = (dt) => this.step(dt);
    engine.selected = 4;
    engine.speed = 0.25;
  }
  reset() {
    this.engine.reset();
    this.circuit.reset();
    this.phase = 0;
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
    for (const k of ["x", "y", "strength"] as const)
      if (patch[k] !== undefined && !Number.isFinite(patch[k]))
        throw new Error("Stimuli must be finite");
    if (patch.x !== undefined) source.x = Math.max(-10, Math.min(10, patch.x));
    if (patch.y !== undefined) source.y = Math.max(-10, Math.min(10, patch.y));
    if (patch.strength !== undefined)
      source.strength = Math.max(0, Math.min(5, patch.strength));
    if (patch.enabled !== undefined) source.enabled = Boolean(patch.enabled);
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
          -0.65,
          Math.min(
            0.65,
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
    if (this.passive) d.ctrl.fill(0);
    for (let i = 0; i < 6; i++) {
      const sid = this.footIds[i],
        foot = Array.from(d.site_xpos.slice(3 * sid, 3 * sid + 3)) as number[];
      this.contacts[i] = foot[2] < 0.08;
      if (this.passive) continue;
      if (!this.bridge) {
        const modules = [
          "coxa stance",
          "coxa swing",
          "femur/tr flex",
          "femur/tr extend",
          "tibia extend",
          "tibia flex",
        ];
        for (let j = 0; j < 6; j++)
          d.ctrl[i * 6 + j] = Math.min(
            1,
            this.circuit.pool(legs[i], modules[j]) / 40,
          );
        continue;
      }
      const target = this.bases[i].slice(),
        p = (this.phase + ([0, 2, 4].includes(i) ? 0 : 0.5)) % 1;
      const stride = 0.4 * (1 + (i < 3 ? -steering : steering));
      if (alive) {
        if (p < 0.6) target[0] += stride * (0.5 - p / 0.6);
        else {
          target[0] += stride * (-0.5 + (p - 0.6) / 0.4);
          target[2] += 0.3 * Math.sin((Math.PI * (p - 0.6)) / 0.4);
        }
      }
      const delta = target.map((v, k) => v - this.bases[i][k]);
      const desiredQ = this.inverseJac[i].map(
        (row, j) =>
          this.engine.manifest.initialQpos![7 + i * 3 + j] +
          row.reduce((a, v, k) => a + v * delta[k], 0),
      );
      for (let j = 0; j < 3; j++) {
        const torque =
            50 * (desiredQ[j] - d.qpos[7 + i * 3 + j]) -
            0.12 * d.qvel[6 + i * 3 + j],
          u = Math.max(-0.95, Math.min(0.95, torque / 9)),
          a = i * 6 + j * 2;
        // H-posture is an explicit experimental recruitment path beside observed MN drive.
        const module =
          j === 0 ? "coxa stance" : j === 1 ? "femur/tr flex" : "tibia extend";
        const observed = Math.min(
          0.04,
          this.circuit.pool(legs[i], module) / 200,
        );
        d.ctrl[a] = Math.min(1, Math.max(u, 0) + 0.015 + observed);
        d.ctrl[a + 1] = Math.max(-u, 0) + 0.015;
      }
    }
    if (Math.floor(d.time / 0.01) > Math.floor((d.time - dt) / 0.01)) {
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
    return {
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
      schema: 2,
      scope:
        "Experimental neural-timing / muscle-group terrarium; not a reconstructed whole fly",
      model: this.engine.manifest,
      network: this.circuit.wiring,
      environment: this.sources,
      parameters: {
        drive: this.circuit.drive,
        jointKp: 50,
        jointKd: 0.12,
        stride: 0.4,
        lift: 0.3,
        stanceFraction: 0.6,
        muscleRateScale: 40,
      },
      observation: this.observation(),
      trace: this.trace,
    };
  }
}
