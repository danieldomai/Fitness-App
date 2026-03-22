import { useState } from 'react';
import type { Gender, Division } from '../types';
import { HYROX_STATIONS, HYROX_WEIGHTS, GOAL_LEVELS } from '../constants';
import { formatTime, loadFromStorage, saveToStorage } from '../utils';
import StatsCard from './StatsCard';
import LevelTimeline from './LevelTimeline';
import WorkoutLogger from './WorkoutLogger';
import NutritionInsights from './NutritionInsights';
import ActivityCharts from './ActivityCharts';
import TrainingHistory from './TrainingHistory';

export default function HyroxDashboard() {
  const [gender, setGender] = useState<Gender>(() => loadFromStorage('hyrox-gender', 'men'));
  const [division, setDivision] = useState<Division>(() => loadFromStorage('hyrox-division', 'open'));
  const [goalSeconds, setGoalSeconds] = useState(() => loadFromStorage('hyrox-goal', 4800));
  const [stationGoals, setStationGoals] = useState<Record<number, number>>(() =>
    loadFromStorage('hyrox-station-goals', {})
  );
  const [stationGoalInputs, setStationGoalInputs] = useState<Record<number, string>>(() =>
    loadFromStorage('hyrox-station-goal-inputs', {})
  );

  const wrMen = '55:17';
  const wrWomen = '59:22';
  const wr = gender === 'men' ? wrMen : wrWomen;
  const wrAthlete = gender === 'men' ? 'Hunter McIntyre' : 'Lauren Weeks';

  const handleGender = (g: Gender) => {
    setGender(g);
    saveToStorage('hyrox-gender', g);
  };
  const handleDivision = (d: Division) => {
    setDivision(d);
    saveToStorage('hyrox-division', d);
  };
  const handleGoal = (val: number) => {
    setGoalSeconds(val);
    saveToStorage('hyrox-goal', val);
  };
  const handleStationGoalInput = (idx: number, raw: string) => {
    const updated = { ...stationGoalInputs, [idx]: raw };
    setStationGoalInputs(updated);
    saveToStorage('hyrox-station-goal-inputs', updated);

    let seconds = 0;
    if (raw.includes(':')) {
      const [m, s] = raw.split(':').map(Number);
      seconds = (m || 0) * 60 + (s || 0);
    } else {
      const mins = parseFloat(raw);
      if (!isNaN(mins)) seconds = Math.round(mins * 60);
    }
    const updatedGoals = { ...stationGoals, [idx]: seconds };
    setStationGoals(updatedGoals);
    saveToStorage('hyrox-station-goals', updatedGoals);
  };

  const projectedTotal = Object.values(stationGoals).reduce((sum, s) => sum + s, 0);

  const getWeight = (exercise: string): string | null => {
    const w = HYROX_WEIGHTS[exercise as keyof typeof HYROX_WEIGHTS];
    if (!w) return null;
    return w[division][gender];
  };

  const getDistanceReps = (station: typeof HYROX_STATIONS[number]): string => {
    if (station.exercise === 'Wall Balls') {
      if (division === 'pro') {
        return gender === 'men' ? '100 reps' : '75 reps';
      }
      return gender === 'men' ? '75 reps' : '50 reps';
    }
    return station.distanceReps;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard label="Total Running" value="8km (8 x 1km)" />
        <StatsCard label={`World Record (${gender === 'men' ? 'Men' : 'Women'})`} value={`${wr} - ${wrAthlete}`} />
        <StatsCard label="Avg Finisher (Open)" value="1:20:00" />
        <StatsCard label="Stations" value="8" />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex rounded overflow-hidden border border-white/[0.08]">
          {(['men', 'women'] as Gender[]).map((g) => (
            <button
              key={g}
              onClick={() => handleGender(g)}
              className={`px-4 py-2 text-sm font-medium transition-all ${
                gender === g
                  ? 'bg-[#CCF472] text-[#0E0E0E] font-bold'
                  : 'bg-white/[0.02] text-gray-500 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {g === 'men' ? 'Men' : 'Women'}
            </button>
          ))}
        </div>
        <div className="flex rounded overflow-hidden border border-white/[0.08]">
          {(['open', 'pro'] as Division[]).map((d) => (
            <button
              key={d}
              onClick={() => handleDivision(d)}
              className={`px-4 py-2 text-sm font-medium transition-all ${
                division === d
                  ? 'bg-[#CCF472] text-[#0E0E0E] font-bold'
                  : 'bg-white/[0.02] text-gray-500 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="glass p-6 space-y-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Goal Time</h3>
        <LevelTimeline levels={GOAL_LEVELS['hyrox']} sliderMin={55 * 60} sliderMax={2.5 * 3600} />
        <input
          type="range"
          min={55 * 60}
          max={2.5 * 3600}
          value={goalSeconds}
          onChange={(e) => handleGoal(Number(e.target.value))}
          className="w-full"
        />
        <div className="text-2xl font-bold text-[#CCF472]">{formatTime(goalSeconds)}</div>
      </div>

      <div className="glass-table">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-3 py-3 font-medium">Station</th>
                <th className="text-left px-3 py-3 font-medium">Exercise</th>
                <th className="text-left px-3 py-3 font-medium">Distance/Reps</th>
                <th className="text-left px-3 py-3 font-medium">Weight</th>
                <th className="text-left px-3 py-3 font-medium">Elite</th>
                <th className="text-left px-3 py-3 font-medium">Average</th>
                <th className="text-left px-3 py-3 font-medium">Your Goal</th>
              </tr>
            </thead>
            <tbody>
              {HYROX_STATIONS.map((station, idx) => {
                const weight = getWeight(station.exercise);
                const isRun = station.label.startsWith('Run');
                return (
                  <tr
                    key={idx}
                    className={isRun ? 'bg-white/[0.02]' : ''}
                  >
                    <td className="px-3 py-2 font-medium text-gray-300">{station.label}</td>
                    <td className="px-3 py-2">{station.exercise}</td>
                    <td className="px-3 py-2">{getDistanceReps(station)}</td>
                    <td className="px-3 py-2 text-gray-600">{weight || '-'}</td>
                    <td className="px-3 py-2 text-gray-400">{station.eliteTarget}</td>
                    <td className="px-3 py-2">{station.avgTarget}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        placeholder="M:SS"
                        value={stationGoalInputs[idx] ?? ''}
                        onChange={(e) => handleStationGoalInput(idx, e.target.value)}
                        className="w-20 glass-input px-2 py-1 text-sm"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {projectedTotal > 0 && (
          <div className="border-t border-white/[0.06] px-4 py-3 bg-white/[0.02] flex justify-between items-center">
            <span className="text-sm font-medium text-gray-400">Projected Total</span>
            <span className="text-lg font-bold text-[#CCF472]">{formatTime(projectedTotal)}</span>
          </div>
        )}
      </div>

      <WorkoutLogger raceId="hyrox" />

      <ActivityCharts raceId="hyrox" />

      <TrainingHistory raceId="hyrox" />

      <NutritionInsights estimatedSeconds={goalSeconds} raceType="hyrox" />
    </div>
  );
}
