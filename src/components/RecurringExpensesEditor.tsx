import { useState } from "react";
import type { RecurringExpense } from "../types";

interface Props {
  items: RecurringExpense[];
  onUpdate: (items: RecurringExpense[]) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export default function RecurringExpensesEditor({ items, onUpdate }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<Omit<RecurringExpense, "id">>({
    label: "",
    amount: 0,
    dayOfMonth: 1,
  });

  const add = () => {
    if (!draft.label.trim() || draft.amount <= 0) return;
    onUpdate([...items, { ...draft, id: `rec-${Date.now()}` }]);
    setDraft({ label: "", amount: 0, dayOfMonth: 1 });
    setShowAdd(false);
  };

  const patch = (id: string, patch: Partial<RecurringExpense>) => {
    onUpdate(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const remove = (id: string) => onUpdate(items.filter((it) => it.id !== id));

  const totalMonthly = items.reduce((s, it) => s + it.amount, 0);

  return (
    <section className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Recurring monthly expenses</h2>
          <p className="text-slate-400 text-sm">
            Total / month: <span className="text-rose-400 font-medium">{fmt(totalMonthly)}</span>
          </p>
        </div>
        <button onClick={() => setShowAdd((v) => !v)} className="text-sm text-sky-400 hover:text-sky-300">
          {showAdd ? "Cancel" : "+ Add"}
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 bg-slate-800 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <input
            className="input col-span-2 sm:col-span-1"
            placeholder="Label (e.g. Rent)"
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
            type="number"
            min={1}
            max={31}
            placeholder="Day of month"
            value={draft.dayOfMonth}
            onChange={(e) => setDraft((d) => ({ ...d, dayOfMonth: Math.max(1, Math.min(31, parseInt(e.target.value) || 1)) }))}
          />
          <button onClick={add} className="btn-primary">Add</button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-slate-500 text-sm italic">No recurring expenses yet. Add rent, groceries, utilities, etc.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 text-xs uppercase tracking-wide">
                <th className="text-left pb-2 font-medium">Label</th>
                <th className="text-right pb-2 font-medium">Amount</th>
                <th className="text-center pb-2 font-medium">Day</th>
                <th className="text-center pb-2 font-medium">Start (opt.)</th>
                <th className="text-center pb-2 font-medium">End (opt.)</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
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
                      className="input w-24 text-right"
                      type="number"
                      value={it.amount}
                      onChange={(e) => patch(it.id, { amount: parseFloat(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="py-2 text-center">
                    <input
                      className="input w-16 text-center"
                      type="number"
                      min={1}
                      max={31}
                      value={it.dayOfMonth}
                      onChange={(e) =>
                        patch(it.id, { dayOfMonth: Math.max(1, Math.min(31, parseInt(e.target.value) || 1)) })
                      }
                    />
                  </td>
                  <td className="py-2 text-center">
                    <input
                      className="input w-28"
                      type="month"
                      value={it.startMonth ?? ""}
                      onChange={(e) => patch(it.id, { startMonth: e.target.value || undefined })}
                    />
                  </td>
                  <td className="py-2 text-center">
                    <input
                      className="input w-28"
                      type="month"
                      value={it.endMonth ?? ""}
                      onChange={(e) => patch(it.id, { endMonth: e.target.value || undefined })}
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
