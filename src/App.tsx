import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  AppState,
  Account,
  StockLot,
  RecurringExpense,
  OneOffExpense,
  CreditCardBill,
  PlannedSell,
} from "./types";
import { loadState, saveState } from "./lib/storage";
import { fetchPrices, fetchHistories } from "./lib/yahoo";
import { momentumReturn } from "./lib/momentum";
import { scheduleSells } from "./lib/timeline";
import NetWorthCard from "./components/NetWorthCard";
import AccountBalances from "./components/AccountBalances";
import StockHoldings from "./components/StockHoldings";
import CashTimeline from "./components/CashTimeline";
import RecurringExpensesEditor from "./components/RecurringExpensesEditor";
import OneOffExpensesEditor from "./components/OneOffExpensesEditor";
import CreditCardBillsEditor from "./components/CreditCardBillsEditor";
import IncomeAndBufferEditor from "./components/IncomeAndBufferEditor";

type Tab = "timeline" | "setup";

export default function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [tab, setTab] = useState<Tab>("timeline");
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const update = useCallback((patch: Partial<AppState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const updateAccount = useCallback((id: string, balance: number) => {
    setState((s) => ({
      ...s,
      accounts: s.accounts.map((a) => (a.id === id ? { ...a, balance } : a)),
    }));
  }, []);

  const updateAccounts = useCallback((accounts: Account[]) => {
    setState((s) => ({ ...s, accounts }));
  }, []);

  const updateLots = useCallback((lots: StockLot[]) => {
    setState((s) => ({ ...s, lots }));
  }, []);

  const updateRecurring = useCallback((recurringExpenses: RecurringExpense[]) => {
    setState((s) => ({ ...s, recurringExpenses }));
  }, []);

  const updateOneOffs = useCallback((oneOffExpenses: OneOffExpense[]) => {
    setState((s) => ({ ...s, oneOffExpenses }));
  }, []);

  const updateCreditCards = useCallback((creditCardBills: CreditCardBill[]) => {
    setState((s) => ({ ...s, creditCardBills }));
  }, []);

  const refreshPrices = useCallback(async () => {
    setPriceLoading(true);
    setPriceError(null);
    try {
      const tickers = [...new Set(state.lots.map((l) => l.ticker))];
      const [prices, histories] = await Promise.all([
        fetchPrices(tickers),
        fetchHistories(tickers),
      ]);
      const updated = state.lots.map((l) => {
        const hist = histories[l.ticker];
        const m30 = hist ? momentumReturn(hist.closes, 21) : undefined;
        const m90 = hist ? momentumReturn(hist.closes, 63) : undefined;
        return {
          ...l,
          currentPrice: prices[l.ticker] ?? l.currentPrice,
          momentum30d: m30 ?? l.momentum30d,
          momentum90d: m90 ?? l.momentum90d,
        };
      });
      updateLots(updated);
      const fetched = Object.keys(prices).length;
      const histFetched = Object.keys(histories).length;
      if (fetched < tickers.length || histFetched < tickers.length) {
        setPriceError(
          `Fetched ${fetched}/${tickers.length} prices, ${histFetched}/${tickers.length} histories. Some blocked by CORS — kept last values.`
        );
      }
    } catch {
      setPriceError(
        "Could not fetch prices (CORS may block direct Yahoo calls). Update prices manually."
      );
    } finally {
      setPriceLoading(false);
    }
  }, [state.lots, updateLots]);

  const acceptSell = useCallback((rec: PlannedSell) => {
    setState((s) => ({
      ...s,
      plannedSells: [
        ...s.plannedSells,
        {
          id: `planned-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
          lotId: rec.lotId,
          shares: rec.shares,
          targetMonth: rec.targetMonth,
          estProceeds: rec.estProceeds,
          estTax: rec.estTax,
          isRecommendation: false,
        },
      ],
    }));
  }, []);

  const dismissSell = useCallback(() => {
    // Recommendations are recomputed each render — without a persistent dismiss list,
    // dismissing is a no-op (it'll come back). For now this is intentional; users can
    // accept and then remove if they want to permanently silence it.
  }, []);

  const removePlanned = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      plannedSells: s.plannedSells.filter((p) => p.id !== id),
    }));
  }, []);

  const projection = useMemo(() => scheduleSells(state), [state]);

  const totalAssets = state.accounts
    .filter((a) => a.type !== "liability")
    .reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = state.accounts
    .filter((a) => a.type === "liability")
    .reduce((s, a) => s + a.balance, 0);
  const netWorth = totalAssets - totalLiabilities;
  const liquidCash = state.accounts
    .filter((a) => a.type === "checking" || a.type === "savings")
    .reduce((s, a) => s + a.balance, 0);
  const monthsBelowBuffer = projection.months.filter((m) => m.belowBuffer).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Personal Finance Timeline
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Manual-entry · 24-month forward view · data lives in your browser only
            </p>
          </div>
          <div className="bg-slate-800 rounded-xl p-1 flex gap-1">
            <TabButton active={tab === "timeline"} onClick={() => setTab("timeline")}>
              Timeline
            </TabButton>
            <TabButton active={tab === "setup"} onClick={() => setTab("setup")}>
              Setup
            </TabButton>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <NetWorthCard
          netWorth={netWorth}
          totalAssets={totalAssets}
          liquidCash={liquidCash}
          minimumCashBuffer={state.minimumCashBuffer}
          monthsBelowBuffer={monthsBelowBuffer}
        />

        {tab === "timeline" ? (
          <CashTimeline
            projection={projection}
            minimumCashBuffer={state.minimumCashBuffer}
            lots={state.lots}
            jobStartDate={state.jobStartDate}
            onAcceptSell={acceptSell}
            onDismissSell={dismissSell}
            onRemovePlanned={removePlanned}
          />
        ) : (
          <>
            <IncomeAndBufferEditor
              jobStartDate={state.jobStartDate}
              incomeMode={state.incomeMode}
              annualIncome={state.annualIncome}
              hourlyRate={state.hourlyRate}
              hoursPerWeek={state.hoursPerWeek}
              weeksPerYear={state.weeksPerYear}
              filingStatus={state.filingStatus}
              minimumCashBuffer={state.minimumCashBuffer}
              onUpdate={(p) => update(p as Partial<AppState>)}
            />
            <AccountBalances
              accounts={state.accounts}
              onUpdateAccount={updateAccount}
              onUpdateAccounts={updateAccounts}
            />
            <RecurringExpensesEditor items={state.recurringExpenses} onUpdate={updateRecurring} />
            <OneOffExpensesEditor items={state.oneOffExpenses} onUpdate={updateOneOffs} />
            <CreditCardBillsEditor bills={state.creditCardBills} onUpdate={updateCreditCards} />
            <StockHoldings
              lots={state.lots}
              onUpdateLots={updateLots}
              onRefreshPrices={refreshPrices}
              priceLoading={priceLoading}
              priceError={priceError}
            />
            {totalLiabilities > 0 && (
              <p className="text-slate-500 text-xs">
                Liabilities total {totalLiabilities.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} (reflected in net worth, not yet in timeline outflows).
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active ? "bg-sky-600 text-white" : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
