import loadMujoco, {
  type MainModule,
  type MjModel,
  type MjData,
} from "@mujoco/mujoco";

export interface MotionRecording {
  version: number;
  frameCount: number;
  annotationHz: number;
  videoFps: number;
  duration: number;
  times: number[];
  sourceFrames: number[];
  legs: string[];
  markers: string[];
  jointNames: string[];
  qpos: number[][];
  rawCoordinates: number[][][];
  landmarks: number[][][];
  fittedLandmarks: number[][][];
  reducedQpos: number[][];
  reducedLandmarks: number[][][];
  ftiAngles: Record<string, number[]>;
  registration: {
    landmarkRmsMm: number;
    reducedRmsMm: number;
    maximumLandmarkErrorMm: number;
    errorByFrameMm: number[];
    errorByLegMm: Record<string, number>;
  };
}
export interface MotionManifest {
  files: { target: string; sha256: string }[];
  muscles: {
    id: string;
    index: number;
    joint: string;
    sign: number;
    sites: string[];
  }[];
  landmarks: string[];
  joints: { name: string; leg: string; kind: string; axis: string }[];
}
export interface MotionTrace {
  mode: "tracking" | "passive";
  dt: number;
  qpos: number[][];
  landmarks: number[][][];
  activation: number[][];
  forces: number[][];
  rmsAngleDeg: number;
  rmsMarkerMm: number;
  maxExcitation: number;
  externalForceMax: number;
}

/** A separate tethered assay. Recorded targets are explicitly supplied;
 * this is neither reconstructed neural control nor free walking. */
export class MotionBench {
  readonly data: MjData;
  readonly landmarkIds: number[];
  readonly muscleQ: number[];
  readonly muscleV: number[];
  readonly selected = 0;
  readonly mujoco: MainModule;
  readonly model: MjModel;
  readonly manifest: MotionManifest;
  readonly recording: MotionRecording;
  constructor(
    mujoco: MainModule,
    model: MjModel,
    manifest: MotionManifest,
    recording: MotionRecording,
  ) {
    this.mujoco = mujoco;
    this.model = model;
    this.manifest = manifest;
    this.recording = recording;
    this.data = new mujoco.MjData(model);
    const jointId = (name: string) =>
      mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT.value, name);
    this.muscleQ = manifest.muscles.map(
      (m) => model.jnt_qposadr[jointId(m.joint)],
    );
    this.muscleV = manifest.muscles.map(
      (m) => model.jnt_dofadr[jointId(m.joint)],
    );
    this.landmarkIds = manifest.landmarks.map((name) =>
      mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_SITE.value, name),
    );
    if (
      this.landmarkIds.some((i) => i < 0) ||
      model.nu !== 84 ||
      model.nq !== 42
    )
      throw Error("Motion anatomy roster mismatch");
    recording.jointNames.forEach((name, i) => {
      if (model.jnt_qposadr[jointId(name)] !== i)
        throw Error("Motion coordinate order mismatch");
    });
    this.pose(0);
  }
  points(): number[][] {
    return this.landmarkIds.map((i) =>
      Array.from(this.data.site_xpos.slice(i * 3, i * 3 + 3), Number),
    );
  }
  pose(frame: number, trace?: MotionTrace) {
    if (
      !Number.isInteger(frame) ||
      frame < 0 ||
      frame >= this.recording.frameCount
    )
      throw Error("Invalid motion frame");
    this.mujoco.mj_resetData(this.model, this.data);
    this.data.qpos.set((trace?.qpos || this.recording.qpos)[frame]);
    if (trace) this.data.act.set(trace.activation[frame]);
    this.mujoco.mj_forward(this.model, this.data);
  }
  /** Deterministic linear resampling: no mirroring, cycle closure or neural learning. */
  target(time: number) {
    const r = this.recording;
    const a = Math.max(0, Math.min(r.frameCount - 1, time * r.annotationHz));
    const i = Math.min(r.frameCount - 2, Math.floor(a)),
      w = a - i;
    return r.qpos[i].map((v, j) => v + (r.qpos[i + 1][j] - v) * w);
  }
  run(mode: "tracking" | "passive", dt = 0.0001): MotionTrace {
    this.model.opt.timestep = dt;
    this.pose(0);
    const result: MotionTrace = {
      mode,
      dt,
      qpos: [],
      landmarks: [],
      activation: [],
      forces: [],
      rmsAngleDeg: 0,
      rmsMarkerMm: 0,
      maxExcitation: 0,
      externalForceMax: 0,
    };
    let angleSq = 0,
      markerSq = 0;
    for (const time of this.recording.times) {
      while (this.data.time < time - dt * 0.5) {
        this.data.ctrl.fill(0);
        if (mode === "tracking") {
          const q = this.target(this.data.time),
            ahead = this.target(this.data.time + dt);
          for (let a = 0; a < this.manifest.muscles.length; a++) {
            const qi = this.muscleQ[a],
              vi = this.muscleV[a],
              sign = this.manifest.muscles[a].sign;
            const torque =
              50 * (q[qi] - this.data.qpos[qi]) +
              0.12 * ((ahead[qi] - q[qi]) / dt - this.data.qvel[vi]);
            const excitation = Math.min(0.95, Math.max(0, (sign * torque) / 9));
            this.data.ctrl[a] = excitation;
            result.maxExcitation = Math.max(result.maxExcitation, excitation);
          }
        }
        this.mujoco.mj_step(this.model, this.data);
        if (!Array.from(this.data.qpos).every(Number.isFinite))
          throw Error("Non-finite motion assay");
        for (const f of this.data.xfrc_applied)
          result.externalForceMax = Math.max(
            result.externalForceMax,
            Math.abs(f),
          );
      }
      this.mujoco.mj_forward(this.model, this.data);
      const f = result.qpos.length,
        points = this.points();
      result.qpos.push(Array.from(this.data.qpos));
      result.landmarks.push(points);
      result.activation.push(Array.from(this.data.act));
      result.forces.push(Array.from(this.data.actuator_force));
      this.recording.qpos[f].forEach((q, j) => {
        angleSq += (q - this.data.qpos[j]) ** 2;
      });
      points.forEach((p, i) => {
        for (let j = 0; j < 3; j++)
          markerSq += (p[j] - this.recording.fittedLandmarks[f][i][j]) ** 2;
      });
    }
    result.rmsAngleDeg =
      (Math.sqrt(angleSq / (this.recording.frameCount * 42)) * 180) / Math.PI;
    result.rmsMarkerMm = Math.sqrt(markerSq / (this.recording.frameCount * 30));
    return result;
  }
}
export async function createMotionBench(
  manifest: MotionManifest,
  recording: MotionRecording,
  read: (path: string) => Promise<Uint8Array>,
  wasmBinary?: Uint8Array,
) {
  const mj = await loadMujoco(wasmBinary ? { wasmBinary } : {});
  mj.FS.mkdir("/motion");
  mj.FS.mkdir("/motion/meshes");
  await Promise.all(
    manifest.files.map(async (f) =>
      mj.FS.writeFile("/motion/" + f.target, await read(f.target)),
    ),
  );
  return new MotionBench(
    mj,
    mj.MjModel.from_xml_path("/motion/motion.xml"),
    manifest,
    recording,
  );
}
