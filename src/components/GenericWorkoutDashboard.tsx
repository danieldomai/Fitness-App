import { RACES } from '../constants';
import type { RaceId } from '../types';
import WorkoutLogger from './WorkoutLogger';
import ActivityCharts from './ActivityCharts';

interface Props {
  raceId: RaceId;
}

export default function GenericWorkoutDashboard({ raceId }: Props) {
  const race = RACES.find(r => r.id === raceId);

  return (
    <div className="space-y-6">
      <div className="glass p-5">
        <h2 className="text-lg font-bold text-white">{race?.name || raceId}</h2>
        <p className="text-sm text-gray-500 mt-1">{race?.description}</p>
      </div>
      <ActivityCharts raceId={raceId} />
      <WorkoutLogger raceId={raceId} />
    </div>
  );
}
