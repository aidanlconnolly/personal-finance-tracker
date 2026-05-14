import { useState } from "react";
import type { StockLot } from "../types";

interface Props {
  lots: StockLot[];
  onUpdateLots: (lots: StockLot[]) => void;
  onRefreshPrices: () => Promise<void>;
  priceLoading: boolean;
  priceError: string | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);

const fmtK = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function isLongTerm(purchaseDate: string) {
  return Date.now() - new Date(purchaseDate).getTime() > 365.25 * 24 * 3600 * 1000;
}

function fmtPct(v: number | undefined): string {
  if (typeof v !== "number" || !isFinite(v)) return "—";
  const pct = v * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

function momentumColor(v: number | undefined): string {
  if (typeof v !== "number" || !isFinite(v)) return "text-slate-600";
  if (v > 0.02) return "text-emerald-400";
  if (v < -0.02) return "text-rose-400";
  return "text-slate-400";
}

type EditField = "shares" | "costBasis" | "currentPrice" | "purchaseDate";

export default function StockHoldings({ lots, onUpdateLots, onRefreshPrices, priceLoading, priceError }: Props) {
  const [editing, setEditing] = useState<{ id: string; field: EditField } | null>(null);
  const [draft, setDraft] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newLot, setNewLot] = useState<Omit<StockLot, "id">>({
    ticker: "",
    shares: 0,
    costBasis: 0,
    purchaseDate: new Date().toISOString().slice(0, 10),
    currentPrice: 0,
  });

  const updateLotField = (id: string, field: EditField, raw: string) => {
    const lots2 = lots.map((l) => {
      if (l.id !== id) return l;
      if (field === "purchaseDate") return { ...l, purchaseDate: raw };
      const val = parseFloat(raw);
      if (isNaN(val)) return l;
      return { ...l, [field]: val };
    });
    onUpdateLots(lots2);
  };

  const startEdit = (id: string, field: EditField, current: string) => {
    setEditing({ id, field });
    setDraft(current);
  };

  const commitEdit = () => {
    if (editing) updateLotField(editing.id, editing.field, draft);
    setEditing(null);
  };

  const deleteLot = (id: string) => onUpdateLots(lots.filter((l) => l.id !== id));

  const addLot = () => {
    if (!newLot.ticker.trim()) return;
    onUpdateLots([...lots, { ...newLot, ticker: newLot.ticker.toUpperCase(), id: `lot-${Date.now()}` }]);
    setNewLot({ ticker: "", shares: 0, costBasis: 0, purchaseDate: new Date().toISOString().slice(0, 10), currentPrice: 0 });
    setShowAdd(false);
  };

  const totalValue = lots.reduce((s, l) => s + l.shares * (l.currentPrice ?? l.costBasis), 0);
  const totalCost = lots.reduce((s, l) => s + l.shares * l.costBasis, 0);
  const totalGain = totalValue - totalCost;

  return (
    <section className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Stock Holdings</h2>
          <p className="text-slate-400 text-sm">
            Portfolio value:{" "}
            <span className="text-violet-400 font-semibold">{fmtK(totalValue)}</span>
            {"  "}
            <span className={totalGain >= 0 ? "text-emerald-400" : "text-rose-400"}>
              ({totalGain >= 0 ? "+" : ""}{fmtK(totalGain)})
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="text-sm text-sky-400 hover:text-sky-300"
          >
            {showAdd ? "Cancel" : "+ Add Lot"}
          </button>
          <button
            onClick={onRefreshPrices}
            disabled={priceLoading}
            className="btn-primary text-sm"
          >
            {priceLoading ? "Fetching…" : "Refresh Prices"}
          </button>
        </div>
      </div>

      {priceError && (
        <div className="mb-4 bg-amber-950 border border-amber-700 rounded-lg px-4 py-2 text-amber-300 text-sm">
          {priceError}
        </div>
      )}

      {showAdd && (
        <div className="mb-4 bg-slate-800 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
          <input className="input uppercase" placeholder="TICKER" value={newLot.ticker} onChange={(e) => setNewLot((n) => ({ ...n, ticker: e.target.value }))} />
          <input className="input" type="number" placeholder="Shares" value={newLot.shares || ""} onChange={(e) => setNewLot((n) => ({ ...n, shares: parseFloat(e.target.value) || 0 }))} />
          <input className="input" type="number" placeholder="Cost basis/sh" value={newLot.costBasis || ""} onChange={(e) => setNewLot((n) => ({ ...n, costBasis: parseFloat(e.target.value) || 0 }))} />
          <input className="input" type="date" value={newLot.purchaseDate} onChange={(e) => setNewLot((n) => ({ ...n, purchaseDate: e.target.value }))} />
          <button onClick={addLot} className="btn-primary">Add</button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-800 text-xs uppercase tracking-wide">
              <th className="text-left pb-2 font-medium">Ticker</th>
              <th className="text-right pb-2 font-medium">Shares</th>
              <th className="text-right pb-2 font-medium">Cost/sh</th>
              <th className="text-right pb-2 font-medium">Price</th>
              <th className="text-right pb-2 font-medium">Value</th>
              <th className="text-right pb-2 font-medium">Gain/Loss</th>
              <th className="text-center pb-2 font-medium">30d</th>
              <th className="text-center pb-2 font-medium">90d</th>
              <th className="text-center pb-2 font-medium">Term</th>
              <th className="text-left pb-2 font-medium">Purchased</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {lots.map((l) => {
              const price = l.currentPrice ?? l.costBasis;
              const value = l.shares * price;
              const gain = l.shares * (price - l.costBasis);
              const gainPct = ((price - l.costBasis) / l.costBasis) * 100;
              const lt = isLongTerm(l.purchaseDate);

              const EditCell = ({ field, value: v, align = "right" }: { field: EditField; value: string; align?: string }) =>
                editing?.id === l.id && editing.field === field ? (
                  <input
                    autoFocus
                    className={`input w-24 text-${align}`}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => e.key === "Enter" && commitEdit()}
                  />
                ) : (
                  <button
                    onClick={() => startEdit(l.id, field, v)}
                    className="hover:text-sky-300 transition-colors"
                  >
                    {v}
                  </button>
                );

              return (
                <tr key={l.id} className="border-b border-slate-800/50 last:border-0">
                  <td className="py-3 font-bold text-white">{l.ticker}</td>
                  <td className="py-3 text-right text-slate-300">
                    <EditCell field="shares" value={l.shares.toString()} />
                  </td>
                  <td className="py-3 text-right text-slate-300">
                    <EditCell field="costBasis" value={fmt(l.costBasis)} />
                  </td>
                  <td className="py-3 text-right text-slate-300">
                    <EditCell field="currentPrice" value={fmt(price)} />
                  </td>
                  <td className="py-3 text-right font-medium text-white">{fmtK(value)}</td>
                  <td className={`py-3 text-right font-semibold ${gain >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {gain >= 0 ? "+" : ""}{fmtK(gain)}{" "}
                    <span className="text-xs font-normal opacity-70">({gainPct >= 0 ? "+" : ""}{gainPct.toFixed(1)}%)</span>
                  </td>
                  <td className={`py-3 text-center tabular-nums text-xs ${momentumColor(l.momentum30d)}`}>
                    {fmtPct(l.momentum30d)}
                  </td>
                  <td className={`py-3 text-center tabular-nums text-xs ${momentumColor(l.momentum90d)}`}>
                    {fmtPct(l.momentum90d)}
                  </td>
                  <td className="py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${lt ? "bg-emerald-900 text-emerald-300" : "bg-amber-900 text-amber-300"}`}>
                      {lt ? "LT" : "ST"}
                    </span>
                  </td>
                  <td className="py-3 text-slate-400 text-xs">
                    {editing?.id === l.id && editing.field === "purchaseDate" ? (
                      <input
                        autoFocus
                        type="date"
                        className="input text-xs"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={commitEdit}
                      />
                    ) : (
                      <button onClick={() => startEdit(l.id, "purchaseDate", l.purchaseDate)} className="hover:text-sky-300">
                        {l.purchaseDate}
                      </button>
                    )}
                  </td>
                  <td className="py-3 pl-3">
                    <button onClick={() => deleteLot(l.id)} className="text-slate-600 hover:text-rose-400 text-xs">✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-slate-500 text-xs mt-3">Click any cell to edit. LT = held &gt;1 year (long-term), ST = short-term.</p>
    </section>
  );
}
