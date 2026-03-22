import type { Race, RaceId, ReferenceRow, HyroxStation } from './types';

export const RACES: Race[] = [
  { id: 'half-marathon', name: 'Half Marathon', icon: 'HM', description: '13.1 miles', category: 'race' },
  { id: 'marathon', name: 'Marathon', icon: 'M', description: '26.2 miles', category: 'race' },
  { id: 'hyrox', name: 'Hyrox', icon: 'HX', description: '8 stations + 8km run', category: 'race' },
  { id: 'ironman-70.3', name: 'Ironman 70.3', icon: '70.3', description: 'Swim + Bike + Run', category: 'race' },
  { id: 'ironman-140.6', name: 'Ironman 140.6', icon: '140.6', description: 'Full Ironman', category: 'race' },
  { id: 'running', name: 'Running', icon: 'RN', description: 'General running & trail', category: 'workout' },
  { id: 'swimming', name: 'Swimming', icon: 'SW', description: 'Pool & open water', category: 'workout' },
  { id: 'cycling', name: 'Cycling', icon: 'CY', description: 'Road & indoor riding', category: 'workout' },
  { id: 'climbing', name: 'Climbing', icon: 'CL', description: 'Bouldering & sport climbing', category: 'workout' },
  { id: 'surfing', name: 'Surfing', icon: 'SF', description: 'Ocean & wave sports', category: 'workout' },
  { id: 'snowboarding', name: 'Snowboarding', icon: 'SB', description: 'Mountain & park riding', category: 'workout' },
];

export const RACE_STATS: Record<string, { distance: string; worldRecord: string; cutoff: string; avgFinisher: string }> = {
  'half-marathon': { distance: '13.1 miles (21.1 km)', worldRecord: '57:31', cutoff: '3:30:00', avgFinisher: '2:01:00' },
  'marathon': { distance: '26.2 miles (42.2 km)', worldRecord: '2:00:35', cutoff: '6:00:00', avgFinisher: '4:21:00' },
};

export const RACE_SLIDER_RANGES: Record<string, { min: number; max: number; wrSeconds: number; cutoffSeconds: number }> = {
  'half-marathon': { min: 57 * 60 + 31, max: 3.5 * 3600, wrSeconds: 57 * 60 + 31, cutoffSeconds: 3.5 * 3600 },
  'marathon': { min: 2 * 3600 + 35, max: 6 * 3600, wrSeconds: 2 * 3600 + 35, cutoffSeconds: 6 * 3600 },
};

export const RACE_DISTANCES_MI: Record<string, number> = {
  'half-marathon': 13.1,
  'marathon': 26.2,
};

export const REFERENCE_TABLES: Record<string, ReferenceRow[]> = {
  'half-marathon': [
    { level: 'Elite', time: '1:00:00 - 1:10:00', pace: '4:35 - 5:21/mi' },
    { level: 'Competitive', time: '1:20:00 - 1:40:00', pace: '6:06 - 7:38/mi' },
    { level: 'Average', time: '1:50:00 - 2:10:00', pace: '8:24 - 9:55/mi' },
    { level: 'Beginner', time: '2:15:00 - 2:45:00', pace: '10:18 - 12:36/mi' },
    { level: 'Cutoff', time: '3:30:00', pace: '16:02/mi' },
  ],
  'marathon': [
    { level: 'Elite', time: '2:05:00 - 2:20:00', pace: '4:47 - 5:21/mi' },
    { level: 'Competitive', time: '2:45:00 - 3:15:00', pace: '6:18 - 7:27/mi' },
    { level: 'Average', time: '3:30:00 - 4:30:00', pace: '8:01 - 10:18/mi' },
    { level: 'Beginner', time: '4:30:00 - 5:30:00', pace: '10:18 - 12:36/mi' },
    { level: 'Cutoff', time: '6:00:00', pace: '13:44/mi' },
  ],
};

export const HYROX_STATIONS: HyroxStation[] = [
  { label: 'Run 1', exercise: '1km Run', distanceReps: '1km', eliteTarget: '~3:30', avgTarget: '~5:30' },
  { label: '1', exercise: 'SkiErg', distanceReps: '1,000m', eliteTarget: '~3:30', avgTarget: '~5:30' },
  { label: 'Run 2', exercise: '1km Run', distanceReps: '1km', eliteTarget: '~3:30', avgTarget: '~5:30' },
  { label: '2', exercise: 'Sled Push', distanceReps: '50m', eliteTarget: '~0:25', avgTarget: '~1:30' },
  { label: 'Run 3', exercise: '1km Run', distanceReps: '1km', eliteTarget: '~3:30', avgTarget: '~5:45' },
  { label: '3', exercise: 'Sled Pull', distanceReps: '50m', eliteTarget: '~0:30', avgTarget: '~1:45' },
  { label: 'Run 4', exercise: '1km Run', distanceReps: '1km', eliteTarget: '~3:45', avgTarget: '~6:00' },
  { label: '4', exercise: 'Burpee Broad Jump', distanceReps: '80m', eliteTarget: '~1:45', avgTarget: '~4:00' },
  { label: 'Run 5', exercise: '1km Run', distanceReps: '1km', eliteTarget: '~3:45', avgTarget: '~6:00' },
  { label: '5', exercise: 'Rowing', distanceReps: '1,000m', eliteTarget: '~3:20', avgTarget: '~5:00' },
  { label: 'Run 6', exercise: '1km Run', distanceReps: '1km', eliteTarget: '~3:45', avgTarget: '~6:15' },
  { label: '6', exercise: 'Farmers Carry', distanceReps: '200m', eliteTarget: '~1:00', avgTarget: '~2:30' },
  { label: 'Run 7', exercise: '1km Run', distanceReps: '1km', eliteTarget: '~3:45', avgTarget: '~6:15' },
  { label: '7', exercise: 'Sandbag Lunges', distanceReps: '100m', eliteTarget: '~2:00', avgTarget: '~4:30' },
  { label: 'Run 8', exercise: '1km Run', distanceReps: '1km', eliteTarget: '~4:00', avgTarget: '~6:30' },
  { label: '8', exercise: 'Wall Balls', distanceReps: '75 reps (men) / 50 reps (women)', eliteTarget: '~2:30', avgTarget: '~5:30' },
];

export const HYROX_WEIGHTS = {
  'Sled Push': { open: { men: '152kg', women: '102kg' }, pro: { men: '202kg', women: '152kg' } },
  'Sled Pull': { open: { men: '103kg', women: '78kg' }, pro: { men: '153kg', women: '103kg' } },
  'Farmers Carry': { open: { men: '2x24kg', women: '2x16kg' }, pro: { men: '2x32kg', women: '2x24kg' } },
  'Sandbag Lunges': { open: { men: '20kg', women: '10kg' }, pro: { men: '30kg', women: '20kg' } },
  'Wall Balls': { open: { men: '9kg / 75 reps', women: '6kg / 50 reps' }, pro: { men: '9kg / 100 reps', women: '6kg / 75 reps' } },
};

export const IRONMAN_CONFIGS = {
  'ironman-70.3': {
    name: 'Ironman 70.3',
    swim: { distance: 1.2, unit: 'miles', meters: 1900, cutoff: null },
    bike: { distance: 56, unit: 'miles' },
    run: { distance: 13.1, unit: 'miles' },
    totalCutoff: '8:30:00',
    totalCutoffSeconds: 8.5 * 3600,
    intermediateCutoffs: null,
  },
  'ironman-140.6': {
    name: 'Ironman 140.6',
    swim: { distance: 2.4, unit: 'miles', meters: 3800, cutoff: '2:20:00' },
    bike: { distance: 112, unit: 'miles' },
    run: { distance: 26.2, unit: 'miles' },
    totalCutoff: '17:00:00',
    totalCutoffSeconds: 17 * 3600,
    intermediateCutoffs: { swim: '2:20:00', bike: '10:30:00' },
  },
};

export const TRI_REFERENCE = {
  swim: [
    { level: 'Elite', pace: '1:15/100m', note: '' },
    { level: 'Competitive', pace: '1:30/100m', note: '' },
    { level: 'Average', pace: '2:00/100m', note: '' },
    { level: 'Beginner', pace: '2:30/100m', note: '' },
  ],
  bike: [
    { level: 'Elite', pace: '22+ mph', note: '' },
    { level: 'Competitive', pace: '18-21 mph', note: '' },
    { level: 'Average', pace: '15-17 mph', note: '' },
    { level: 'Beginner', pace: '12-14 mph', note: '' },
  ],
  run: [
    { level: 'Elite', pace: '6:00-7:00/mi', note: '' },
    { level: 'Competitive', pace: '7:30-8:30/mi', note: '' },
    { level: 'Average', pace: '9:00-11:00/mi', note: '' },
    { level: 'Beginner', pace: '11:00-14:00/mi', note: '' },
  ],
};

export const WEEKLY_GOALS: Record<RaceId, Record<string, number>> = {
  'half-marathon': { run: 20 },
  'marathon': { run: 30 },
  'hyrox': { run: 15, skierg: 3, 'sled-push': 2, 'sled-pull': 2, 'burpee-broad-jump': 2, rowing: 3, 'farmers-carry': 2, 'sandbag-lunges': 2, 'wall-balls': 2 },
  'ironman-70.3': { run: 20, swim: 5, bike: 80 },
  'ironman-140.6': { run: 30, swim: 8, bike: 120 },
  'cycling': { ride: 100 },
  'running': { run: 25 },
  'swimming': { swim: 10 },
  'climbing': { climb: 5 },
  'surfing': { surf: 4 },
  'snowboarding': { snowboard: 4 },
};


export const CYCLING_REFERENCE = [
  { level: 'Elite', speed: '22+ mph', note: 'Cat 1/2 racers' },
  { level: 'Competitive', speed: '18-21 mph', note: 'Cat 3/4 racers' },
  { level: 'Average', speed: '14-17 mph', note: 'Regular riders' },
  { level: 'Beginner', speed: '10-13 mph', note: 'New to cycling' },
];

export const GOAL_LEVELS = {
  'half-marathon': [
    { label: 'Elite', min: 3451, max: 4500 },
    { label: 'Competitive', min: 4500, max: 6300 },
    { label: 'Average', min: 6300, max: 8100 },
    { label: 'Beginner', min: 8100, max: 12600 },
  ],
  'marathon': [
    { label: 'Elite', min: 7235, max: 8700 },
    { label: 'Competitive', min: 8700, max: 12000 },
    { label: 'Average', min: 12000, max: 16200 },
    { label: 'Beginner', min: 16200, max: 21600 },
  ],
  'hyrox': [
    { label: 'Elite', min: 3300, max: 3900 },
    { label: 'Competitive', min: 3900, max: 4800 },
    { label: 'Average', min: 4800, max: 6000 },
    { label: 'Beginner', min: 6000, max: 9000 },
  ],
  'tri-swim': [
    { label: 'Elite', min: 60, max: 80 },
    { label: 'Competitive', min: 80, max: 110 },
    { label: 'Average', min: 110, max: 160 },
    { label: 'Beginner', min: 160, max: 240 },
  ],
  'tri-bike': [
    { label: 'Beginner', min: 10, max: 14 },
    { label: 'Average', min: 14, max: 18 },
    { label: 'Competitive', min: 18, max: 22 },
    { label: 'Elite', min: 22, max: 28 },
  ],
  'tri-run': [
    { label: 'Elite', min: 300, max: 420 },
    { label: 'Competitive', min: 420, max: 510 },
    { label: 'Average', min: 510, max: 660 },
    { label: 'Beginner', min: 660, max: 960 },
  ],
  'cycling-speed': [
    { label: 'Beginner', min: 8, max: 13 },
    { label: 'Average', min: 13, max: 18 },
    { label: 'Competitive', min: 18, max: 22 },
    { label: 'Elite', min: 22, max: 30 },
  ],
};
