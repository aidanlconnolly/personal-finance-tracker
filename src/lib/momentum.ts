export function momentumReturn(closes: number[], days: number): number | undefined {
  if (closes.length < days + 1) return undefined;
  const last = closes[closes.length - 1];
  const past = closes[closes.length - 1 - days];
  if (!isFinite(last) || !isFinite(past) || past === 0) return undefined;
  return (last - past) / past;
}

export function combinedMomentumScore(r30?: number, r90?: number): number {
  const values: number[] = [];
  if (typeof r30 === "number" && isFinite(r30)) values.push(r30);
  if (typeof r90 === "number" && isFinite(r90)) values.push(r90);
  if (values.length === 0) return 0;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.max(-0.5, Math.min(0.5, avg));
}
