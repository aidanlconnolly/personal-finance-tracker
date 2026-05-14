import { useState } from "react";
import type { RecurringExpense } from "../types";

interface Props {
  items: RecurringExpense[];
  onUpdate: (items: RecurringExpense[]) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function parseDays(raw: string): number[] {
  return raw
    .split(/[,\s]+/)
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 31);
}

function formatDays(days: number[]): string {
  return days.join(", ");
}

export default function RecurringExpensesEditor({ items, onUpdate }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<Omit<RecurringExpense, "id">>({
    label: "",
    amount: 0,
    daysOfMonth: [1],
  });
  const [draftDays, setDraftDays] = useState("1");
  const [dayDrafts, setDayDrafts] = useState<Record<string, string>>({});

  const add = () => {
    const days = parseDays(draftDays);
    if (!draft.label.trim() || draft.amount <= 0 || days.length === 0) return;
    onUpdate([...items, { ...draft, daysOfMonth: days, id: `rec-${Date.now()}` }]);
    setDraft({ label: "", amount: 0, daysOfMonth: [1] });
    setDraftDays("1");
    setShowAdd(false);
  };

  const patch = (id: string, patch: Partial<RecurringExpense>) => {
    onUpdate(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const commitDays = (id: string) => {
    const raw = dayDrafts[id];
    if (raw === undefined) return;
    const days = parseDays(raw);
    if (days.length > 0) patch(id, { daysOfMonth: days });
    setDayDrafts((d) => {
      const { [id]: _omit, ...rest } = d;
      return rest;
    });
  };

  const remove = (id: string) => onUpdate(items.filter((it) => it.id !== id));

  // Each appearance per month counts: a $350 expense on the 1st and 14th = $700/month.
  const totalMonthly = items.reduce((s, it) => s + it.amount * Math.max(1, it.daysOfMonth.length), 0);

  return (
    <section className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Recurring monthly expenses</h2>
          <p className="text-slate-400 text-sm">
            Days per month accepts a list like <code>1, 14</code>. Total / month:{" "}
            <span className="text-rose-400 font-medium">{fmt(totalMonthly)}</span>
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
            placeholder="Amount per occurrence"
            value={draft.amount || ""}
            onChange={(e) => setDraft((d) => ({ ...d, amount: parseFloat(e.target.value) || 0 }))}
          />
          <input
            className="input"
            placeholder="Days of month (e.g. 1, 14)"
            value={draftDays}
            onChange={(e) => setDraftDays(e.target.value)}
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
                <th className="text-right pb-2 font-medium">Per&nbsp;occurrence</th>
                <th className="text-center pb-2 font-medium">Days of month</th>
                <th className="text-right pb-2 font-medium">Monthly</th>
                <th className="text-center pb-2 font-medium">Start (opt.)</th>
                <th className="text-center pb-2 font-medium">End (opt.)</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const monthlyTotal = it.amount * Math.max(1, it.daysOfMonth.length);
                return (
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
                        className="input w-28 text-center"
                        value={dayDrafts[it.id] ?? formatDays(it.daysOfMonth)}
                        onChange={(e) => setDayDrafts((d) => ({ ...d, [it.id]: e.target.value }))}
                        onBlur={() => commitDays(it.id)}
                        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
                      />
                    </td>
                    <td className="py-2 text-right text-rose-300 tabular-nums">{fmt(monthlyTotal)}</td>
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
