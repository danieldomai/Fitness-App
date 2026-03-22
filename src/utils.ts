import { cacheGet, cacheSet } from './lib/db';

export function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatPace(totalSeconds: number, distanceMiles: number): string {
  const paceSeconds = totalSeconds / distanceMiles;
  const m = Math.floor(paceSeconds / 60);
  const s = Math.round(paceSeconds % 60);
  return `${m}:${String(s).padStart(2, '0')}/mi`;
}

export function parseTimeToSeconds(time: string): number {
  const parts = time.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

export function getWeekKey(date?: Date): string {
  const d = date ? new Date(date) : new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

export function getPastWeekKeys(count: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    keys.push(getWeekKey(d));
  }
  return keys;
}

export function formatWeekLabel(weekKey: string): string {
  const start = new Date(weekKey + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

/** Read from in-memory cache (hydrated from Supabase on app start). */
export function loadFromStorage<T>(key: string, fallback: T): T {
  return cacheGet(key, fallback);
}

/** Write to in-memory cache + async Supabase sync. */
export function saveToStorage(key: string, value: unknown): void {
  cacheSet(key, value);
}

// ── Training Totals Aggregator ──

export interface TrainingTotals {
  distance: number;   // total distance (mi/km/sessions combined)
  time: number;       // total seconds
}

/**
 * Aggregate training totals for a given period.
 * Uses workout-history entries filtered by timestamp range.
 *
 * @param period - 'day' | 'week' | 'month' | 'year'
 * @param date - reference date (defaults to now)
 * @param raceId - optional: filter to a specific race/workout
 */
export function getTrainingTotals(
  period: 'day' | 'week' | 'month' | 'year',
  date?: Date,
  raceId?: string,
): TrainingTotals {
  const ref = date ? new Date(date) : new Date();
  const { start, end } = getPeriodRange(period, ref);

  const history = loadFromStorage<{
    id: string;
    timestamp: string;
    raceId: string;
    distances: Record<string, number>;
    times: Record<string, number>;
  }[]>('workout-history', []);

  let distance = 0;
  let time = 0;

  for (const entry of history) {
    if (raceId && entry.raceId !== raceId) continue;
    const ts = new Date(entry.timestamp).getTime();
    if (ts < start || ts >= end) continue;

    for (const val of Object.values(entry.distances)) {
      distance += val;
    }
    for (const val of Object.values(entry.times)) {
      time += val;
    }
  }

  return { distance: Math.round(distance * 10) / 10, time };
}

/** Get start (inclusive) and end (exclusive) timestamps for a period. */
export function getPeriodRange(period: 'day' | 'week' | 'month' | 'year', ref: Date): { start: number; end: number } {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);

  switch (period) {
    case 'day': {
      const start = d.getTime();
      const end = start + 86400000;
      return { start, end };
    }
    case 'week': {
      const day = d.getDay();
      d.setDate(d.getDate() - day + (day === 0 ? -6 : 1)); // Monday
      const start = d.getTime();
      return { start, end: start + 7 * 86400000 };
    }
    case 'month': {
      const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      return { start, end };
    }
    case 'year': {
      const start = new Date(d.getFullYear(), 0, 1).getTime();
      const end = new Date(d.getFullYear() + 1, 0, 1).getTime();
      return { start, end };
    }
  }
}

/** Format seconds as a compact string: "6h 15m" or "45m" */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0m';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}
