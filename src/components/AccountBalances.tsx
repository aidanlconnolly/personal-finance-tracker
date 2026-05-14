import { useState } from "react";
import type { Account } from "../types";

interface Props {
  accounts: Account[];
  onUpdateAccount: (id: string, balance: number) => void;
  onUpdateAccounts: (accounts: Account[]) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const TYPE_LABELS: Record<Account["type"], string> = {
  checking: "Checking",
  savings: "Savings",
  brokerage: "Brokerage",
  liability: "Liability",
};

const TYPE_COLORS: Record<Account["type"], string> = {
  checking: "bg-sky-900 text-sky-300",
  savings: "bg-emerald-900 text-emerald-300",
  brokerage: "bg-violet-900 text-violet-300",
  liability: "bg-rose-900 text-rose-300",
};

type EditField = "balance" | "costBasis";

export default function AccountBalances({ accounts, onUpdateAccount, onUpdateAccounts }: Props) {
  const [editing, setEditing] = useState<{ id: string; field: EditField } | null>(null);
  const [draft, setDraft] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newAcct, setNewAcct] = useState<Omit<Account, "id">>({
    name: "",
    institution: "",
    type: "checking",
    balance: 0,
  });

  const startEdit = (id: string, field: EditField, current: string) => {
    setEditing({ id, field });
    setDraft(current);
  };

  const commitEdit = () => {
    if (!editing) return;
    const val = parseFloat(draft);
    if (!isNaN(val)) {
      if (editing.field === "balance") {
        onUpdateAccount(editing.id, val);
      } else {
        onUpdateAccounts(
          accounts.map((a) => (a.id === editing.id ? { ...a, costBasis: val } : a))
        );
      }
    }
    setEditing(null);
  };

  const clearCostBasis = (id: string) => {
    onUpdateAccounts(
      accounts.map((a) => {
        if (a.id !== id) return a;
        const { costBasis: _omit, ...rest } = a;
        return rest;
      })
    );
  };

  const deleteAccount = (id: string) => {
    onUpdateAccounts(accounts.filter((a) => a.id !== id));
  };

  const addAccount = () => {
    if (!newAcct.name.trim()) return;
    const acct: Account = { ...newAcct, id: `acct-${Date.now()}` };
    onUpdateAccounts([...accounts, acct]);
    setNewAcct({ name: "", institution: "", type: "checking", balance: 0 });
    setShowAdd(false);
  };

  return (
    <section className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Account balances</h2>
        <button onClick={() => setShowAdd((v) => !v)} className="text-sm text-sky-400 hover:text-sky-300">
          {showAdd ? "Cancel" : "+ Add account"}
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 bg-slate-800 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <input
            className="input col-span-2 sm:col-span-1"
            placeholder="Account name"
            value={newAcct.name}
            onChange={(e) => setNewAcct((n) => ({ ...n, name: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Institution"
            value={newAcct.institution}
            onChange={(e) => setNewAcct((n) => ({ ...n, institution: e.target.value }))}
          />
          <select
            className="input"
            value={newAcct.type}
            onChange={(e) => setNewAcct((n) => ({ ...n, type: e.target.value as Account["type"] }))}
          >
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
            <option value="brokerage">Brokerage</option>
            <option value="liability">Liability</option>
          </select>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              type="number"
              placeholder="Balance"
              value={newAcct.balance}
              onChange={(e) => setNewAcct((n) => ({ ...n, balance: parseFloat(e.target.value) || 0 }))}
            />
            <button onClick={addAccount} className="btn-primary">Add</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-800">
              <th className="text-left pb-2 font-medium">Account</th>
              <th className="text-left pb-2 font-medium">Institution</th>
              <th className="text-left pb-2 font-medium">Type</th>
              <th className="text-right pb-2 font-medium">Invested</th>
              <th className="text-right pb-2 font-medium">Balance</th>
              <th className="text-right pb-2 font-medium">Gain/Loss</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => {
              const isBrokerage = a.type === "brokerage";
              const hasBasis = typeof a.costBasis === "number" && a.costBasis > 0;
              const gain = hasBasis ? a.balance - (a.costBasis as number) : null;
              const gainPct = hasBasis ? (gain! / (a.costBasis as number)) * 100 : null;

              return (
                <tr key={a.id} className="border-b border-slate-800/50 last:border-0">
                  <td className="py-3 font-medium text-white">{a.name}</td>
                  <td className="py-3 text-slate-400">{a.institution}</td>
                  <td className="py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[a.type]}`}>
                      {TYPE_LABELS[a.type]}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    {isBrokerage ? (
                      editing?.id === a.id && editing.field === "costBasis" ? (
                        <input
                          autoFocus
                          className="input w-28 text-right"
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => e.key === "Enter" && commitEdit()}
                        />
                      ) : hasBasis ? (
                        <button
                          onClick={() => startEdit(a.id, "costBasis", String(a.costBasis))}
                          className="text-slate-300 hover:text-sky-300 transition-colors tabular-nums"
                        >
                          {fmt(a.costBasis as number)}
                        </button>
                      ) : (
                        <button
                          onClick={() => startEdit(a.id, "costBasis", "0")}
                          className="text-slate-600 hover:text-sky-300 text-xs italic"
                        >
                          + set basis
                        </button>
                      )
                    ) : (
                      <span className="text-slate-700">—</span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    {editing?.id === a.id && editing.field === "balance" ? (
                      <input
                        autoFocus
                        className="input w-32 text-right"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => e.key === "Enter" && commitEdit()}
                      />
                    ) : (
                      <button
                        onClick={() => startEdit(a.id, "balance", a.balance.toString())}
                        className={`font-semibold hover:text-sky-300 transition-colors ${
                          a.type === "liability" ? "text-rose-400" : "text-emerald-400"
                        }`}
                      >
                        {fmt(a.balance)}
                      </button>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    {gain === null ? (
                      <span className="text-slate-700">—</span>
                    ) : (
                      <span
                        className={`tabular-nums font-medium ${
                          gain >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {gain >= 0 ? "+" : ""}
                        {fmt(gain)}
                        <span className="text-xs font-normal opacity-70 ml-1">
                          ({gainPct! >= 0 ? "+" : ""}
                          {gainPct!.toFixed(1)}%)
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <div className="flex gap-2 justify-end items-center">
                      {isBrokerage && hasBasis && (
                        <button
                          onClick={() => clearCostBasis(a.id)}
                          className="text-slate-600 hover:text-slate-400 text-xs"
                          title="Clear invested amount"
                        >
                          clr
                        </button>
                      )}
                      <button
                        onClick={() => deleteAccount(a.id)}
                        className="text-slate-600 hover:text-rose-400 transition-colors text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-slate-500 text-xs mt-3">
        Click any value to edit. Liquid cash for the timeline = checking + savings only. Brokerage balances roll into
        net worth but aren't used to fund expenses. Add an Invested amount to see capital gains.
      </p>
    </section>
  );
}
