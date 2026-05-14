import { useMemo } from "react";
import type { CreditCardBill, CardKey } from "../types";
import { CARD_DUE_DAY, CARD_LABEL } from "../types";

interface Props {
  bills: CreditCardBill[];
  onUpdate: (bills: CreditCardBill[]) => void;
  monthsAhead?: number;
}

function nextMonths(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const md = new Date(d.getFullYear(), d.getMonth() + i, 1);
    out.push(`${md.getFullYear()}-${String(md.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "short", year: "2-digit" });
}

const CARDS: CardKey[] = ["amex", "chase"];

export default function CreditCardBillsEditor({ bills, onUpdate, monthsAhead = 12 }: Props) {
  const months = useMemo(() => nextMonths(monthsAhead), [monthsAhead]);

  const byKey = useMemo(() => {
    const map: Record<string, CreditCardBill> = {};
    for (const b of bills) map[`${b.card}-${b.month}`] = b;
    return map;
  }, [bills]);

  const setAmount = (card: CardKey, month: string, raw: string) => {
    const amt = parseFloat(raw);
    const key = `${card}-${month}`;
    const existing = byKey[key];
    if (!isFinite(amt) || amt <= 0) {
      if (existing) onUpdate(bills.filter((b) => b.id !== existing.id));
      return;
    }
    if (existing) {
      onUpdate(bills.map((b) => (b.id === existing.id ? { ...b, amount: amt } : b)));
    } else {
      onUpdate([...bills, { id: `cc-${card}-${month}-${Date.now()}`, card, month, amount: amt }]);
    }
  };

  return (
    <section className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Credit card bills</h2>
        <p className="text-slate-400 text-sm">
          Amex due on the {CARD_DUE_DAY.amex}th, Chase due on the {CARD_DUE_DAY.chase}th. Enter the amount due each month.
          Leave blank or zero to skip.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-800 text-xs uppercase tracking-wide">
              <th className="text-left pb-2 font-medium">Month</th>
              {CARDS.map((c) => (
                <th key={c} className="text-right pb-2 font-medium">
                  {CARD_LABEL[c]} <span className="text-slate-500 normal-case font-normal">(day {CARD_DUE_DAY[c]})</span>
                </th>
              ))}
              <th className="text-right pb-2 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {months.map((month) => {
              const total = CARDS.reduce((s, c) => s + (byKey[`${c}-${month}`]?.amount ?? 0), 0);
              return (
                <tr key={month} className="border-b border-slate-800/50 last:border-0">
                  <td className="py-2 text-slate-200 font-medium">{monthLabel(month)}</td>
                  {CARDS.map((c) => {
                    const bill = byKey[`${c}-${month}`];
                    return (
                      <td key={c} className="py-2 text-right">
                        <input
                          className="input w-28 text-right"
                          type="number"
                          placeholder="0"
                          value={bill?.amount ?? ""}
                          onChange={(e) => setAmount(c, month, e.target.value)}
                        />
                      </td>
                    );
                  })}
                  <td className="py-2 text-right text-rose-300 tabular-nums">
                    {total > 0 ? `-$${total.toLocaleString()}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
