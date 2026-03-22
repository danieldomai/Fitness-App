import { useState, useMemo } from 'react';
import type { RaceId } from '../types';
import { getTrainingTotals, formatDuration, type TrainingTotals } from '../utils';

interface Props {
  raceId: RaceId;
}

const PERIODS = ['day', 'week', 'month', 'year'] as const;
type Period = (typeof PERIODS)[number];

const PERIOD_LABELS: Record<Period, string> = {
  day: 'Daily',
  week: 'Weekly',
  month: 'Monthly',
  year: 'Yearly',
};

const PERIOD_SUBLABELS: Record<Period, string> = {
  day: 'Today',
  week: 'This Week (Mon–Sun)',
  month: 'This Month',
  year: 'Year to Date',
};

function formatDistance(val: number): string {
  if (val === 0) return '0';
  if (val >= 100) return String(Math.round(val));
  return val.toFixed(1);
}

export default function TrainingHistory({ raceId }: Props) {
  const [activePeriod, setActivePeriod] = useState<Period>('week');

  const totals: Record<Period, TrainingTotals> = useMemo(() => ({
    day: getTrainingTotals('day', undefined, raceId),
    week: getTrainingTotals('week', undefined, raceId),
    month: getTrainingTotals('month', undefined, raceId),
    year: getTrainingTotals('year', undefined, raceId),
  }), [raceId]);

  const active = totals[activePeriod];

  return (
    <div className="glass p-5 space-y-4">
      <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Training History</h3>

      {/* Period tabs */}
      <div className="flex gap-1 bg-white/[0.03] rounded p-0.5">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setActivePeriod(p)}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-all ${
              activePeriod === p
                ? 'bg-[#CCF472] text-[#0E0E0E]'
                : 'text-gray-500 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Active period detail */}
      <div className="text-center py-2">
        <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">{PERIOD_SUBLABELS[activePeriod]}</div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/[0.02] rounded-lg p-4 border border-white/[0.05]">
            <div className="text-2xl font-bold text-white">{formatDistance(active.distance)}</div>
            <div className="text-[10px] text-gray-600 uppercase tracking-wider mt-1">Total Distance</div>
          </div>
          <div className="bg-white/[0.02] rounded-lg p-4 border border-white/[0.05]">
            <div className="text-2xl font-bold text-white">{formatDuration(active.time)}</div>
            <div className="text-[10px] text-gray-600 uppercase tracking-wider mt-1">Training Time</div>
          </div>
        </div>
      </div>

      {/* All periods at a glance */}
      <div className="border-t border-white/[0.06] pt-3">
        <div className="grid grid-cols-4 gap-2">
          {PERIODS.map((p) => {
            const t = totals[p];
            const isActive = p === activePeriod;
            return (
              <button
                key={p}
                onClick={() => setActivePeriod(p)}
                className={`text-center p-2 rounded transition-all ${
                  isActive ? 'bg-[#CCF472]/[0.06] border border-[#CCF472]/20' : 'border border-transparent hover:bg-white/[0.03]'
                }`}
              >
                <div className={`text-xs font-semibold ${isActive ? 'text-[#CCF472]' : 'text-gray-400'}`}>
                  {formatDistance(t.distance)}
                </div>
                <div className="text-[9px] text-gray-600 mt-0.5">{formatDuration(t.time)}</div>
                <div className={`text-[8px] uppercase tracking-wider mt-1 ${isActive ? 'text-[#CCF472]/70' : 'text-gray-700'}`}>
                  {PERIOD_LABELS[p]}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
