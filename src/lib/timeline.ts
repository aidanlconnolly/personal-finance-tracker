import type { AppState, PlannedSell } from "../types";
import { CARD_DUE_DAY, CARD_LABEL, grossAnnualIncome } from "../types";
import { pickLotsForMonth, OVERPULL_RATIO } from "./taxOptimizer";

export const HORIZON_MONTHS = 24;

export type TimelineEventKind = "recurring" | "oneoff" | "creditcard" | "income" | "sell";

export interface TimelineEvent {
  id: string;
  kind: TimelineEventKind;
  date: string;
  label: string;
  amount: number;
  lotId?: string;
  recommendationId?: string;
}

export interface MonthBucket {
  month: string;
  startingCash: number;
  events: TimelineEvent[];
  endingCash: number;
  belowBuffer: boolean;
  shortfall: number;
}

export interface Projection {
  months: MonthBucket[];
  recommendedSells: PlannedSell[];
  momentumAvailable: boolean;
}

function ymKey(y: number, m: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

function dateStr(y: number, m: number, d: number): string {
  const day = Math.min(d, daysInMonth(y, m));
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function ymToParts(month: string): { y: number; m: number } {
  const [y, m] = month.split("-").map(Number);
  return { y, m: m - 1 };
}

function ymCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function liquidCash(state: AppState): number {
  return state.accounts
    .filter((a) => a.type === "checking" || a.type === "savings")
    .reduce((s, a) => s + a.balance, 0);
}

function monthlyIncomeAfterTax(state: AppState): number {
  return (grossAnnualIncome(state) * 0.72) / 12;
}

export function buildHorizonMonths(today: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = 0; i < HORIZON_MONTHS; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    out.push(ymKey(d.getFullYear(), d.getMonth()));
  }
  return out;
}

export function buildEvents(state: AppState, today: Date = new Date()): TimelineEvent[] {
  const months = buildHorizonMonths(today);
  const firstMonth = months[0];
  const lastMonth = months[months.length - 1];
  const events: TimelineEvent[] = [];

  for (const month of months) {
    const { y, m } = ymToParts(month);

    for (const r of state.recurringExpenses) {
      if (r.startMonth && ymCompare(month, r.startMonth) < 0) continue;
      if (r.endMonth && ymCompare(month, r.endMonth) > 0) continue;
      const days = r.daysOfMonth.length > 0 ? r.daysOfMonth : [1];
      for (const d of days) {
        events.push({
          id: `${r.id}-${month}-${d}`,
          kind: "recurring",
          date: dateStr(y, m, d),
          label: r.label,
          amount: -r.amount,
        });
      }
    }
  }

  for (const o of state.oneOffExpenses) {
    if (o.date < `${firstMonth}-01`) continue;
    const lastDay = (() => {
      const { y, m } = ymToParts(lastMonth);
      return `${lastMonth}-${String(daysInMonth(y, m)).padStart(2, "0")}`;
    })();
    if (o.date > lastDay) continue;
    events.push({
      id: o.id,
      kind: "oneoff",
      date: o.date,
      label: o.label,
      amount: -o.amount,
    });
  }

  for (const cc of state.creditCardBills) {
    if (!months.includes(cc.month)) continue;
    const { y, m } = ymToParts(cc.month);
    events.push({
      id: cc.id,
      kind: "creditcard",
      date: dateStr(y, m, CARD_DUE_DAY[cc.card]),
      label: `${CARD_LABEL[cc.card]} card payment`,
      amount: -cc.amount,
    });
  }

  const jobStart = state.jobStartDate;
  const grossAnnual = grossAnnualIncome(state);
  if (jobStart && grossAnnual > 0) {
    const incomePerMonth = monthlyIncomeAfterTax(state);
    const jobStartParts = ymToParts(jobStart.slice(0, 7));
    const jobStartDay = Number(jobStart.slice(8, 10));
    for (const month of months) {
      if (month < jobStart.slice(0, 7)) continue;
      const { y, m } = ymToParts(month);
      const day = month === jobStart.slice(0, 7) ? jobStartDay : jobStartParts.m === m && jobStartParts.y === y ? jobStartDay : Math.min(jobStartDay, daysInMonth(y, m));
      events.push({
        id: `income-${month}`,
        kind: "income",
        date: dateStr(y, m, day),
        label: "Paycheck (after tax)",
        amount: incomePerMonth,
      });
    }
  }

  for (const sell of state.plannedSells) {
    if (!months.includes(sell.targetMonth)) continue;
    const { y, m } = ymToParts(sell.targetMonth);
    events.push({
      id: sell.id,
      kind: "sell",
      date: dateStr(y, m, 1),
      label: `Sell ${sell.shares} sh`,
      amount: sell.estProceeds - sell.estTax,
      lotId: sell.lotId,
    });
  }

  return events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function bucketize(events: TimelineEvent[], months: string[]): Record<string, TimelineEvent[]> {
  const buckets: Record<string, TimelineEvent[]> = {};
  for (const month of months) buckets[month] = [];
  for (const e of events) {
    const month = e.date.slice(0, 7);
    if (buckets[month]) buckets[month].push(e);
  }
  return buckets;
}

export function project(
  state: AppState,
  events: TimelineEvent[],
  today: Date = new Date()
): MonthBucket[] {
  const months = buildHorizonMonths(today);
  const bucketed = bucketize(events, months);
  let cash = liquidCash(state);
  const out: MonthBucket[] = [];
  for (const month of months) {
    const startingCash = cash;
    const monthEvents = bucketed[month].sort((a, b) => (a.date < b.date ? -1 : 1));
    let ending = startingCash;
    for (const e of monthEvents) ending += e.amount;
    const shortfall = Math.max(0, state.minimumCashBuffer - ending);
    out.push({
      month,
      startingCash,
      events: monthEvents,
      endingCash: ending,
      belowBuffer: ending < state.minimumCashBuffer,
      shortfall,
    });
    cash = ending;
  }
  return out;
}

export function scheduleSells(
  state: AppState,
  today: Date = new Date()
): Projection {
  const baseEvents = buildEvents(state, today);
  const months = buildHorizonMonths(today);
  const buckets = bucketize(baseEvents, months);

  const alreadySold: Record<string, number> = {};
  for (const p of state.plannedSells) {
    alreadySold[p.lotId] = (alreadySold[p.lotId] ?? 0) + p.shares;
  }

  const recs: PlannedSell[] = [];
  const synthetic: TimelineEvent[] = [];
  let cash = liquidCash(state);
  const annual = grossAnnualIncome(state);
  const sellableLots = state.lots.filter((l) => !l.excludeFromSelling);

  for (let i = 0; i < months.length; i++) {
    const month = months[i];
    let ending = cash;
    for (const e of buckets[month]) ending += e.amount;
    if (ending >= state.minimumCashBuffer) {
      cash = ending;
      continue;
    }
    const shortfall = state.minimumCashBuffer - ending;
    const target = shortfall * OVERPULL_RATIO;
    const picks = pickLotsForMonth(
      sellableLots,
      alreadySold,
      target,
      annual,
      state.filingStatus,
      month
    );
    for (const p of picks) {
      const recId = `rec-${month}-${p.lotId}-${recs.length}`;
      const rec: PlannedSell = {
        id: recId,
        lotId: p.lotId,
        shares: p.shares,
        targetMonth: month,
        estProceeds: p.proceeds,
        estTax: p.estimatedTax,
        isRecommendation: true,
      };
      recs.push(rec);
      alreadySold[p.lotId] = (alreadySold[p.lotId] ?? 0) + p.shares;
      const { y, m } = ymToParts(month);
      const synthEvent: TimelineEvent = {
        id: recId,
        kind: "sell",
        date: dateStr(y, m, 1),
        label: `Recommended: sell ${p.shares} ${p.ticker} (${p.isLongTerm ? "LT" : "ST"})`,
        amount: p.proceeds - p.estimatedTax,
        lotId: p.lotId,
        recommendationId: recId,
      };
      synthetic.push(synthEvent);
      buckets[month].push(synthEvent);
      ending += synthEvent.amount;
    }
    cash = ending;
  }

  const allEvents = [...baseEvents, ...synthetic].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  );
  const finalMonths = project(state, allEvents, today);

  const momentumAvailable = state.lots.some(
    (l) => typeof l.momentum30d === "number" || typeof l.momentum90d === "number"
  );

  return { months: finalMonths, recommendedSells: recs, momentumAvailable };
}
