/**
 * Database layer — in-memory cache backed by Supabase.
 *
 * On app start, `hydrateCache()` fetches all data from Supabase and populates
 * an in-memory Map.  Components use the synchronous `cacheGet` / `cacheSet`
 * helpers (same signature as the old localStorage helpers).  Every `cacheSet`
 * also fires an async Supabase write in the background.
 *
 * ── Required Supabase tables ──
 *
 *   workout_logs   (id, race, discipline, distance, unit, logged_at, week_start)
 *   goal_times     (id, race, goal_minutes, updated_at)
 *   station_goals  (id, station_name, goal_seconds, updated_at)
 *
 *   user_settings  (key text PRIMARY KEY, value jsonb, updated_at timestamptz)
 *     ↑ Run this SQL in your Supabase dashboard if the table doesn't exist:
 *
 *       CREATE TABLE IF NOT EXISTS user_settings (
 *         key text PRIMARY KEY,
 *         value jsonb NOT NULL DEFAULT '{}',
 *         updated_at timestamptz DEFAULT now()
 *       );
 *       ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
 *       CREATE POLICY "Allow all" ON user_settings FOR ALL USING (true);
 */

import { supabase } from './supabase';
import { HYROX_STATIONS } from '../constants';

// ── Cross-race discipline mapping for progress tracking ─────────────────────
// When a workout is logged for one race, its disciplines can also count
// toward progress in related races (e.g. cycling "ride" → ironman "bike").
// This is used during hydration and live logging to update progress caches.
export const CROSS_RACE_PROGRESS: { from: { race: string; disc: string }; to: { race: string; disc: string } }[] = [
  // Cycling ↔ Ironman bike
  { from: { race: 'cycling', disc: 'ride' }, to: { race: 'ironman-70.3', disc: 'bike' } },
  { from: { race: 'cycling', disc: 'ride' }, to: { race: 'ironman-140.6', disc: 'bike' } },
  { from: { race: 'ironman-70.3', disc: 'bike' }, to: { race: 'cycling', disc: 'ride' } },
  { from: { race: 'ironman-140.6', disc: 'bike' }, to: { race: 'cycling', disc: 'ride' } },
  // Running ↔ races with run
  { from: { race: 'running', disc: 'run' }, to: { race: 'half-marathon', disc: 'run' } },
  { from: { race: 'running', disc: 'run' }, to: { race: 'marathon', disc: 'run' } },
  { from: { race: 'running', disc: 'run' }, to: { race: 'hyrox', disc: 'run' } },
  { from: { race: 'running', disc: 'run' }, to: { race: 'ironman-70.3', disc: 'run' } },
  { from: { race: 'running', disc: 'run' }, to: { race: 'ironman-140.6', disc: 'run' } },
  { from: { race: 'half-marathon', disc: 'run' }, to: { race: 'running', disc: 'run' } },
  { from: { race: 'marathon', disc: 'run' }, to: { race: 'running', disc: 'run' } },
  { from: { race: 'hyrox', disc: 'run' }, to: { race: 'running', disc: 'run' } },
  { from: { race: 'ironman-70.3', disc: 'run' }, to: { race: 'running', disc: 'run' } },
  { from: { race: 'ironman-140.6', disc: 'run' }, to: { race: 'running', disc: 'run' } },
  // Swimming ↔ Ironman swim
  { from: { race: 'swimming', disc: 'swim' }, to: { race: 'ironman-70.3', disc: 'swim' } },
  { from: { race: 'swimming', disc: 'swim' }, to: { race: 'ironman-140.6', disc: 'swim' } },
  { from: { race: 'ironman-70.3', disc: 'swim' }, to: { race: 'swimming', disc: 'swim' } },
  { from: { race: 'ironman-140.6', disc: 'swim' }, to: { race: 'swimming', disc: 'swim' } },
];

// ── In-memory cache ──────────────────────────────────────────────────────────

const store = new Map<string, unknown>();

export function cacheGet<T>(key: string, fallback: T): T {
  if (store.has(key)) return store.get(key) as T;
  return fallback;
}

export function cacheSet(key: string, value: unknown): void {
  store.set(key, value);
  persistToSupabase(key, value);
}

// ── Key-pattern → table router (fire-and-forget) ────────────────────────────

const GOAL_KEY_RE = /^goal-(.+)$/;
const SETTING_KEYS = new Set([
  'user-profile', 'dashboard-layout', 'active-races', 'active-race',
  'hyrox-gender', 'hyrox-division', 'hyrox-station-goal-inputs',
  'nav-favorites', 'quick-log-favorites', 'active-intention',
  'nutrition-calorie-goal', 'nutrition-macro-goals', 'nutrition-daily-log',
  'nutrition-recipes', 'nutrition-meal-prep', 'nutrition-pantry', 'nutrition-shopping-list',
  'nutrition-buy-history',
  'nutrition-micro-goals',
]);

function persistToSupabase(key: string, value: unknown): void {
  // Workout aggregates (workouts-*, workout-times-*, hr-*) are derived
  // from individual workout_logs rows.  Don't persist aggregates — only
  // individual log inserts (handled by `insertWorkoutLog`) touch that table.
  if (key.startsWith('workouts-') || key.startsWith('workout-times-') || key.startsWith('hr-')) return;

  // workout-history is reconstructed from workout_logs; skip.
  if (key === 'workout-history') return;

  // Goal times
  const goalMatch = key.match(GOAL_KEY_RE);
  if (goalMatch) {
    const race = goalMatch[1];
    const seconds = typeof value === 'number' ? value : 0;
    supabase
      .from('goal_times')
      .upsert({ race, goal_minutes: seconds / 60, updated_at: new Date().toISOString() }, { onConflict: 'race' })
      .then(({ error }) => { if (error) console.error('goal_times upsert', error); });
    return;
  }

  // Numeric settings stored in goal_times (swim-pace, bike-speed, etc.)
  if (
    key.endsWith('-swim-pace') || key.endsWith('-bike-speed') || key.endsWith('-run-pace') ||
    key === 'cycling-speed' || key === 'cycling-distance' || key === 'hyrox-goal'
  ) {
    supabase
      .from('goal_times')
      .upsert({ race: key, goal_minutes: value, updated_at: new Date().toISOString() }, { onConflict: 'race' })
      .then(({ error }) => { if (error) console.error('goal_times upsert', error); });
    return;
  }

  // Station goals
  if (key === 'hyrox-station-goals') {
    const goals = value as Record<number, number>;
    for (const [idxStr, seconds] of Object.entries(goals)) {
      const idx = Number(idxStr);
      const station = HYROX_STATIONS[idx];
      if (!station) continue;
      const stationName = `${station.label}-${station.exercise}`;
      supabase
        .from('station_goals')
        .upsert({ station_name: stationName, goal_seconds: seconds, updated_at: new Date().toISOString() }, { onConflict: 'station_name' })
        .then(({ error }) => { if (error) console.error('station_goals upsert', error); });
    }
    return;
  }

  // Generic settings (profile, layout, preferences, etc.)
  if (SETTING_KEYS.has(key) || !key.includes('-')) {
    supabase
      .from('user_settings')
      .upsert({ key, value: JSON.parse(JSON.stringify(value)), updated_at: new Date().toISOString() }, { onConflict: 'key' })
      .then(({ error }) => { if (error) console.error('user_settings upsert', error); });
    return;
  }

  // Fallback: treat as a generic setting
  supabase
    .from('user_settings')
    .upsert({ key, value: JSON.parse(JSON.stringify(value)), updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .then(({ error }) => { if (error) console.error('user_settings upsert (fallback)', error); });
}

// ── Workout log inserts ──────────────────────────────────────────────────────

export interface WorkoutLogRow {
  race: string;
  discipline: string;
  distance: number;
  unit: string;
  logged_at: string;
  week_start: string;
}

export async function insertWorkoutLogs(rows: WorkoutLogRow[]): Promise<{ error: string | null }> {
  if (rows.length === 0) return { error: null };
  const { error } = await supabase.from('workout_logs').insert(rows);
  if (error) {
    console.error('insertWorkoutLogs', error);
    return { error: error.message };
  }
  return { error: null };
}

export async function deleteWorkoutLogsByTimestamp(loggedAt: string, race: string): Promise<void> {
  const { error } = await supabase
    .from('workout_logs')
    .delete()
    .eq('logged_at', loggedAt)
    .eq('race', race);
  if (error) console.error('deleteWorkoutLogs', error);
}

export async function updateWorkoutLogsByTimestamp(
  loggedAt: string,
  race: string,
  newRows: WorkoutLogRow[],
): Promise<void> {
  // Delete old rows then insert new
  await deleteWorkoutLogsByTimestamp(loggedAt, race);
  if (newRows.length > 0) {
    const { error } = await supabase.from('workout_logs').insert(newRows);
    if (error) console.error('updateWorkoutLogs insert', error);
  }
}

// ── Hydrate cache from Supabase ──────────────────────────────────────────────

export async function hydrateCache(): Promise<void> {
  const [workoutRes, goalsRes, stationsRes, settingsRes] = await Promise.all([
    supabase.from('workout_logs').select('*').order('logged_at', { ascending: false }),
    supabase.from('goal_times').select('*'),
    supabase.from('station_goals').select('*'),
    supabase.from('user_settings').select('*'),
  ]);

  // ── Workout logs → aggregate caches + history ──

  if (workoutRes.data) {
    // ── Deduplicate old SHARED_DISCIPLINES synced rows ──
    // Old sync code created rows for multiple races at the exact same logged_at
    // timestamp but with different races (and sometimes renamed disciplines,
    // e.g. ride→bike). Group by logged_at: if a timestamp has rows from
    // multiple races, keep only the first race and discard the rest.
    const raceByTimestamp = new Map<string, string>(); // logged_at → first race seen
    const duplicateIds: number[] = [];
    const cleanRows: typeof workoutRes.data = [];

    for (const row of workoutRes.data) {
      const ts = row.logged_at;
      const existingRace = raceByTimestamp.get(ts);
      if (existingRace === undefined) {
        // First row at this timestamp — adopt its race
        raceByTimestamp.set(ts, row.race);
        cleanRows.push(row);
      } else if (existingRace === row.race) {
        // Same race at same timestamp — legitimate (multiple disciplines in one log)
        cleanRows.push(row);
      } else {
        // Different race at same timestamp → synced duplicate, discard
        duplicateIds.push(row.id);
      }
    }

    // Background cleanup: delete synced duplicates from Supabase
    if (duplicateIds.length > 0) {
      console.log(`[hydrateCache] Cleaning up ${duplicateIds.length} duplicate synced rows`);
      // Delete in batches of 100 to avoid query size limits
      for (let i = 0; i < duplicateIds.length; i += 100) {
        const batch = duplicateIds.slice(i, i + 100);
        supabase
          .from('workout_logs')
          .delete()
          .in('id', batch)
          .then(({ error }) => {
            if (error) console.error('dedup cleanup', error);
          });
      }
    }

    type Group = { distances: Record<string, number>; times: Record<string, number>; hrs: number[] };
    const byRaceWeek = new Map<string, Group>();

    // Also build workout history
    type HistoryGroup = {
      id: string;
      timestamp: string;
      raceId: string;
      distances: Record<string, number>;
      times: Record<string, number>;
      hr?: number;
    };
    const historyMap = new Map<string, HistoryGroup>();

    for (const row of cleanRows) {
      const rwKey = `${row.race}|||${row.week_start}`;
      if (!byRaceWeek.has(rwKey)) byRaceWeek.set(rwKey, { distances: {}, times: {}, hrs: [] });
      const group = byRaceWeek.get(rwKey)!;

      if (row.discipline === 'hr') {
        group.hrs.push(row.distance);
      } else if (row.unit === 'seconds') {
        const disc = row.discipline.replace(/_time$/, '');
        group.times[disc] = (group.times[disc] || 0) + row.distance;
      } else {
        group.distances[row.discipline] = (group.distances[row.discipline] || 0) + row.distance;
      }

      // History grouping (by logged_at + race)
      const hKey = `${row.logged_at}|||${row.race}`;
      if (!historyMap.has(hKey)) {
        historyMap.set(hKey, {
          id: `${new Date(row.logged_at).getTime()}-${row.race}`,
          timestamp: row.logged_at,
          raceId: row.race,
          distances: {},
          times: {},
          hr: undefined,
        });
      }
      const h = historyMap.get(hKey)!;
      if (row.discipline === 'hr') {
        h.hr = row.distance;
      } else if (row.unit === 'seconds') {
        const disc = row.discipline.replace(/_time$/, '');
        h.times[disc] = row.distance;
      } else {
        h.distances[row.discipline] = row.distance;
      }
    }

    // ── Cross-race progress: merge shared disciplines into byRaceWeek ──
    // e.g. cycling "ride" workouts count toward ironman "bike" progress.
    // Snapshot source values BEFORE merging to prevent bidirectional feedback loops.
    const weekKeys = new Set<string>();
    for (const rwKey of byRaceWeek.keys()) {
      weekKeys.add(rwKey.split('|||')[1]);
    }

    // Snapshot: capture original distances/times before any cross-race merges
    const origSnapshot = new Map<string, { distances: Record<string, number>; times: Record<string, number> }>();
    for (const [key, data] of byRaceWeek) {
      origSnapshot.set(key, {
        distances: { ...data.distances },
        times: { ...data.times },
      });
    }

    for (const week of weekKeys) {
      for (const { from, to } of CROSS_RACE_PROGRESS) {
        const srcKey = `${from.race}|||${week}`;
        const src = origSnapshot.get(srcKey);
        if (!src) continue;

        const srcDist = src.distances[from.disc] || 0;
        const srcTime = src.times[from.disc] || 0;
        if (srcDist === 0 && srcTime === 0) continue;

        // Ensure target exists in byRaceWeek
        const targetKey = `${to.race}|||${week}`;
        if (!byRaceWeek.has(targetKey)) {
          byRaceWeek.set(targetKey, { distances: {}, times: {}, hrs: [] });
        }
        const target = byRaceWeek.get(targetKey)!;
        if (srcDist > 0) target.distances[to.disc] = (target.distances[to.disc] || 0) + srcDist;
        if (srcTime > 0) target.times[to.disc] = (target.times[to.disc] || 0) + srcTime;
      }
    }

    // Populate aggregate caches (includes cross-race merged data)
    for (const [rwKey, data] of byRaceWeek) {
      const [race, weekStart] = rwKey.split('|||');
      store.set(`workouts-${race}-${weekStart}`, data.distances);
      store.set(`workout-times-${race}-${weekStart}`, data.times);
      store.set(`hr-${race}-${weekStart}`, data.hrs);
    }

    // Populate workout history (sorted newest first)
    const history = Array.from(historyMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    store.set('workout-history', history);
  }

  // ── Goal times ──

  if (goalsRes.data) {
    for (const row of goalsRes.data) {
      const race: string = row.race;
      const val: number = row.goal_minutes;

      // Numeric settings stored as-is (swim-pace, bike-speed, etc.)
      if (
        race.endsWith('-swim-pace') || race.endsWith('-bike-speed') || race.endsWith('-run-pace') ||
        race === 'cycling-speed' || race === 'cycling-distance' || race === 'hyrox-goal'
      ) {
        store.set(race, val);
      } else {
        // Regular goal times: stored as minutes, cache expects seconds
        store.set(`goal-${race}`, val * 60);
      }
    }
  }

  // ── Station goals ──

  if (stationsRes.data) {
    const stationGoals: Record<number, number> = {};
    const stationInputs: Record<number, string> = {};
    for (const row of stationsRes.data) {
      const idx = HYROX_STATIONS.findIndex(
        (s) => `${s.label}-${s.exercise}` === row.station_name,
      );
      if (idx >= 0) {
        stationGoals[idx] = row.goal_seconds;
        const m = Math.floor(row.goal_seconds / 60);
        const s = row.goal_seconds % 60;
        stationInputs[idx] = `${m}:${String(s).padStart(2, '0')}`;
      }
    }
    store.set('hyrox-station-goals', stationGoals);
    store.set('hyrox-station-goal-inputs', stationInputs);
  }

  // ── User settings ──

  if (settingsRes.data) {
    for (const row of settingsRes.data) {
      store.set(row.key, row.value);
    }
  }
}
