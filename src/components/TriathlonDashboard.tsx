import { useState } from 'react';
import type { RaceId } from '../types';
import { IRONMAN_CONFIGS, TRI_REFERENCE, GOAL_LEVELS } from '../constants';
import { formatTime, loadFromStorage, saveToStorage } from '../utils';
import StatsCard from './StatsCard';
import LevelTimeline from './LevelTimeline';
import WorkoutLogger from './WorkoutLogger';
import NutritionInsights from './NutritionInsights';

type Discipline = 'swim' | 'bike' | 'run';

interface Props {
  raceId: RaceId;
}

export default function TriathlonDashboard({ raceId }: Props) {
  const config = IRONMAN_CONFIGS[raceId as keyof typeof IRONMAN_CONFIGS];
  const [tab, setTab] = useState<Discipline>('swim');
  const transitionEstimate = raceId === 'ironman-140.6' ? 15 * 60 : 10 * 60;

  const [swimPace, setSwimPace] = useState(() => loadFromStorage(`${raceId}-swim-pace`, 120));
  const [bikeSpeed, setBikeSpeed] = useState(() => loadFromStorage(`${raceId}-bike-speed`, 16));
  const [runPace, setRunPace] = useState(() => loadFromStorage(`${raceId}-run-pace`, 600));

  const swimSplit = (swimPace / 100) * config.swim.meters;
  const bikeSplit = (config.bike.distance / bikeSpeed) * 3600;
  const runSplit = runPace * config.run.distance;
  const totalEstimate = swimSplit + bikeSplit + runSplit + transitionEstimate;

  const handleSwimPace = (v: number) => { setSwimPace(v); saveToStorage(`${raceId}-swim-pace`, v); };
  const handleBikeSpeed = (v: number) => { setBikeSpeed(v); saveToStorage(`${raceId}-bike-speed`, v); };
  const handleRunPace = (v: number) => { setRunPace(v); saveToStorage(`${raceId}-run-pace`, v); };

  const formatSwimPace = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}/100m`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard label="Swim" value={`${config.swim.distance} ${config.swim.unit} (${config.swim.meters}m)`} />
        <StatsCard label="Cycle" value={`${config.bike.distance} ${config.bike.unit}`} />
        <StatsCard label="Run" value={`${config.run.distance} ${config.run.unit}`} />
        <StatsCard label="Total Cutoff" value={config.totalCutoff} />
      </div>

      {config.intermediateCutoffs && (
        <div className="grid grid-cols-2 gap-4">
          <StatsCard label="Swim Cutoff" value={config.intermediateCutoffs.swim} />
          <StatsCard label="Cycle Cutoff" value={config.intermediateCutoffs.bike} />
        </div>
      )}

      <div className="glass p-4 text-center">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Estimated Total Finish Time</div>
        <div className="text-2xl font-bold text-[#CCF472] mt-1">{formatTime(totalEstimate)}</div>
        <div className="text-xs text-gray-500 mt-1">
          Swim {formatTime(swimSplit)} + Cycle {formatTime(bikeSplit)} + Run {formatTime(runSplit)} + T1/T2 ~{formatTime(transitionEstimate)}
        </div>
      </div>

      <div className="flex rounded overflow-hidden border border-white/[0.08]">
        {(['swim', 'bike', 'run'] as Discipline[]).map((d) => (
          <button
            key={d}
            onClick={() => setTab(d)}
            className={`flex-1 px-4 py-2 text-sm font-medium capitalize transition-all ${
              tab === d ? 'bg-[#CCF472] text-[#0E0E0E] font-bold' : 'bg-white/[0.02] text-gray-500 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            {d === 'bike' ? 'Cycle' : d}
          </button>
        ))}
      </div>

      {tab === 'swim' && (
        <div className="glass p-6 space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Swim Pace Calculator</h3>
          <LevelTimeline levels={GOAL_LEVELS['tri-swim']} sliderMin={60} sliderMax={240} />
          <input
            type="range"
            min={60}
            max={240}
            value={swimPace}
            onChange={(e) => handleSwimPace(Number(e.target.value))}
            className="w-full"
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Pace</div>
              <div className="text-xl font-bold text-[#CCF472]">{formatSwimPace(swimPace)}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Estimated Swim Split</div>
              <div className="text-xl font-bold text-white">{formatTime(swimSplit)}</div>
            </div>
          </div>
          <RefTable rows={TRI_REFERENCE.swim} />
        </div>
      )}

      {tab === 'bike' && (
        <div className="glass p-6 space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cycle Speed Calculator</h3>
          <LevelTimeline levels={GOAL_LEVELS['tri-bike']} sliderMin={10} sliderMax={28} />
          <input
            type="range"
            min={10}
            max={28}
            step={0.5}
            value={bikeSpeed}
            onChange={(e) => handleBikeSpeed(Number(e.target.value))}
            className="w-full"
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Average Speed</div>
              <div className="text-xl font-bold text-[#CCF472]">{bikeSpeed} mph</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Estimated Cycle Split</div>
              <div className="text-xl font-bold text-white">{formatTime(bikeSplit)}</div>
            </div>
          </div>
          <RefTable rows={TRI_REFERENCE.bike} />
        </div>
      )}

      {tab === 'run' && (
        <div className="glass p-6 space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Run Pace Calculator</h3>
          <LevelTimeline levels={GOAL_LEVELS['tri-run']} sliderMin={300} sliderMax={960} />
          <input
            type="range"
            min={300}
            max={960}
            value={runPace}
            onChange={(e) => handleRunPace(Number(e.target.value))}
            className="w-full"
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Pace</div>
              <div className="text-xl font-bold text-[#CCF472]">
                {Math.floor(runPace / 60)}:{String(runPace % 60).padStart(2, '0')}/mi
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Estimated Run Split</div>
              <div className="text-xl font-bold text-white">{formatTime(runSplit)}</div>
            </div>
          </div>
          <RefTable rows={TRI_REFERENCE.run} />
        </div>
      )}

      <NutritionInsights
        estimatedSeconds={totalEstimate}
        raceType="triathlon"
        distanceMiles={config.swim.distance + config.bike.distance + config.run.distance}
      />

      <WorkoutLogger raceId={raceId} />
    </div>
  );
}

function RefTable({ rows }: { rows: { level: string; pace: string }[] }) {
  return (
    <table className="w-full text-sm mt-4">
      <thead>
        <tr className="border-b border-white/[0.06]">
          <th className="text-left py-2 font-medium text-gray-500">Level</th>
          <th className="text-left py-2 font-medium text-gray-500">Pace / Speed</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.level} className="border-b border-white/[0.04] last:border-0">
            <td className="py-2 font-medium text-white">{r.level}</td>
            <td className="py-2 text-gray-400">{r.pace}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
