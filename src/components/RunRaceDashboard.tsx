import { useState } from 'react';
import type { RaceId } from '../types';
import { RACE_STATS, RACE_SLIDER_RANGES, RACE_DISTANCES_MI, REFERENCE_TABLES, GOAL_LEVELS } from '../constants';
import { loadFromStorage, saveToStorage } from '../utils';
import StatsCard from './StatsCard';
import GoalSlider from './GoalSlider';
import ReferenceTable from './ReferenceTable';
import WorkoutLogger from './WorkoutLogger';
import NutritionInsights from './NutritionInsights';

interface Props {
  raceId: RaceId;
}

export default function RunRaceDashboard({ raceId }: Props) {
  const stats = RACE_STATS[raceId];
  const slider = RACE_SLIDER_RANGES[raceId];
  const distance = RACE_DISTANCES_MI[raceId];
  const reference = REFERENCE_TABLES[raceId];

  const storageKey = `goal-${raceId}`;
  const [goalSeconds, setGoalSeconds] = useState(() =>
    loadFromStorage(storageKey, Math.round((slider.min + slider.max) / 2))
  );

  const handleGoalChange = (val: number) => {
    setGoalSeconds(val);
    saveToStorage(storageKey, val);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard label="Distance" value={stats.distance} />
        <StatsCard label="World Record" value={stats.worldRecord} />
        <StatsCard label="Official Cutoff" value={stats.cutoff} />
        <StatsCard label="Avg Finisher" value={stats.avgFinisher} />
      </div>

      <GoalSlider
        value={goalSeconds}
        min={slider.min}
        max={slider.max}
        wrSeconds={slider.wrSeconds}
        cutoffSeconds={slider.cutoffSeconds}
        distanceMiles={distance}
        levels={GOAL_LEVELS[raceId as keyof typeof GOAL_LEVELS]}
        onChange={handleGoalChange}
      />

      <ReferenceTable rows={reference} />

      <NutritionInsights estimatedSeconds={goalSeconds} raceType="run" distanceMiles={distance} />

      <WorkoutLogger raceId={raceId} />
    </div>
  );
}
