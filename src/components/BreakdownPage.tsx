import { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { RaceId } from '../types';
import { getPastWeekKeys, loadFromStorage } from '../utils';

interface Props {
  onBack: () => void;
}

type TimeRange = 'daily' | 'weekly' | 'monthly' | 'yearly';

const DISCIPLINE_LABELS: Record<string, string> = {
  run: 'Run', swim: 'Swim', bike: 'Cycle', ride: 'Cycle',
  skierg: 'SkiErg', 'sled-push': 'Sled Push', 'sled-pull': 'Sled Pull',
  'burpee-broad-jump': 'Burpee BJ', rowing: 'Rowing',
  'farmers-carry': 'Farmers Carry', 'sandbag-lunges': 'Lunges', 'wall-balls': 'Wall Balls',
};

// Purposeful chart colors — limited, meaningful palette
const CHART_COLORS: Record<string, string> = {
  run: '#EF6C57', swim: '#3B82F6', bike: '#F59E0B', ride: '#F59E0B',
  skierg: '#8B5CF6', 'sled-push': '#EF4444', 'sled-pull': '#DC2626',
  'burpee-broad-jump': '#F97316', rowing: '#06B6D4',
  'farmers-carry': '#10B981', 'sandbag-lunges': '#EAB308', 'wall-balls': '#EC4899',
};

const ALL_RACE_IDS: RaceId[] = ['half-marathon', 'marathon', 'hyrox', 'ironman-70.3', 'ironman-140.6', 'cycling'];

const tooltipStyle = {
  backgroundColor: 'rgba(15, 17, 23, 0.95)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px',
  color: '#E5E7EB',
  fontSize: '12px',
  padding: '8px 12px',
};

function getAllWeekKeys(count: number): string[] {
  return getPastWeekKeys(count);
}

function groupByMonth(weekKeys: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const wk of weekKeys) {
    const month = wk.slice(0, 7);
    if (!groups[month]) groups[month] = [];
    groups[month].push(wk);
  }
  return groups;
}

function groupByYear(weekKeys: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const wk of weekKeys) {
    const year = wk.slice(0, 4);
    if (!groups[year]) groups[year] = [];
    groups[year].push(wk);
  }
  return groups;
}

function getCurrentWeekDays(): string[] {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

// Normalize keys: ride → bike (both display as "Cycle")
const NORM: Record<string, string> = { ride: 'bike' };
const norm = (d: string) => NORM[d] || d;

// Canonical source for shared disciplines — only read from one race to avoid double-counting synced data
const CANONICAL: Record<string, RaceId> = {
  run: 'half-marathon',
  swim: 'ironman-70.3',
  bike: 'ironman-70.3',
  ride: 'cycling',
};

function loadWeekData(weekKey: string) {
  const disc: Record<string, number> = {};
  for (const raceId of ALL_RACE_IDS) {
    const distances = loadFromStorage<Record<string, number>>(`workouts-${raceId}-${weekKey}`, {});
    for (const [d, val] of Object.entries(distances)) {
      if (val <= 0) continue;
      // For shared disciplines, only count from canonical race
      if (CANONICAL[d] && CANONICAL[d] !== raceId) continue;
      const key = norm(d);
      disc[key] = (disc[key] || 0) + val;
    }
  }
  return { disc };
}

export default function BreakdownPage({ onBack }: Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly');

  const data = useMemo(() => {
    const allDiscsSeen = new Set<string>();

    if (timeRange === 'daily') {
      const weekKey = getAllWeekKeys(1)[0];
      const days = getCurrentWeekDays();
      const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const { disc } = loadWeekData(weekKey);
      Object.keys(disc).forEach(d => allDiscsSeen.add(d));
      const today = new Date().getDay();
      const todayIdx = today === 0 ? 6 : today - 1;
      const barData = days.map((_, i) => {
        const row: Record<string, string | number> = { label: dayLabels[i] };
        if (i === todayIdx) {
          for (const d of allDiscsSeen) row[d] = disc[d] || 0;
        } else {
          for (const d of allDiscsSeen) row[d] = 0;
        }
        return row;
      });
      const totals: Record<string, number> = { ...disc };
      return { barData, lineData: barData, allDiscs: Array.from(allDiscsSeen), totals, periodLabel: 'This Week (Daily)' };
    }

    if (timeRange === 'weekly') {
      const weekKeys = getAllWeekKeys(12);
      const barData: Record<string, string | number>[] = [];
      const totals: Record<string, number> = {};
      for (const wk of weekKeys) {
        const { disc } = loadWeekData(wk);
        Object.keys(disc).forEach(d => allDiscsSeen.add(d));
        const row: Record<string, string | number> = { label: wk.slice(5) };
        for (const [d, val] of Object.entries(disc)) {
          row[d] = Math.round(val * 10) / 10;
          totals[d] = (totals[d] || 0) + val;
        }
        barData.push(row);
      }
      barData.reverse();
      return { barData, lineData: barData, allDiscs: Array.from(allDiscsSeen), totals, periodLabel: 'Last 12 Weeks' };
    }

    if (timeRange === 'monthly') {
      const weekKeys = getAllWeekKeys(52);
      const months = groupByMonth(weekKeys);
      const totals: Record<string, number> = {};
      const barData: Record<string, string | number>[] = [];
      for (const month of Object.keys(months).sort()) {
        const row: Record<string, string | number> = { label: month.slice(2) };
        const monthDisc: Record<string, number> = {};
        for (const wk of months[month]) {
          const { disc } = loadWeekData(wk);
          Object.keys(disc).forEach(d => allDiscsSeen.add(d));
          for (const [d, val] of Object.entries(disc)) {
            monthDisc[d] = (monthDisc[d] || 0) + val;
            totals[d] = (totals[d] || 0) + val;
          }
        }
        for (const [d, val] of Object.entries(monthDisc)) row[d] = Math.round(val * 10) / 10;
        barData.push(row);
      }
      return { barData, lineData: barData, allDiscs: Array.from(allDiscsSeen), totals, periodLabel: 'Last 12 Months' };
    }

    const weekKeys = getAllWeekKeys(156);
    const years = groupByYear(weekKeys);
    const totals: Record<string, number> = {};
    const barData: Record<string, string | number>[] = [];
    for (const year of Object.keys(years).sort()) {
      const row: Record<string, string | number> = { label: year };
      const yearDisc: Record<string, number> = {};
      for (const wk of years[year]) {
        const { disc } = loadWeekData(wk);
        Object.keys(disc).forEach(d => allDiscsSeen.add(d));
        for (const [d, val] of Object.entries(disc)) {
          yearDisc[d] = (yearDisc[d] || 0) + val;
          totals[d] = (totals[d] || 0) + val;
        }
      }
      for (const [d, val] of Object.entries(yearDisc)) row[d] = Math.round(val * 10) / 10;
      barData.push(row);
    }
    return { barData, lineData: barData, allDiscs: Array.from(allDiscsSeen), totals, periodLabel: 'All Time (Yearly)' };
  }, [timeRange]);

  const pieData = useMemo(() => {
    const total = Object.values(data.totals).reduce((a, b) => a + b, 0);
    if (total === 0) return [];
    return Object.entries(data.totals)
      .filter(([, v]) => v > 0)
      .map(([disc, val]) => ({
        name: DISCIPLINE_LABELS[disc] || disc,
        value: Math.round(val * 10) / 10,
        pct: Math.round((val / total) * 1000) / 10,
        color: CHART_COLORS[disc] || '#6B7280',
      }))
      .sort((a, b) => b.value - a.value);
  }, [data.totals]);

  const totalVolume = Object.values(data.totals).reduce((a, b) => a + b, 0);
  const topDisc = pieData[0];
  const hasData = data.allDiscs.length > 0;

  const timeRanges: { key: TimeRange; label: string }[] = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'yearly', label: 'Yearly' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="glass p-2.5 rounded-lg hover:bg-white/[0.06] transition-colors" aria-label="Back to dashboard">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Training Breakdown</h1>
            <p className="text-gray-600 text-sm mt-0.5">{data.periodLabel}</p>
          </div>
        </div>

        <div className="flex glass rounded-lg overflow-hidden">
          {timeRanges.map(({ key, label }) => (
            <button key={key} onClick={() => setTimeRange(key)}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                timeRange === key ? 'bg-[#1E6F6B] text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass p-4">
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Total Volume</div>
          <div className="text-2xl font-bold text-white mt-1">{Math.round(totalVolume * 10) / 10}</div>
          <div className="text-xs text-gray-600">units logged</div>
        </div>
        <div className="glass p-4">
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Disciplines</div>
          <div className="text-2xl font-bold text-white mt-1">{data.allDiscs.length}</div>
          <div className="text-xs text-gray-600">active activities</div>
        </div>
        <div className="glass p-4">
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Top Activity</div>
          <div className="text-2xl font-bold text-white mt-1">{topDisc ? topDisc.name : '-'}</div>
          <div className="text-xs text-gray-600">{topDisc ? `${topDisc.pct}% of total` : 'no data'}</div>
        </div>
        <div className="glass p-4">
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Data Points</div>
          <div className="text-2xl font-bold text-white mt-1">{data.barData.length}</div>
          <div className="text-xs text-gray-600">{timeRange === 'daily' ? 'days' : timeRange === 'weekly' ? 'weeks' : timeRange === 'monthly' ? 'months' : 'years'}</div>
        </div>
      </div>

      {!hasData ? (
        <div className="glass p-12 text-center">
          <div className="text-gray-600 text-sm">No workout data found</div>
          <div className="text-gray-600 text-xs mt-1">Log workouts from any race dashboard to see your breakdown</div>
        </div>
      ) : (
        <>
          {/* Bar Chart */}
          <div className="glass p-5 space-y-3">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Volume by Activity</h3>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.barData} barCategoryGap="15%">
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 11 }} width={40} />
                  <Tooltip contentStyle={tooltipStyle}
                    formatter={(value: unknown, name: unknown) => {
                      const label = DISCIPLINE_LABELS[String(name)] || String(name);
                      const unit = ['swim'].includes(String(name)) ? 'km' : ['run', 'bike', 'ride'].includes(String(name)) ? 'mi' : 'sessions';
                      return [`${value} ${unit}`, label];
                    }} />
                  <Legend formatter={(value: string) => DISCIPLINE_LABELS[value] || value} wrapperStyle={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }} />
                  {data.allDiscs.map((disc) => (
                    <Bar key={disc} dataKey={disc} fill={CHART_COLORS[disc] || '#6B7280'} radius={[3, 3, 0, 0]} stackId="stack" />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Line Chart */}
          <div className="glass p-5 space-y-3">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Volume Trend</h3>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.lineData}>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 11 }} width={40} />
                  <Tooltip contentStyle={tooltipStyle}
                    formatter={(value: unknown, name: unknown) => {
                      const label = DISCIPLINE_LABELS[String(name)] || String(name);
                      const unit = ['swim'].includes(String(name)) ? 'km' : ['run', 'bike', 'ride'].includes(String(name)) ? 'mi' : 'sessions';
                      return [`${value} ${unit}`, label];
                    }} />
                  <Legend formatter={(value: string) => DISCIPLINE_LABELS[value] || value} wrapperStyle={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }} />
                  {data.allDiscs.map((disc) => (
                    <Line key={disc} type="monotone" dataKey={disc} stroke={CHART_COLORS[disc] || '#6B7280'} strokeWidth={2}
                      dot={{ fill: CHART_COLORS[disc] || '#6B7280', strokeWidth: 0, r: 2.5 }}
                      activeDot={{ stroke: CHART_COLORS[disc] || '#6B7280', strokeWidth: 3, r: 4, strokeOpacity: 0.3 }}
                      connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="glass p-5 space-y-3">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Activity Distribution</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={105} paddingAngle={2} dataKey="value" stroke="none"
                      label={({ payload }: { payload?: { pct?: number } }) => `${payload?.pct ?? 0}%`}>
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle}
                      formatter={(value: unknown, name: unknown) => [`${value} (${pieData.find(p => p.name === String(name))?.pct}%)`, String(name)]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-3 bg-white/[0.02] rounded-lg px-4 py-2.5 border border-white/[0.05]">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    <div className="flex-1 text-sm font-medium text-gray-400">{entry.name}</div>
                    <div className="text-sm font-bold text-white">{entry.pct}%</div>
                    <div className="text-xs text-gray-600 w-16 text-right">{entry.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
