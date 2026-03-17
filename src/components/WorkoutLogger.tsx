import { useState } from 'react';
import type { RaceId } from '../types';
import { WEEKLY_GOALS } from '../constants';
import { getWeekKey, getPastWeekKeys, formatWeekLabel, loadFromStorage, saveToStorage } from '../utils';

interface Props {
  raceId: RaceId;
}

const DISCIPLINE_LABELS: Record<string, { label: string; unit: string }> = {
  run: { label: 'Run', unit: 'mi' },
  swim: { label: 'Swim', unit: 'km' },
  bike: { label: 'Bike', unit: 'mi' },
  skierg: { label: 'SkiErg', unit: 'sessions' },
  'sled-push': { label: 'Sled Push', unit: 'sessions' },
  'sled-pull': { label: 'Sled Pull', unit: 'sessions' },
  'burpee-broad-jump': { label: 'Burpee Broad Jump', unit: 'sessions' },
  rowing: { label: 'Rowing', unit: 'sessions' },
  'farmers-carry': { label: 'Farmers Carry', unit: 'sessions' },
  'sandbag-lunges': { label: 'Sandbag Lunges', unit: 'sessions' },
  'wall-balls': { label: 'Wall Balls', unit: 'sessions' },
  ride: { label: 'Ride', unit: 'mi' },
};

function parseTimeInput(raw: string): number {
  if (!raw) return 0;
  if (raw.includes(':')) {
    const parts = raw.split(':').map(Number);
    if (parts.length === 3) return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }
  const mins = parseFloat(raw);
  return isNaN(mins) ? 0 : Math.round(mins * 60);
}

function formatShortTime(seconds: number): string {
  if (seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function WorkoutLogger({ raceId }: Props) {
  const weekKey = getWeekKey();
  const storageKey = `workouts-${raceId}-${weekKey}`;
  const timeStorageKey = `workout-times-${raceId}-${weekKey}`;
  const hrStorageKey = `hr-${raceId}-${weekKey}`;
  const goals = WEEKLY_GOALS[raceId];
  const disciplines = Object.keys(goals);

  const [totals, setTotals] = useState<Record<string, number>>(() =>
    loadFromStorage(storageKey, Object.fromEntries(disciplines.map((d) => [d, 0])))
  );
  const [inputs, setInputs] = useState<Record<string, string>>(
    Object.fromEntries(disciplines.map((d) => [d, '']))
  );
  const [timeTotals, setTimeTotals] = useState<Record<string, number>>(() =>
    loadFromStorage(timeStorageKey, Object.fromEntries(disciplines.map((d) => [d, 0])))
  );
  const [timeInputs, setTimeInputs] = useState<Record<string, string>>(
    Object.fromEntries(disciplines.map((d) => [d, '']))
  );
  const [hrInput, setHrInput] = useState('');
  const [hrHistory, setHrHistory] = useState<number[]>(() =>
    loadFromStorage<number[]>(hrStorageKey, [])
  );

  const avgHr = hrHistory.length > 0
    ? Math.round(hrHistory.reduce((a, b) => a + b, 0) / hrHistory.length)
    : null;

  const handleLog = () => {
    const updated = { ...totals };
    for (const d of disciplines) {
      const val = parseFloat(inputs[d]);
      if (val > 0) {
        updated[d] = (updated[d] || 0) + val;
      }
    }
    setTotals(updated);
    saveToStorage(storageKey, updated);
    setInputs(Object.fromEntries(disciplines.map((d) => [d, ''])));

    const updatedTime = { ...timeTotals };
    for (const d of disciplines) {
      const secs = parseTimeInput(timeInputs[d]);
      if (secs > 0) {
        updatedTime[d] = (updatedTime[d] || 0) + secs;
      }
    }
    setTimeTotals(updatedTime);
    saveToStorage(timeStorageKey, updatedTime);
    setTimeInputs(Object.fromEntries(disciplines.map((d) => [d, ''])));

    const hr = parseInt(hrInput);
    if (hr > 0) {
      const updatedHr = [...hrHistory, hr];
      setHrHistory(updatedHr);
      saveToStorage(hrStorageKey, updatedHr);
      setHrInput('');
    }
  };

  const pastWeeks = getPastWeekKeys(5);
  const history = pastWeeks.map((wk) => {
    const wkHr = wk === weekKey ? hrHistory : loadFromStorage<number[]>(`hr-${raceId}-${wk}`, []);
    const wkAvgHr = wkHr.length > 0
      ? Math.round(wkHr.reduce((a: number, b: number) => a + b, 0) / wkHr.length)
      : null;
    return {
      weekKey: wk,
      label: formatWeekLabel(wk),
      isCurrent: wk === weekKey,
      data: wk === weekKey ? totals : loadFromStorage<Record<string, number>>(`workouts-${raceId}-${wk}`, {}),
      timeData: wk === weekKey ? timeTotals : loadFromStorage<Record<string, number>>(`workout-times-${raceId}-${wk}`, {}),
      avgHr: wkAvgHr,
    };
  });

  return (
    <div className="space-y-6">
      <div className="glass p-6 space-y-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Weekly Workout Log</h3>

        <div className={`grid gap-3 ${disciplines.length > 3 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
          {disciplines.map((d) => {
            const info = DISCIPLINE_LABELS[d] || { label: d, unit: '' };
            return (
              <div key={d} className="flex items-center bg-white/[0.02] rounded-lg px-3 py-2 min-w-0 gap-2 border border-white/[0.05]">
                <label className="text-sm font-medium text-gray-400 w-36 shrink-0">{info.label}</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  value={inputs[d]}
                  onChange={(e) => setInputs({ ...inputs, [d]: e.target.value })}
                  className="w-16 shrink-0 glass-input px-2 py-1.5 text-sm"
                />
                <span className="text-xs text-gray-600 shrink-0">{info.unit}</span>
                <input
                  type="text"
                  placeholder="M:SS"
                  value={timeInputs[d]}
                  onChange={(e) => setTimeInputs({ ...timeInputs, [d]: e.target.value })}
                  className="w-16 shrink-0 glass-input px-2 py-1.5 text-sm"
                />
                <span className="text-xs text-gray-600 shrink-0">time</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2 min-w-0">
          <label className="text-sm font-medium text-gray-400 w-36 shrink-0">Avg Heart Rate</label>
          <input
            type="number"
            min="30"
            max="250"
            placeholder="bpm"
            value={hrInput}
            onChange={(e) => setHrInput(e.target.value)}
            className="w-20 shrink-0 glass-input px-3 py-1.5 text-sm"
          />
          <span className="text-xs text-gray-600 ml-2 shrink-0">bpm</span>
          {avgHr && (
            <span className="text-xs text-gray-500 ml-auto shrink-0">Week avg: {avgHr} bpm</span>
          )}
        </div>

        <button onClick={handleLog} className="glow-btn px-6 py-2.5 text-sm font-medium">
          Log Workout
        </button>

        <div className="space-y-3 pt-2">
          {disciplines.map((d) => {
            const info = DISCIPLINE_LABELS[d] || { label: d, unit: '' };
            const goal = goals[d] || 0;
            const current = totals[d] || 0;
            const pct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
            const time = timeTotals[d] || 0;
            return (
              <div key={d} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-400">{info.label}</span>
                  <span className="text-gray-500">
                    {current.toFixed(1)} / {goal} {info.unit}
                    {time > 0 && <span className="ml-2 text-gray-600">({formatShortTime(time)})</span>}
                  </span>
                </div>
                <div className="w-full bg-white/[0.06] rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#1E6F6B] transition-all"
                    style={{ width: `${pct}%`, opacity: 0.85 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass p-6 space-y-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Weekly Workout History</h3>

        <div className="space-y-3">
          {history.map(({ weekKey: wk, label, isCurrent, data, timeData, avgHr: wkAvgHr }) => {
            const hasData = disciplines.some((d) => (data[d] || 0) > 0) || wkAvgHr !== null;
            return (
              <div key={wk} className={`border rounded-lg p-4 ${isCurrent ? 'border-[#1E6F6B]/30 bg-[#1E6F6B]/[0.03]' : 'border-white/[0.05] bg-white/[0.02]'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-400">{label}</span>
                  <div className="flex items-center gap-2">
                    {wkAvgHr && (
                      <span className="text-xs text-gray-500">{wkAvgHr} bpm avg</span>
                    )}
                    {isCurrent && (
                      <span className="text-[10px] font-semibold text-[#1E6F6B] bg-[#1E6F6B]/10 px-2 py-0.5 rounded uppercase tracking-wider">Current</span>
                    )}
                  </div>
                </div>
                {hasData ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                    {disciplines.map((d) => {
                      const info = DISCIPLINE_LABELS[d] || { label: d, unit: '' };
                      const val = data[d] || 0;
                      const goal = goals[d] || 0;
                      const time = timeData[d] || 0;
                      if (val === 0 && !isCurrent) return null;
                      return (
                        <div key={d} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{info.label}</span>
                          <span className="text-sm font-semibold text-gray-300">
                            {val.toFixed(1)}{' '}
                            <span className="text-xs font-normal text-gray-600">/ {goal} {info.unit}</span>
                            {time > 0 && (
                              <span className="text-xs font-normal text-gray-600 ml-1">({formatShortTime(time)})</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-xs text-gray-600">No workouts logged</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
