import type { AppState } from "../types";
import { SEED_STATE } from "../data/seed";

const KEY = "pft-v2";

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return SEED_STATE;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      ...SEED_STATE,
      ...parsed,
      accounts: parsed.accounts ?? SEED_STATE.accounts,
      lots: parsed.lots ?? SEED_STATE.lots,
      recurringExpenses: parsed.recurringExpenses ?? SEED_STATE.recurringExpenses,
      oneOffExpenses: parsed.oneOffExpenses ?? SEED_STATE.oneOffExpenses,
      creditCardBills: parsed.creditCardBills ?? SEED_STATE.creditCardBills,
      plannedSells: parsed.plannedSells ?? SEED_STATE.plannedSells,
    };
  } catch {
    return SEED_STATE;
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}
