import { useState } from "react";
import type { OneOffExpense } from "../types";

interface Props {
  items: OneOffExpense[];
  onUpdate: (items: OneOffExpense[]) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export default function OneOffExpensesEditor({ items, onUpdate }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<Omit<OneOffExpense, "id">>({
    label: "",
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
  });

  const add = () => {
    if (!draft.label.trim() || draft.amount <= 0) return;
    onUpdate([...items, { ...draft, id: `oo-${Date.now()}` }]);
    setDraft({ label: "", amount: 0, date: new Date().toISOString().slice(0, 10) });
    setShowAdd(false);
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
        <button onClick={() => setShowAdd((v) => !v)} className="text-sm text-sky-400 hover:text-sky-300">
          {showAdd ? "Cancel" : "+ Add"}
        </button>
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
