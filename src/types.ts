export interface Account {
  id: string;
  name: string;
  institution: string;
  type: "checking" | "savings" | "brokerage" | "liability";
  balance: number;
  costBasis?: number;
}

export interface StockLot {
  id: string;
  ticker: string;
  shares: number;
  costBasis: number;
  purchaseDate: string;
  currentPrice?: number;
  momentum30d?: number;
  momentum90d?: number;
  institution?: string;
  excludeFromSelling?: boolean;
}

export type FilingStatus = "single" | "married_joint";

export type CardKey = "amex" | "chase" | "bofa";
export const CARD_DUE_DAY: Record<CardKey, number> = { amex: 16, chase: 20, bofa: 15 };
export const CARD_LABEL: Record<CardKey, string> = { amex: "Amex", chase: "Chase", bofa: "BOFA" };
export const ALL_CARDS: CardKey[] = ["amex", "chase", "bofa"];

export interface RecurringExpense {
  id: string;
  label: string;
  amount: number;
  daysOfMonth: number[];
  startMonth?: string;
  endMonth?: string;
}

export interface OneOffExpense {
  id: string;
  label: string;
  amount: number;
  date: string;
}

export interface CreditCardBill {
  id: string;
  card: CardKey;
  amount: number;
  month: string;
}

export interface PlannedSell {
  id: string;
  lotId: string;
  shares: number;
  targetMonth: string;
  estProceeds: number;
  estTax: number;
  isRecommendation: boolean;
}

export type IncomeMode = "annual" | "hourly";

export interface AppState {
  accounts: Account[];
  lots: StockLot[];
  recurringExpenses: RecurringExpense[];
  oneOffExpenses: OneOffExpense[];
  creditCardBills: CreditCardBill[];
  plannedSells: PlannedSell[];
  jobStartDate: string;
  incomeMode: IncomeMode;
  annualIncome: number;
  hourlyRate: number;
  hoursPerWeek: number;
  weeksPerYear: number;
  filingStatus: FilingStatus;
  minimumCashBuffer: number;
}

export function grossAnnualIncome(state: Pick<AppState, "incomeMode" | "annualIncome" | "hourlyRate" | "hoursPerWeek" | "weeksPerYear">): number {
  if (state.incomeMode === "hourly") {
    return state.hourlyRate * state.hoursPerWeek * state.weeksPerYear;
  }
  return state.annualIncome;
}
