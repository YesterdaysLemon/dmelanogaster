/** Exact periodic cubic coefficients exported from the pinned FlyGym template. */
export interface RecordedSteps {
  qids: number[];
  vids: number[];
  joints: string[];
  coefficients: number[][][];
  knots: number[];
  neutral: number[];
  stanceStart: number[];
  sourceSha256: string;
}
export function sampleStep(data: RecordedSteps, joint: number, phase: number) {
  const p = ((phase % 1) + 1) % 1;
  const intervals = data.knots.length - 1;
  const k = Math.min(intervals - 1, Math.floor(p * intervals));
  const t = p - data.knots[k],
    c = data.coefficients;
  return {
    angle:
      ((c[0][k][joint] * t + c[1][k][joint]) * t + c[2][k][joint]) * t +
      c[3][k][joint],
    derivative:
      (3 * c[0][k][joint] * t + 2 * c[1][k][joint]) * t + c[2][k][joint],
  };
}
