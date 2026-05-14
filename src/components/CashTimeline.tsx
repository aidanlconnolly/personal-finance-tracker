import { useMemo } from "react";
import type { StockLot, PlannedSell } from "../types";
import type { Projection } from "../lib/timeline";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import MonthCard from "./MonthCard";

interface Props {
  projection: Projection;
  minimumCashBuffer: number;
  lots: StockLot[];
  jobStartDate: string;
  onAcceptSell: (rec: PlannedSell) => void;
  onDismissSell: (rec: PlannedSell) => void;
  onRemovePlanned: (id: string) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const fmtCompact = (n: number) => {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return n.toFixed(0);
};

function scrollToMonth(month: string) {
  const el = document.getElementById(`month-${month}`);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
}

export default function CashTimeline({
  projection,
  minimumCashBuffer,
  lots,
  jobStartDate,
  onAcceptSell,
  onDismissSell,
  onRemovePlanned,
}: Props) {
  const currentMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const chartData = useMemo(
    () =>
      projection.months.map((m) => ({
        month: m.month,
        label: m.month.slice(2, 7),
        endingCash: Math.round(m.endingCash),
      })),
    [projection]
  );

  const minY = useMemo(() => {
    const min = Math.min(0, ...chartData.map((d) => d.endingCash));
    return Math.floor(min / 5000) * 5000;
  }, [chartData]);

  const maxY = useMemo(() => {
    const max = Math.max(minimumCashBuffer, ...chartData.map((d) => d.endingCash));
    return Math.ceil((max * 1.05) / 5000) * 5000;
  }, [chartData, minimumCashBuffer]);

  const recsByMonth = useMemo(() => {
    const map: Record<string, PlannedSell[]> = {};
    for (const r of projection.recommendedSells) {
      (map[r.targetMonth] ??= []).push(r);
    }
    return map;
  }, [projection.recommendedSells]);

  const tickerByLotId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const l of lots) map[l.id] = l.ticker;
    return map;
  }, [lots]);

  const sellMonths = Object.keys(recsByMonth);
  const jobStartMonth = jobStartDate.slice(0, 7);

  const monthsBelowBuffer = projection.months.filter((m) => m.belowBuffer).length;
  const totalNet = projection.months[projection.months.length - 1]?.endingCash ?? 0;

  return (
    <section className="space-y-6">
      <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Cash Timeline — 24 months</h2>
            <p className="text-slate-400 text-sm">
              Ending cash projected through each month. Stay above the {fmt(minimumCashBuffer)} buffer.
            </p>
          </div>
          <div className="flex gap-6 text-xs">
            <div>
              <div className="text-slate-500 uppercase tracking-wider">24-mo end</div>
              <div className={`text-base font-semibold ${totalNet < minimumCashBuffer ? "text-rose-400" : "text-emerald-400"}`}>
                {fmt(totalNet)}
              </div>
            </div>
            <div>
              <div className="text-slate-500 uppercase tracking-wider">Months below buffer</div>
              <div className={`text-base font-semibold ${monthsBelowBuffer > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                {monthsBelowBuffer}
              </div>
            </div>
            <div>
              <div className="text-slate-500 uppercase tracking-wider">Recommended sells</div>
              <div className="text-base font-semibold text-violet-300">{projection.recommendedSells.length}</div>
            </div>
          </div>
        </div>

        <div className="h-64 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="label"
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                interval={1}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                domain={[minY, maxY]}
                tickFormatter={fmtCompact}
                width={60}
              />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }}
                labelStyle={{ color: "#cbd5e1" }}
                itemStyle={{ color: "#a5f3fc" }}
                formatter={(v: number) => [fmt(v), "Ending cash"]}
              />
              <ReferenceArea y1={minY} y2={minimumCashBuffer} fill="#9f1239" fillOpacity={0.12} />
              <ReferenceLine
                y={minimumCashBuffer}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{ value: `Buffer ${fmtCompact(minimumCashBuffer)}`, fill: "#f59e0b", fontSize: 10, position: "insideTopRight" }}
              />
              <Line
                type="monotone"
                dataKey="endingCash"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={{ r: 3, fill: "#38bdf8" }}
                activeDot={{ r: 5 }}
              />
              {sellMonths.map((month) => {
                const point = chartData.find((d) => d.month === month);
                if (!point) return null;
                return (
                  <ReferenceDot
                    key={`sell-${month}`}
                    x={point.label}
                    y={point.endingCash}
                    r={6}
                    fill="#a78bfa"
                    stroke="#ede9fe"
                    strokeWidth={1}
                    onClick={() => scrollToMonth(month)}
                    style={{ cursor: "pointer" }}
                  />
                );
              })}
              {chartData.some((d) => d.month === jobStartMonth) && (
                <ReferenceLine
                  x={jobStartMonth.slice(2, 7)}
                  stroke="#22c55e"
                  strokeDasharray="2 2"
                  label={{ value: "Job start", fill: "#22c55e", fontSize: 10, position: "insideTop" }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {!projection.momentumAvailable && (
          <p className="text-slate-500 text-xs mt-2">
            Momentum data unavailable (Yahoo CORS or no prices yet) — sell ranking uses tax efficiency only.
          </p>
        )}
      </div>

      <div className="space-y-3">
        {projection.months.map((bucket) => {
          const recs = (recsByMonth[bucket.month] ?? []).map((r) => ({
            ...r,
            ticker: tickerByLotId[r.lotId] ?? "?",
          }));
          return (
            <MonthCard
              key={bucket.month}
              bucket={bucket}
              recommendations={recs}
              minimumCashBuffer={minimumCashBuffer}
              onAcceptSell={onAcceptSell}
              onDismissSell={onDismissSell}
              onRemovePlanned={onRemovePlanned}
              isCurrent={bucket.month === currentMonth}
            />
          );
        })}
      </div>
    </section>
  );
}
