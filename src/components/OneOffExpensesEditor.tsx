import { useState } from "react";
import type { OneOffExpense } from "../types";

interface Props {
  items: OneOffExpense[];
  onUpdate: (items: OneOffExpense[]) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function thisMonthYM(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function lastDayOfMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const day = new Date(y, m, 0).getDate();
  return `${ym}-${String(day).padStart(2, "0")}`;
}

function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function OneOffExpensesEditor({ items, onUpdate }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<Omit<OneOffExpense, "id">>({
    label: "",
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
  });

  const [showPlan, setShowPlan] = useState(false);
  const [plan, setPlan] = useState({
    label: "Wharton tuition (monthly plan)",
    total: 84000,
    months: 12,
    startMonth: thisMonthYM(),
  });

  const add = () => {
    if (!draft.label.trim() || draft.amount <= 0) return;
    onUpdate([...items, { ...draft, id: `oo-${Date.now()}` }]);
    setDraft({ label: "", amount: 0, date: new Date().toISOString().slice(0, 10) });
    setShowAdd(false);
  };

  const generateInstallments = () => {
    if (!plan.label.trim() || plan.total <= 0 || plan.months < 1) return;
    const per = plan.total / plan.months;
    const installments: OneOffExpense[] = [];
    for (let i = 0; i < plan.months; i++) {
      const ym = addMonths(plan.startMonth, i);
      installments.push({
        id: `oo-plan-${Date.now()}-${i}`,
        label: `${plan.label} (${i + 1}/${plan.months})`,
        amount: Math.round(per * 100) / 100,
        date: lastDayOfMonth(ym),
      });
    }
    onUpdate([...items, ...installments]);
    setShowPlan(false);
  };

  const patch = (id: string, patch: Partial<OneOffExpense>) => {
    onUpdate(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const remove = (id: string) => onUpdate(items.filter((it) => it.id !== id));

  const sorted = [...items].sort((a, b) => (a.date < b.date ? -1 : 1));
  const total = items.reduce((s, it) => s + it.amount, 0);

  return (
    <section className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">One-off expenses</h2>
          <p className="text-slate-400 text-sm">
            Tuition payments, big trips, anything dated. Total scheduled:{" "}
            <span className="text-rose-400 font-medium">{fmt(total)}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setShowPlan((v) => !v); setShowAdd(false); }} className="text-sm text-violet-400 hover:text-violet-300">
            {showPlan ? "Cancel" : "+ Tuition plan"}
          </button>
          <button onClick={() => { setShowAdd((v) => !v); setShowPlan(false); }} className="text-sm text-sky-400 hover:text-sky-300">
            {showAdd ? "Cancel" : "+ Add"}
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="mb-4 bg-slate-800 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <input
            className="input col-span-2 sm:col-span-1"
            placeholder="Label (e.g. Wharton tuition)"
            value={draft.label}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
          />
          <input
            className="input"
            type="number"
            placeholder="Amount"
            value={draft.amount || ""}
            onChange={(e) => setDraft((d) => ({ ...d, amount: parseFloat(e.target.value) || 0 }))}
          />
          <input
            className="input"
            type="date"
            value={draft.date}
            onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
          />
          <button onClick={add} className="btn-primary">Add</button>
        </div>
      )}

      {showPlan && (
        <div className="mb-4 bg-violet-950/40 border border-violet-900/60 rounded-xl p-4 space-y-3">
          <div className="text-xs text-violet-300 font-medium uppercase tracking-wide">
            Generate monthly installments (no interest, end of month)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
            <label className="block col-span-2">
              <span className="text-slate-400 text-xs">Label</span>
              <input
                className="input w-full mt-1"
                value={plan.label}
                onChange={(e) => setPlan((p) => ({ ...p, label: e.target.value }))}
              />
            </label>
            <label className="block">
              <span className="text-slate-400 text-xs">Total ($)</span>
              <input
                className="input w-full mt-1"
                type="number"
                value={plan.total}
                onChange={(e) => setPlan((p) => ({ ...p, total: parseFloat(e.target.value) || 0 }))}
              />
            </label>
            <label className="block">
              <span className="text-slate-400 text-xs"># months</span>
              <input
                className="input w-full mt-1"
                type="number"
                min={1}
                value={plan.months}
                onChange={(e) => setPlan((p) => ({ ...p, months: Math.max(1, parseInt(e.target.value) || 1) }))}
              />
            </label>
            <label className="block">
              <span className="text-slate-400 text-xs">Start month</span>
              <input
                className="input w-full mt-1"
                type="month"
                value={plan.startMonth}
                onChange={(e) => setPlan((p) => ({ ...p, startMonth: e.target.value }))}
              />
            </label>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="text-slate-400">
              Per-month: <span className="text-violet-300 font-medium">{fmt(plan.total / Math.max(1, plan.months))}</span>
              {" · "}Runs through{" "}
              <span className="text-violet-300 font-medium">
                {addMonths(plan.startMonth, plan.months - 1)}
              </span>
            </div>
            <button onClick={generateInstallments} className="btn-primary">Generate</button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="text-slate-500 text-sm italic">No one-offs yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 text-xs uppercase tracking-wide">
                <th className="text-left pb-2 font-medium">Label</th>
                <th className="text-right pb-2 font-medium">Amount</th>
                <th className="text-center pb-2 font-medium">Date</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((it) => (
                <tr key={it.id} className="border-b border-slate-800/50 last:border-0">
                  <td className="py-2">
                    <input
                      className="input w-full"
                      value={it.label}
                      onChange={(e) => patch(it.id, { label: e.target.value })}
                    />
                  </td>
                  <td className="py-2 text-right">
                    <input
                      className="input w-28 text-right"
                      type="number"
                      value={it.amount}
                      onChange={(e) => patch(it.id, { amount: parseFloat(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="py-2 text-center">
                    <input
                      className="input w-36"
                      type="date"
                      value={it.date}
                      onChange={(e) => patch(it.id, { date: e.target.value })}
                    />
                  </td>
                  <td className="py-2 pl-2">
                    <button
                      onClick={() => remove(it.id)}
                      className="text-slate-600 hover:text-rose-400 text-xs"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
