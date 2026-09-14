/** Independent implementation of the half-tanh rate model described by Pugliese et al.
 * Anatomical counts, predicted transmitter signs, and assumed cellular gains are separate.
 * These are model firing rates, not measured spikes, voltages, or a learned policy.
 */
export interface Neuron {
  id: string;
  name: string;
  role: string;
  leg: string | null;
  size: number;
  nt: string;
  ntProbability: number | null;
  module: string | null;
  step: string | null;
}
export interface Edge {
  pre: number;
  post: number;
  count: number;
  sign: number;
  evidence: string;
  signEvidence: string;
}
export interface Wiring {
  version: number;
  nodes: Neuron[];
  edges: Edge[];
  parameters: {
    tau: number;
    gain: number;
    threshold: number;
    cap: number;
    synapticGain: number;
    sizeReference: number;
  };
  [key: string]: unknown;
}
export class RateCircuit {
  readonly rates: Float64Array;
  readonly input: Float64Array;
  readonly silenced = new Set<number>();
  readonly edges: Edge[];
  time = 0;
  drive = 250;
  private work: Float64Array[];
  readonly wiring: Wiring;
  private gains: Float64Array;
  private thresholds: Float64Array;
  constructor(wiring: Wiring, edges = wiring.edges) {
    this.wiring = wiring;
    const n = wiring.nodes.length;
    this.rates = new Float64Array(n);
    this.input = new Float64Array(n);
    this.edges = edges;
    this.work = Array.from({ length: 6 }, () => new Float64Array(n));
    const p = wiring.parameters;
    this.gains = Float64Array.from(
      wiring.nodes,
      (n) => p.gain / (((n.size || p.sizeReference) / p.sizeReference) * p.cap),
    );
    this.thresholds = Float64Array.from(
      wiring.nodes,
      (n) => p.threshold * ((n.size || p.sizeReference) / p.sizeReference),
    );
  }
  reset() {
    this.rates.fill(0);
    this.time = 0;
    this.input.fill(0);
  }
  private derivative(r: Float64Array, out: Float64Array) {
    const p = this.wiring.parameters,
      total = this.work[5];
    total.set(this.input);
    this.wiring.nodes.forEach((n, i) => {
      if (n.role === "descending") total[i] += this.drive;
    });
    for (const e of this.edges)
      total[e.post] += p.synapticGain * e.sign * e.count * r[e.pre];
    this.wiring.nodes.forEach((n, i) => {
      out[i] = this.silenced.has(i)
        ? -r[i] / p.tau
        : (Math.max(
            0,
            p.cap * Math.tanh(this.gains[i] * (total[i] - this.thresholds[i])),
          ) -
            r[i]) /
          p.tau;
    });
  }
  step(dt: number) {
    if (!(dt > 0 && dt <= 0.001))
      throw new Error("Circuit timestep must be in (0, 1 ms]");
    const [a, b, c, d, tmp] = this.work,
      r = this.rates;
    for (const i of this.silenced) r[i] = 0;
    this.derivative(r, a);
    for (let i = 0; i < r.length; i++) tmp[i] = r[i] + (dt * a[i]) / 2;
    this.derivative(tmp, b);
    for (let i = 0; i < r.length; i++) tmp[i] = r[i] + (dt * b[i]) / 2;
    this.derivative(tmp, c);
    for (let i = 0; i < r.length; i++) tmp[i] = r[i] + dt * c[i];
    this.derivative(tmp, d);
    for (let i = 0; i < r.length; i++)
      r[i] = this.silenced.has(i)
        ? 0
        : Math.max(0, r[i] + (dt * (a[i] + 2 * b[i] + 2 * c[i] + d[i])) / 6);
    this.time += dt;
  }
  pool(leg: string, module: string) {
    let sum = 0,
      n = 0;
    this.wiring.nodes.forEach((cell, i) => {
      if (cell.leg === leg && cell.module === module) {
        sum += this.rates[i];
        n++;
      }
    });
    return n ? sum / n : 0;
  }
}
