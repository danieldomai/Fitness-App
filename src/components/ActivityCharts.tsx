import { useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { RaceId } from '../types';
import { WEEKLY_GOALS } from '../constants';
import { getPastWeekKeys, loadFromStorage } from '../utils';

const DISCIPLINE_LABELS: Record<string, string> = {
  run: 'Run', swim: 'Swim', bike: 'Cycle', ride: 'Cycle',
  skierg: 'SkiErg', 'sled-push': 'Sled Push', 'sled-pull': 'Sled Pull',
  'burpee-broad-jump': 'Burpee BJ', rowing: 'Rowing',
  'farmers-carry': 'Farmers Carry', 'sandbag-lunges': 'Lunges', 'wall-balls': 'Wall Balls',
  climb: 'Climb', surf: 'Surf', snowboard: 'Snowboard',
};

const CHART_COLORS: Record<string, string> = {
  run: '#EF6C57', swim: '#3B82F6', bike: '#F59E0B', ride: '#F59E0B',
  skierg: '#8B5CF6', 'sled-push': '#EF4444', 'sled-pull': '#DC2626',
  'burpee-broad-jump': '#F97316', rowing: '#06B6D4', 'farmers-carry': '#10B981',
  'sandbag-lunges': '#EAB308', 'wall-balls': '#EC4899',
  climb: '#84CC16', surf: '#22D3EE', snowboard: '#A78BFA',
};

const tooltipStyle = {
  backgroundColor: 'rgba(19, 19, 19, 0.95)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '4px',
  color: '#E5E7EB',
  fontSize: '12px',
  padding: '8px 12px',
};

interface Props {
  raceId: RaceId;
}

export default function ActivityCharts({ raceId }: Props) {
  const weekKeys = useMemo(() => getPastWeekKeys(8), []);

  const data = useMemo(() => {
    const goals = WEEKLY_GOALS[raceId];
    if (!goals) return null;

    const disciplines = Object.keys(goals);
    const weeklyByDisc: Record<string, number>[] = [];
    const totalByDisc: Record<string, number> = {};

    for (const wk of weekKeys) {
      const distances = loadFromStorage<Record<string, number>>(`workouts-${raceId}-${wk}`, {});
      const weekDisc: Record<string, number> = {};
      for (const disc of disciplines) {
        const val = distances[disc] || 0;
        weekDisc[disc] = val;
        totalByDisc[disc] = (totalByDisc[disc] || 0) + val;
      }
      weeklyByDisc.push(weekDisc);
    }

    const activeDisciplines = disciplines.filter(d => (totalByDisc[d] || 0) > 0);

    const lineData = weekKeys.map((wk, i) => {
      const row: Record<string, string | number> = { label: wk.slice(5) };
      for (const disc of disciplines) {
        row[disc] = weeklyByDisc[i]?.[disc] || 0;
      }
      return row;
    }).reverse();

    const totalVol = Object.values(totalByDisc).reduce((a, b) => a + b, 0);
    const pieData = Object.entries(totalByDisc)
      .filter(([, val]) => val > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([disc, val]) => ({
        name: DISCIPLINE_LABELS[disc] || disc,
        value: Math.round(val * 10) / 10,
        pct: totalVol > 0 ? Math.round((val / totalVol) * 1000) / 10 : 0,
        color: CHART_COLORS[disc] || '#6B7280',
      }));

    return { lineData, activeDisciplines, pieData, disciplines };
  }, [raceId, weekKeys]);

  if (!data) return null;

  const { lineData, activeDisciplines, pieData, disciplines } = data;
  const hasData = activeDisciplines.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Volume Trend */}
      <div className="glass p-5 space-y-3">
        <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Weekly Volume Trend</h3>
        {hasData ? (
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 11 }} width={35} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => `Week of ${l}`}
                  formatter={(value: unknown, name: unknown) => {
                    const label = DISCIPLINE_LABELS[String(name)] || String(name);
                    const unit = ['swim'].includes(String(name)) ? 'km' : ['run', 'bike', 'ride'].includes(String(name)) ? 'mi' : 'sessions';
                    return [`${value} ${unit}`, label];
                  }} />
                <Legend formatter={(v: string) => DISCIPLINE_LABELS[v] || v} wrapperStyle={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }} />
                {disciplines.map((disc) => (
                  <Line key={disc} type="monotone" dataKey={disc} stroke={CHART_COLORS[disc] || '#6B7280'} strokeWidth={2}
                    dot={{ fill: CHART_COLORS[disc] || '#6B7280', strokeWidth: 0, r: 2.5 }}
                    activeDot={{ stroke: CHART_COLORS[disc] || '#6B7280', strokeWidth: 3, r: 4, strokeOpacity: 0.3 }}
                    connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center" style={{ height: 180 }}>
            <div className="text-xs text-gray-600">Log workouts to see volume trends</div>
          </div>
        )}
      </div>

      {/* Volume Breakdown */}
      <div className="glass p-5 space-y-3">
        <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Weekly Volume Breakdown</h3>
        {hasData ? (
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lineData}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 11 }} width={35} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => `Week of ${l}`}
                  formatter={(value: unknown, name: unknown) => {
                    const label = DISCIPLINE_LABELS[String(name)] || String(name);
                    const unit = ['swim'].includes(String(name)) ? 'km' : ['run', 'bike', 'ride'].includes(String(name)) ? 'mi' : 'sessions';
                    return [`${value} ${unit}`, label];
                  }} />
                <Legend formatter={(v: string) => DISCIPLINE_LABELS[v] || v} wrapperStyle={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }} />
                {disciplines.map((disc) => (
                  <Bar key={disc} dataKey={disc} fill={CHART_COLORS[disc] || '#6B7280'} radius={[3, 3, 0, 0]} stackId="stack" />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center" style={{ height: 180 }}>
            <div className="text-xs text-gray-600">Log workouts to see volume breakdown</div>
          </div>
        )}
      </div>

      {/* Distribution Pie — only show for multi-discipline activities */}
      {disciplines.length > 1 && (
        <div className="glass p-5 space-y-3 lg:col-span-2">
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Discipline Distribution</h3>
          {pieData.length > 0 ? (
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <div style={{ width: 160, height: 160 }} className="flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={2} dataKey="value" strokeWidth={0}>
                      {pieData.map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: unknown, name: unknown) => [`${value}`, String(name)]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2 w-full">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm text-gray-400 flex-1">{entry.name}</span>
                    <span className="text-sm font-semibold text-white">{entry.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center" style={{ height: 160 }}>
              <div className="text-xs text-gray-600">Log workouts to see distribution</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
