export type RaceId = 'half-marathon' | 'marathon' | 'hyrox' | 'ironman-70.3' | 'ironman-140.6' | 'cycling' | 'running' | 'swimming' | 'climbing' | 'surfing' | 'snowboarding';

export interface Race {
  id: RaceId;
  name: string;
  icon: string;
  description: string;
  category?: 'race' | 'workout';
}

export interface ReferenceRow {
  level: string;
  time: string;
  pace: string;
}

export interface HyroxStation {
  label: string;
  exercise: string;
  distanceReps: string;
  eliteTarget: string;
  avgTarget: string;
}

export type Gender = 'men' | 'women';
export type Division = 'open' | 'pro';

export interface WorkoutEntry {
  date: string;
  distances: Record<string, number>;
}

export type WeeklyGoals = Record<string, number>;
