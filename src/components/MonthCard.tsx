import type { MonthBucket, TimelineEvent } from "../lib/timeline";
import type { PlannedSell } from "../types";

export interface RecWithTicker extends PlannedSell {
  ticker: string;
}

interface Props {
  bucket: MonthBucket;
  recommendations: RecWithTicker[];
  minimumCashBuffer: number;
  onAcceptSell: (rec: PlannedSell) => void;
  onDismissSell: (rec: PlannedSell) => void;
  onRemovePlanned: (id: string) => void;
  isCurrent: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const KIND_ICON: Record<TimelineEvent["kind"], string> = {
  recurring: "↻",
  oneoff: "★",
  creditcard: "💳",
  income: "▼",
  sell: "▲",
};

const KIND_TEXT: Record<TimelineEvent["kind"], string> = {
  recurring: "text-slate-300",
  oneoff: "text-amber-300",
  creditcard: "text-rose-300",
  income: "text-emerald-300",
  sell: "text-violet-300",
};

function formatMonth(month: string): { short: string; year: string } {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return {
    short: d.toLocaleString("en-US", { month: "short" }),
    year: `'${String(y).slice(-2)}`,
  };
}

function formatDay(date: string): string {
  return date.slice(8, 10);
}

export default function MonthCard({
  bucket,
  recommendations,
  minimumCashBuffer,
  onAcceptSell,
  onDismissSell,
  onRemovePlanned,
  isCurrent,
}: Props) {
  const monthLabel = formatMonth(bucket.month);
  const endingColor = bucket.belowBuffer ? "text-rose-400" : "text-emerald-400";
  const ringColor = bucket.belowBuffer
    ? "border-rose-900/60"
    : isCurrent
      ? "border-sky-700/60"
      : "border-slate-800";

  return (
    <div
      id={`month-${bucket.month}`}
      className={`bg-slate-900 rounded-2xl border ${ringColor} p-4 grid grid-cols-1 md:grid-cols-[140px_1fr_240px] gap-4`}
    >
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-white">{monthLabel.short}</span>
          <span className="text-slate-400 text-sm">{monthLabel.year}</span>
          {isCurrent && (
            <span className="ml-2 text-[10px] uppercase tracking-wider bg-sky-900 text-sky-300 rounded-full px-1.5 py-0.5">
              now
            </span>
          )}
        </div>
        <div className="mt-3 space-y-1.5 text-xs">
          <div>
            <div className="text-slate-500">Start</div>
            <div className="text-slate-200 font-medium">{fmt(bucket.startingCash)}</div>
          </div>
          <div>
            <div className="text-slate-500">End</div>
            <div className={`font-semibold ${endingColor}`}>{fmt(bucket.endingCash)}</div>
          </div>
          {bucket.belowBuffer && (
            <div className="text-rose-400 text-[11px] mt-1">
              {fmt(bucket.shortfall)} below buffer
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0">
        {bucket.events.length === 0 ? (
          <div className="text-slate-600 text-xs italic py-2">No events this month</div>
        ) : (
          <ul className="space-y-1">
            {bucket.events.map((e) => {
              const isPlannedSell = e.kind === "sell" && !e.recommendationId;
              return (
                <li
                  key={e.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className={`w-6 text-center ${KIND_TEXT[e.kind]}`} aria-hidden>
                    {KIND_ICON[e.kind]}
                  </span>
                  <span className="text-slate-500 text-xs tabular-nums w-6">
                    {formatDay(e.date)}
                  </span>
                  <span className="flex-1 truncate text-slate-200">{e.label}</span>
                  <span
                    className={`tabular-nums font-medium ${
                      e.amount >= 0 ? "text-emerald-400" : "text-slate-300"
                    }`}
                  >
                    {e.amount >= 0 ? "+" : ""}
                    {fmt(e.amount)}
                  </span>
                  {isPlannedSell && (
                    <button
                      onClick={() => onRemovePlanned(e.id)}
                      className="text-slate-600 hover:text-rose-400 text-xs"
                      title="Remove planned sell"
                    >
                      ✕
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        {recommendations.length === 0 ? (
          bucket.belowBuffer ? (
            <div className="text-xs text-amber-300/80 italic">
              Below {fmt(minimumCashBuffer)} buffer — no lots available to sell.
            </div>
          ) : null
        ) : (
          <>
            <div className="text-[11px] uppercase tracking-wider text-violet-400/80 font-semibold">
              Recommended sells
            </div>
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="bg-violet-950/40 border border-violet-900/60 rounded-lg p-2 text-xs space-y-1"
              >
                <div className="text-violet-200 font-medium">
                  Sell {rec.shares} {rec.ticker} · net {fmt(rec.estProceeds - rec.estTax)}
                </div>
                <div className="text-slate-400">
                  Proceeds {fmt(rec.estProceeds)} · Tax {fmt(rec.estTax)}
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => onAcceptSell(rec)}
                    className="flex-1 bg-violet-700 hover:bg-violet-600 text-white rounded px-2 py-1 font-medium transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => onDismissSell(rec)}
                    className="text-slate-500 hover:text-slate-300 px-2"
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
