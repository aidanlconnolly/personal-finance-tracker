import type { FilingStatus, IncomeMode } from "../types";
import { grossAnnualIncome } from "../types";

interface Props {
  jobStartDate: string;
  incomeMode: IncomeMode;
  annualIncome: number;
  hourlyRate: number;
  hoursPerWeek: number;
  weeksPerYear: number;
  filingStatus: FilingStatus;
  minimumCashBuffer: number;
  onUpdate: (patch: {
    jobStartDate?: string;
    incomeMode?: IncomeMode;
    annualIncome?: number;
    hourlyRate?: number;
    hoursPerWeek?: number;
    weeksPerYear?: number;
    filingStatus?: FilingStatus;
    minimumCashBuffer?: number;
  }) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export default function IncomeAndBufferEditor({
  jobStartDate,
  incomeMode,
  annualIncome,
  hourlyRate,
  hoursPerWeek,
  weeksPerYear,
  filingStatus,
  minimumCashBuffer,
  onUpdate,
}: Props) {
  const derivedAnnual = grossAnnualIncome({
    incomeMode,
    annualIncome,
    hourlyRate,
    hoursPerWeek,
    weeksPerYear,
  });
  const monthlyAfterTax = (derivedAnnual * 0.72) / 12;

  return (
    <section className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Income & buffer</h2>
        <p className="text-slate-400 text-sm">
          Income drives the projection from job start onward (~72% net). Buffer is the floor cash must stay above —
          recommendations trigger when projected cash dips below.
        </p>
      </div>

      <div className="bg-slate-800 rounded-xl p-1 inline-flex gap-1">
        <ModeBtn active={incomeMode === "annual"} onClick={() => onUpdate({ incomeMode: "annual" })}>Annual</ModeBtn>
        <ModeBtn active={incomeMode === "hourly"} onClick={() => onUpdate({ incomeMode: "hourly" })}>Hourly</ModeBtn>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="block">
          <span className="text-slate-400 text-xs">Job start date</span>
          <input
            className="input w-full mt-1"
            type="date"
            value={jobStartDate}
            onChange={(e) => onUpdate({ jobStartDate: e.target.value })}
          />
        </label>

        {incomeMode === "annual" ? (
          <label className="block lg:col-span-2">
            <span className="text-slate-400 text-xs">Annual income (gross)</span>
            <input
              className="input w-full mt-1"
              type="number"
              value={annualIncome}
              onChange={(e) => onUpdate({ annualIncome: parseFloat(e.target.value) || 0 })}
            />
          </label>
        ) : (
          <>
            <label className="block">
              <span className="text-slate-400 text-xs">Hourly rate ($)</span>
              <input
                className="input w-full mt-1"
                type="number"
                value={hourlyRate}
                onChange={(e) => onUpdate({ hourlyRate: parseFloat(e.target.value) || 0 })}
              />
            </label>
            <label className="block">
              <span className="text-slate-400 text-xs">Hours / week</span>
              <input
                className="input w-full mt-1"
                type="number"
                value={hoursPerWeek}
                onChange={(e) => onUpdate({ hoursPerWeek: parseFloat(e.target.value) || 0 })}
              />
            </label>
            <label className="block">
              <span className="text-slate-400 text-xs">Weeks / year</span>
              <input
                className="input w-full mt-1"
                type="number"
                value={weeksPerYear}
                onChange={(e) => onUpdate({ weeksPerYear: parseFloat(e.target.value) || 0 })}
              />
            </label>
          </>
        )}

        <label className="block">
          <span className="text-slate-400 text-xs">Filing status</span>
          <select
            className="input w-full mt-1"
            value={filingStatus}
            onChange={(e) => onUpdate({ filingStatus: e.target.value as FilingStatus })}
          >
            <option value="single">Single</option>
            <option value="married_joint">Married filing jointly</option>
          </select>
        </label>
        <label className="block">
          <span className="text-slate-400 text-xs">Minimum cash buffer</span>
          <input
            className="input w-full mt-1"
            type="number"
            value={minimumCashBuffer}
            onChange={(e) => onUpdate({ minimumCashBuffer: parseFloat(e.target.value) || 0 })}
          />
        </label>
      </div>

      <div className="text-xs text-slate-400 bg-slate-800/50 rounded-lg px-3 py-2">
        Derived gross annual: <span className="text-emerald-400 font-medium">{fmt(derivedAnnual)}</span>
        {" · "}After-tax monthly (72%): <span className="text-sky-400 font-medium">{fmt(monthlyAfterTax)}</span>
      </div>
    </section>
  );
}

function ModeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
        active ? "bg-sky-600 text-white" : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
