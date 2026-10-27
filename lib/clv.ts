/** Closing-line value in percentage points. Positive means the close moved their way. */
export function clvPp(entryProb: number, closeProb: number): number {
  return (closeProb - entryProb) * 100;
}

export function toBps(prob: number): number {
  return Math.round(prob * 10_000);
}

export function fromBps(bps: number): number {
  return bps / 10_000;
}

/** A graded object is accepted when its close is within 1.0 percentage point of Tatum. */
export function gradesAgree(objectCloseBps: number, tatumProb: number): boolean {
  return Math.abs(fromBps(objectCloseBps) - tatumProb) * 100 <= 1;
}

export function roundPp(value: number): number {
  return Math.round(value * 10) / 10;
}
