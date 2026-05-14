export interface Account {
  id: string;
  name: string;
  institution: string;
  type: "checking" | "savings" | "brokerage" | "liability";
  balance: number;
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
}

export type FilingStatus = "single" | "married_joint";

export type CardKey = "amex" | "chase";
export const CARD_DUE_DAY: Record<CardKey, number> = { amex: 16, chase: 20 };
export const CARD_LABEL: Record<CardKey, string> = { amex: "Amex", chase: "Chase" };

export interface RecurringExpense {
  id: string;
  label: string;
  amount: number;
  dayOfMonth: number;
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

export interface AppState {
  accounts: Account[];
  lots: StockLot[];
  recurringExpenses: RecurringExpense[];
  oneOffExpenses: OneOffExpense[];
  creditCardBills: CreditCardBill[];
  plannedSells: PlannedSell[];
  jobStartDate: string;
  annualIncome: number;
  filingStatus: FilingStatus;
  minimumCashBuffer: number;
}
