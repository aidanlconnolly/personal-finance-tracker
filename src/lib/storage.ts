import type { AppState, RecurringExpense } from "../types";
import { SEED_STATE } from "../data/seed";

const KEY = "pft-v2";

type LegacyRecurring = RecurringExpense & { dayOfMonth?: number };

function migrateRecurring(items: LegacyRecurring[] | undefined): RecurringExpense[] {
  if (!Array.isArray(items)) return SEED_STATE.recurringExpenses;
  return items.map((it) => {
    if (Array.isArray(it.daysOfMonth)) return it as RecurringExpense;
    if (typeof it.dayOfMonth === "number") {
      const { dayOfMonth, ...rest } = it;
      return { ...rest, daysOfMonth: [dayOfMonth] };
    }
    return { ...it, daysOfMonth: [1] };
  });
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return SEED_STATE;
    const parsed = JSON.parse(raw) as Partial<AppState> & { recurringExpenses?: LegacyRecurring[] };
    return {
      ...SEED_STATE,
      ...parsed,
      accounts: parsed.accounts ?? SEED_STATE.accounts,
      lots: parsed.lots ?? SEED_STATE.lots,
      recurringExpenses: migrateRecurring(parsed.recurringExpenses),
      oneOffExpenses: parsed.oneOffExpenses ?? SEED_STATE.oneOffExpenses,
      creditCardBills: parsed.creditCardBills ?? SEED_STATE.creditCardBills,
      plannedSells: parsed.plannedSells ?? SEED_STATE.plannedSells,
      incomeMode: parsed.incomeMode ?? SEED_STATE.incomeMode,
      hourlyRate: parsed.hourlyRate ?? SEED_STATE.hourlyRate,
      hoursPerWeek: parsed.hoursPerWeek ?? SEED_STATE.hoursPerWeek,
      weeksPerYear: parsed.weeksPerYear ?? SEED_STATE.weeksPerYear,
    };
  } catch {
    return SEED_STATE;
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}
