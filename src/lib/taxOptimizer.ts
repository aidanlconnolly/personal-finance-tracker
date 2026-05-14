import type { StockLot, FilingStatus } from "../types";
import { combinedMomentumScore } from "./momentum";

export const PA_RATE = 0.0307;
export const MOMENTUM_WEIGHT = 0.5;
export const OVERPULL_RATIO = 1.10;

const LTCG_BRACKETS_SINGLE = [
  { upTo: 48350, rate: 0.0 },
  { upTo: 533400, rate: 0.15 },
  { upTo: Infinity, rate: 0.2 },
];
const LTCG_BRACKETS_MFJ = [
  { upTo: 96700, rate: 0.0 },
  { upTo: 600050, rate: 0.15 },
  { upTo: Infinity, rate: 0.2 },
];
const ORDINARY_BRACKETS_SINGLE = [
  { upTo: 11925, rate: 0.1 },
  { upTo: 48475, rate: 0.12 },
  { upTo: 103350, rate: 0.22 },
  { upTo: 197300, rate: 0.24 },
  { upTo: 250525, rate: 0.32 },
  { upTo: 626350, rate: 0.35 },
  { upTo: Infinity, rate: 0.37 },
];
const ORDINARY_BRACKETS_MFJ = [
  { upTo: 23850, rate: 0.1 },
  { upTo: 96950, rate: 0.12 },
  { upTo: 206700, rate: 0.22 },
  { upTo: 394600, rate: 0.24 },
  { upTo: 501050, rate: 0.32 },
  { upTo: 751600, rate: 0.35 },
  { upTo: Infinity, rate: 0.37 },
];

function marginalRate(income: number, brackets: { upTo: number; rate: number }[]): number {
  for (const b of brackets) if (income <= b.upTo) return b.rate;
  return brackets[brackets.length - 1].rate;
}

// As-of-month string "YYYY-MM" — use end of month as the comparison point so a
// lot that crosses 1-year mid-projection becomes long-term at the right time.
export function isLongTermAt(purchaseDate: string, asOfMonth: string): boolean {
  const [y, m] = asOfMonth.split("-").map(Number);
  const asOf = new Date(y, m, 0).getTime();
  const held = asOf - new Date(purchaseDate).getTime();
  return held > 365.25 * 24 * 3600 * 1000;
}

export interface LotPick {
  lotId: string;
  ticker: string;
  shares: number;
  proceeds: number;
  gain: number;
  isLongTerm: boolean;
  federalRate: number;
  paRate: number;
  estimatedTax: number;
  netAfterTax: number;
}

interface EligibleLot {
  lot: StockLot;
  remainingShares: number;
  lt: boolean;
  price: number;
  perShareGain: number;
  fedRate: number;
  efficiency: number;
  momentumScore: number;
  score: number;
}

function buildEligible(
  lots: StockLot[],
  alreadySold: Record<string, number>,
  annualIncome: number,
  filingStatus: FilingStatus,
  asOfMonth: string
): EligibleLot[] {
  const ltcgBrackets = filingStatus === "single" ? LTCG_BRACKETS_SINGLE : LTCG_BRACKETS_MFJ;
  const stBrackets = filingStatus === "single" ? ORDINARY_BRACKETS_SINGLE : ORDINARY_BRACKETS_MFJ;

  return lots
    .filter((l) => l.currentPrice !== undefined && l.currentPrice > 0)
    .map((lot) => {
      const sold = alreadySold[lot.id] ?? 0;
      const remainingShares = Math.max(0, lot.shares - sold);
      const price = lot.currentPrice!;
      const lt = isLongTermAt(lot.purchaseDate, asOfMonth);
      const fedRate = lt ? marginalRate(annualIncome, ltcgBrackets) : marginalRate(annualIncome, stBrackets);
      const perShareGain = price - lot.costBasis;
      const taxablePerShare = Math.max(0, perShareGain);
      const taxPerShare = taxablePerShare * (fedRate + PA_RATE);
      const netPerShare = price - taxPerShare;
      const efficiency = price > 0 ? netPerShare / price : 0;
      const momentumScore = combinedMomentumScore(lot.momentum30d, lot.momentum90d);
      const score = efficiency * (1 + MOMENTUM_WEIGHT * momentumScore);
      return { lot, remainingShares, lt, price, perShareGain, fedRate, efficiency, momentumScore, score };
    })
    .filter((e) => e.remainingShares > 0);
}

export function pickLotsForMonth(
  lots: StockLot[],
  alreadySold: Record<string, number>,
  targetCash: number,
  annualIncome: number,
  filingStatus: FilingStatus,
  asOfMonth: string
): LotPick[] {
  if (targetCash <= 0) return [];
  const eligible = buildEligible(lots, alreadySold, annualIncome, filingStatus, asOfMonth);

  eligible.sort((a, b) => {
    const aLoss = a.perShareGain < 0;
    const bLoss = b.perShareGain < 0;
    if (aLoss && !bLoss) return -1;
    if (!aLoss && bLoss) return 1;
    if (aLoss && bLoss) return a.perShareGain - b.perShareGain;
    return b.score - a.score;
  });

  const picks: LotPick[] = [];
  let remaining = targetCash;
  for (const e of eligible) {
    if (remaining <= 0) break;
    const needShares = Math.ceil(remaining / e.price);
    const sharesToSell = Math.min(e.remainingShares, needShares);
    if (sharesToSell <= 0) continue;
    const proceeds = sharesToSell * e.price;
    const gain = sharesToSell * e.perShareGain;
    const taxableGain = Math.max(0, gain);
    const estimatedTax = taxableGain * (e.fedRate + PA_RATE);
    picks.push({
      lotId: e.lot.id,
      ticker: e.lot.ticker,
      shares: sharesToSell,
      proceeds,
      gain,
      isLongTerm: e.lt,
      federalRate: e.fedRate,
      paRate: PA_RATE,
      estimatedTax,
      netAfterTax: proceeds - estimatedTax,
    });
    remaining -= proceeds - estimatedTax;
  }
  return picks;
}
