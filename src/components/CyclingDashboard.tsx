import { useState } from 'react';
import { CYCLING_REFERENCE, GOAL_LEVELS } from '../constants';
import { formatTime, loadFromStorage, saveToStorage } from '../utils';
import StatsCard from './StatsCard';
import LevelTimeline from './LevelTimeline';
import WorkoutLogger from './WorkoutLogger';
import NutritionInsights from './NutritionInsights';
import ActivityCharts from './ActivityCharts';

export default function CyclingDashboard() {
  const [speed, setSpeed] = useState(() => loadFromStorage('cycling-speed', 16));
  const [distance, setDistance] = useState(() => loadFromStorage('cycling-distance', 50));

  const handleSpeed = (v: number) => { setSpeed(v); saveToStorage('cycling-speed', v); };
  const handleDistance = (v: number) => { setDistance(v); saveToStorage('cycling-distance', v); };

  const rideSplit = (distance / speed) * 3600;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard label="Discipline" value="Road Cycling" />
        <StatsCard label="Weekly Goal" value="100 miles" />
        <StatsCard label="Avg Recreational" value="14-17 mph" />
        <StatsCard label="Avg Competitive" value="18-21 mph" />
      </div>

      <div className="glass p-6 space-y-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ride Calculator</h3>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Distance</span>
              <span>{distance} miles</span>
            </div>
            <input
              type="range"
              min={5}
              max={150}
              value={distance}
              onChange={(e) => handleDistance(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Average Speed</span>
              <span>{speed} mph</span>
            </div>
            <LevelTimeline levels={GOAL_LEVELS['cycling-speed']} sliderMin={8} sliderMax={30} />
            <input
              type="range"
              min={8}
              max={30}
              step={0.5}
              value={speed}
              onChange={(e) => handleSpeed(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Average Speed</div>
            <div className="text-xl font-bold text-[#CCF472]">{speed} mph</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Estimated Ride Time</div>
            <div className="text-xl font-bold text-white">{formatTime(rideSplit)}</div>
          </div>
        </div>
      </div>

      <div className="glass-table">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left px-4 py-3 font-medium">Level</th>
              <th className="text-left px-4 py-3 font-medium">Average Speed</th>
              <th className="text-left px-4 py-3 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {CYCLING_REFERENCE.map((row) => (
              <tr key={row.level}>
                <td className="px-4 py-3 font-medium text-white">{row.level}</td>
                <td className="px-4 py-3">{row.speed}</td>
                <td className="px-4 py-3 text-gray-500">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <WorkoutLogger raceId="cycling" />

      <ActivityCharts raceId="cycling" />

      <NutritionInsights estimatedSeconds={rideSplit} raceType="cycling" distanceMiles={distance} />
    </div>
  );
}
