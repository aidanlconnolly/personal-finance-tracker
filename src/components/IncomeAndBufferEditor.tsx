import type { FilingStatus } from "../types";

interface Props {
  jobStartDate: string;
  annualIncome: number;
  filingStatus: FilingStatus;
  minimumCashBuffer: number;
  onUpdate: (patch: {
    jobStartDate?: string;
    annualIncome?: number;
    filingStatus?: FilingStatus;
    minimumCashBuffer?: number;
  }) => void;
}

export default function IncomeAndBufferEditor({
  jobStartDate,
  annualIncome,
  filingStatus,
  minimumCashBuffer,
  onUpdate,
}: Props) {
  return (
    <section className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
      <h2 className="text-lg font-semibold text-white mb-1">Income & buffer</h2>
      <p className="text-slate-400 text-sm mb-4">
        Income is projected from job start date forward (after-tax estimate, ~72% of gross). Buffer is the floor cash should
        stay above — sell recommendations are triggered when projected cash dips below.
      </p>
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
        <label className="block">
          <span className="text-slate-400 text-xs">Annual income (gross)</span>
          <input
            className="input w-full mt-1"
            type="number"
            value={annualIncome}
            onChange={(e) => onUpdate({ annualIncome: parseFloat(e.target.value) || 0 })}
          />
        </label>
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
    </section>
  );
}
