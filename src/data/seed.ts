import type { AppState } from "../types";

const today = new Date();
const ym = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, "0")}`;
const thisMonth = ym(today.getFullYear(), today.getMonth());
const monthsFromNow = (n: number) => {
  const d = new Date(today.getFullYear(), today.getMonth() + n, 1);
  return ym(d.getFullYear(), d.getMonth());
};
const dateFromNow = (months: number, day: number) => {
  const d = new Date(today.getFullYear(), today.getMonth() + months, day);
  return d.toISOString().slice(0, 10);
};

export const SEED_STATE: AppState = {
  accounts: [
    {
      id: "marcus-1",
      name: "High-Yield Savings",
      institution: "Marcus by Goldman Sachs",
      type: "savings",
      balance: 47200,
    },
    {
      id: "bofa-1",
      name: "Checking",
      institution: "Bank of America",
      type: "checking",
      balance: 8400,
    },
    {
      id: "sofi-1",
      name: "Brokerage",
      institution: "SoFi",
      type: "brokerage",
      balance: 31500,
      costBasis: 22000,
    },
    {
      id: "vanguard-1",
      name: "Vanguard (excluded from calcs)",
      institution: "Vanguard",
      type: "brokerage",
      balance: 65000,
      costBasis: 48000,
    },
  ],
  lots: [
    { id: "lot-aapl-1", ticker: "AAPL", shares: 25, costBasis: 142.5, purchaseDate: "2023-03-15", currentPrice: 211.0, institution: "SoFi" },
    { id: "lot-aapl-2", ticker: "AAPL", shares: 10, costBasis: 188.0, purchaseDate: "2024-11-02", currentPrice: 211.0, institution: "SoFi" },
    { id: "lot-nvda-1", ticker: "NVDA", shares: 8, costBasis: 118.0, purchaseDate: "2025-12-10", currentPrice: 135.0, institution: "SoFi" },
    { id: "lot-nvda-2", ticker: "NVDA", shares: 5, costBasis: 890.0, purchaseDate: "2023-06-01", currentPrice: 135.0, institution: "SoFi" },
    { id: "lot-vti-1", ticker: "VTI", shares: 40, costBasis: 198.0, purchaseDate: "2022-08-20", currentPrice: 268.0, institution: "SoFi" },
    { id: "lot-msft-1", ticker: "MSFT", shares: 15, costBasis: 310.0, purchaseDate: "2023-01-12", currentPrice: 452.0, institution: "SoFi" },
  ],
  recurringExpenses: [
    { id: "rec-rent", label: "Rent", amount: 2400, daysOfMonth: [1] },
    { id: "rec-groceries", label: "Groceries", amount: 350, daysOfMonth: [1, 14] },
    { id: "rec-utilities", label: "Utilities + internet", amount: 250, daysOfMonth: [1] },
  ],
  oneOffExpenses: [
    { id: "oo-wharton-1", label: "Wharton tuition (term 1)", amount: 42000, date: dateFromNow(6, 15) },
    { id: "oo-wharton-2", label: "Wharton tuition (term 2)", amount: 42000, date: dateFromNow(12, 15) },
  ],
  creditCardBills: [
    { id: "cc-amex-1", card: "amex", amount: 1800, month: thisMonth },
    { id: "cc-chase-1", card: "chase", amount: 950, month: thisMonth },
    { id: "cc-bofa-1", card: "bofa", amount: 450, month: thisMonth },
    { id: "cc-amex-2", card: "amex", amount: 1800, month: monthsFromNow(1) },
    { id: "cc-chase-2", card: "chase", amount: 950, month: monthsFromNow(1) },
    { id: "cc-bofa-2", card: "bofa", amount: 450, month: monthsFromNow(1) },
  ],
  plannedSells: [],
  jobStartDate: "2026-08-01",
  incomeMode: "annual",
  annualIncome: 120000,
  hourlyRate: 60,
  hoursPerWeek: 40,
  weeksPerYear: 52,
  filingStatus: "single",
  minimumCashBuffer: 15000,
};
