interface Props {
  netWorth: number;
  totalAssets: number;
  liquidCash: number;
  minimumCashBuffer: number;
  monthsBelowBuffer: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export default function NetWorthCard({
  netWorth,
  totalAssets,
  liquidCash,
  minimumCashBuffer,
  monthsBelowBuffer,
}: Props) {
  return (
    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
      <p className="text-slate-400 text-sm uppercase tracking-widest mb-1">Net Worth</p>
      <p className="text-5xl font-bold text-white mb-6">{fmt(netWorth)}</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Total Assets" value={fmt(totalAssets)} color="text-emerald-400" />
        <Stat label="Liquid Cash" value={fmt(liquidCash)} color="text-sky-400" />
        <Stat label="Cash Buffer" value={fmt(minimumCashBuffer)} color="text-amber-400" />
        <Stat
          label="Months Below Buffer"
          value={`${monthsBelowBuffer} / 24`}
          color={monthsBelowBuffer > 0 ? "text-rose-400" : "text-emerald-400"}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}
