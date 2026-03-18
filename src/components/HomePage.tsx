import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  RadialBarChart, RadialBar,
} from 'recharts';
import { RACES, WEEKLY_GOALS } from '../constants';
import type { RaceId } from '../types';
import { getPastWeekKeys, loadFromStorage, saveToStorage, formatTime } from '../utils';

interface Props {
  onSelect: (id: RaceId) => void;
  onBreakdown: () => void;
}

interface UserProfile {
  name: string;
  age: string;
  weight: string;
  height: string;
  gender: 'male' | 'female' | '';
}

interface DashboardSection {
  id: string;
  label: string;
  visible: boolean;
}

const DEFAULT_LAYOUT: DashboardSection[] = [
  { id: 'profile', label: 'Athlete Profile', visible: true },
  { id: 'recovery', label: 'Recovery Status', visible: true },
  { id: 'quick-stats', label: 'Quick Stats', visible: true },
  { id: 'volume', label: 'Volume Trend (Line)', visible: true },
  { id: 'volume-bar', label: 'Volume Breakdown (Bar)', visible: true },
  { id: 'distribution', label: 'Training Distribution (Pie)', visible: true },
  { id: 'race-progress', label: 'Race Progress', visible: true },
];

const DISCIPLINE_LABELS: Record<string, string> = {
  run: 'Run', swim: 'Swim', bike: 'Bike', ride: 'Ride',
  skierg: 'SkiErg', 'sled-push': 'Sled Push', 'sled-pull': 'Sled Pull',
  'burpee-broad-jump': 'Burpee BJ', rowing: 'Rowing',
  'farmers-carry': 'Farmers Carry', 'sandbag-lunges': 'Lunges', 'wall-balls': 'Wall Balls',
};

// Chart-only colors: purposeful, limited palette for data visualization
const CHART_COLORS: Record<string, string> = {
  run: '#EF6C57',
  swim: '#3B82F6',
  bike: '#F59E0B',
  ride: '#F59E0B',
  skierg: '#8B5CF6',
  'sled-push': '#EF4444',
  'sled-pull': '#DC2626',
  'burpee-broad-jump': '#F97316',
  rowing: '#06B6D4',
  'farmers-carry': '#10B981',
  'sandbag-lunges': '#EAB308',
  'wall-balls': '#EC4899',
};

export default function HomePage({ onSelect, onBreakdown }: Props) {
  const [profile, setProfile] = useState<UserProfile>(() =>
    loadFromStorage('user-profile', { name: '', age: '', weight: '', height: '', gender: '' })
  );
  const [editingProfile, setEditingProfile] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [editingRaces, setEditingRaces] = useState(false);
  const [editingLayout, setEditingLayout] = useState(false);
  const [layout, setLayout] = useState<DashboardSection[]>(() => {
    const saved = loadFromStorage<DashboardSection[] | null>('dashboard-layout', null);
    if (saved && Array.isArray(saved)) {
      const savedIds = new Set(saved.map(s => s.id));
      const merged = [...saved];
      for (const def of DEFAULT_LAYOUT) {
        if (!savedIds.has(def.id)) merged.push(def);
      }
      return merged;
    }
    return DEFAULT_LAYOUT;
  });
  const [activeRaces, setActiveRaces] = useState<RaceId[]>(() =>
    loadFromStorage('active-races', RACES.map(r => r.id))
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const updateProfile = (field: keyof UserProfile, value: string) => {
    const updated = { ...profile, [field]: value };
    setProfile(updated);
    saveToStorage('user-profile', updated);
  };

  const toggleRace = (raceId: RaceId) => {
    setActiveRaces(prev => {
      const next = prev.includes(raceId)
        ? prev.filter(r => r !== raceId)
        : [...prev, raceId];
      if (next.length === 0) return prev;
      saveToStorage('active-races', next);
      return next;
    });
  };

  const updateLayout = useCallback((newLayout: DashboardSection[]) => {
    setLayout(newLayout);
    saveToStorage('dashboard-layout', newLayout);
  }, []);

  const toggleSection = (id: string) => {
    const visibleCount = layout.filter(s => s.visible).length;
    const section = layout.find(s => s.id === id);
    if (section?.visible && visibleCount <= 1) return;
    const next = layout.map(s => s.id === id ? { ...s, visible: !s.visible } : s);
    updateLayout(next);
  };

  const moveSection = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= layout.length) return;
    const next = [...layout];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    updateLayout(next);
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (dragIndex !== null && dragIndex !== index) {
      moveSection(dragIndex, index);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const weekKeys = useMemo(() => getPastWeekKeys(8), []);
  const currentWeekKey = weekKeys[0];

  const aggregatedData = useMemo(() => {
    const allRaceIds: RaceId[] = ['half-marathon', 'marathon', 'hyrox', 'ironman-70.3', 'ironman-140.6', 'cycling'];

    const weeklyByDiscipline: Record<string, number>[] = [];
    const allDiscsSeen = new Set<string>();
    const totalByDiscipline: Record<string, number> = {};

    let totalWorkoutTime = 0;
    let totalDistance = 0;
    const allHrReadings: number[] = [];
    let totalSessions = 0;
    let lastWorkoutDate = '';

    for (const wk of weekKeys) {
      let weekTime = 0;
      let weekSessions = 0;
      const weekHrs: number[] = [];
      const weekDisc: Record<string, number> = {};

      for (const raceId of allRaceIds) {
        const distances = loadFromStorage<Record<string, number>>(`workouts-${raceId}-${wk}`, {});
        const times = loadFromStorage<Record<string, number>>(`workout-times-${raceId}-${wk}`, {});
        const hrs = loadFromStorage<number[]>(`hr-${raceId}-${wk}`, []);

        for (const [disc, val] of Object.entries(distances)) {
          if (val > 0) {
            totalDistance += val;
            weekSessions++;
            weekDisc[disc] = (weekDisc[disc] || 0) + val;
            totalByDiscipline[disc] = (totalByDiscipline[disc] || 0) + val;
            allDiscsSeen.add(disc);
            if (!lastWorkoutDate || wk > lastWorkoutDate) lastWorkoutDate = wk;
          }
        }
        for (const [, val] of Object.entries(times)) {
          if (val > 0) weekTime += val;
        }
        weekHrs.push(...hrs);
      }

      totalWorkoutTime += weekTime;
      totalSessions += weekSessions;
      allHrReadings.push(...weekHrs);
      weeklyByDiscipline.push(weekDisc);
    }

    const weeklyLineData = weekKeys.map((wk, i) => {
      const row: Record<string, string | number> = { label: wk.slice(5) };
      for (const disc of allDiscsSeen) {
        row[disc] = weeklyByDiscipline[i]?.[disc] || 0;
      }
      return row;
    }).reverse();

    // Pie chart data: distribution of total volume by discipline
    const totalVolume = Object.values(totalByDiscipline).reduce((a, b) => a + b, 0);
    const pieData = Object.entries(totalByDiscipline)
      .sort((a, b) => b[1] - a[1])
      .map(([disc, val]) => ({
        name: DISCIPLINE_LABELS[disc] || disc,
        value: val,
        pct: totalVolume > 0 ? Math.round((val / totalVolume) * 1000) / 10 : 0,
        color: CHART_COLORS[disc] || '#6B7280',
      }));

    const currentWeekTime = weeklyByDiscipline[0] ? Object.values(weeklyByDiscipline[0]).reduce((a, b) => a + b, 0) : 0;
    const prevWeekTime = weeklyByDiscipline[1] ? Object.values(weeklyByDiscipline[1]).reduce((a, b) => a + b, 0) : 0;
    const volumeRatio = prevWeekTime > 0 ? currentWeekTime / prevWeekTime : 0.5;
    const avgHr = allHrReadings.length > 0 ? allHrReadings.reduce((a, b) => a + b, 0) / allHrReadings.length : 0;
    const daysSinceLastWorkout = lastWorkoutDate
      ? Math.max(0, Math.floor((Date.now() - new Date(lastWorkoutDate + 'T00:00:00').getTime()) / 86400000))
      : 7;

    let recoveryScore = 85;
    if (volumeRatio > 1.3) recoveryScore -= 25;
    else if (volumeRatio > 1.0) recoveryScore -= 10;
    else if (volumeRatio < 0.5) recoveryScore += 5;
    if (daysSinceLastWorkout >= 3) recoveryScore += 10;
    else if (daysSinceLastWorkout <= 1) recoveryScore -= 15;
    if (avgHr > 170) recoveryScore -= 10;
    else if (avgHr > 150) recoveryScore -= 5;
    recoveryScore = Math.max(15, Math.min(98, recoveryScore));

    const recoveryLabel = recoveryScore >= 80 ? 'Fully Recovered' : recoveryScore >= 60 ? 'Moderately Recovered' : recoveryScore >= 40 ? 'Fatigued' : 'High Fatigue';
    const recoveryColor = recoveryScore >= 80 ? '#34C759' : recoveryScore >= 60 ? '#F59E0B' : recoveryScore >= 40 ? '#F97316' : '#EF4444';

    const raceProgress = allRaceIds.map((raceId) => {
      const goals = WEEKLY_GOALS[raceId];
      const distances = loadFromStorage<Record<string, number>>(`workouts-${raceId}-${currentWeekKey}`, {});
      const totalGoal = Object.values(goals).reduce((a, b) => a + b, 0);
      const totalDone = Object.entries(goals).reduce((sum, [disc]) => sum + (distances[disc] || 0), 0);
      const pct = totalGoal > 0 ? Math.min(100, Math.round((totalDone / totalGoal) * 100)) : 0;
      const race = RACES.find(r => r.id === raceId)!;
      return { raceId, name: race.name, icon: race.icon, pct };
    });

    return {
      weeklyLineData,
      activeDisciplines: Array.from(allDiscsSeen),
      pieData,
      totalDistance: Math.round(totalDistance),
      totalWorkoutTime,
      totalSessions,
      avgHr: allHrReadings.length > 0 ? Math.round(allHrReadings.reduce((a, b) => a + b, 0) / allHrReadings.length) : null,
      recoveryScore,
      recoveryLabel,
      recoveryColor,
      daysSinceLastWorkout,
      raceProgress,
    };
  }, [weekKeys, currentWeekKey]);

  const bmi = useMemo(() => {
    const w = parseFloat(profile.weight);
    const h = parseFloat(profile.height);
    if (!w || !h || h === 0) return null;
    return Math.round((w / (h * h)) * 703 * 10) / 10;
  }, [profile.weight, profile.height]);

  const bmiLabel = bmi ? (bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese') : null;

  const tooltipStyle = {
    backgroundColor: 'rgba(15, 17, 23, 0.95)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    color: '#E5E7EB',
    fontSize: '12px',
    padding: '8px 12px',
  };

  /* ── Section renderers ── */

  const renderProfile = () => (
    <div className="glass p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Athlete Profile</h3>
        <button onClick={() => setEditingProfile(!editingProfile)} className="text-xs text-gray-500 hover:text-white transition-colors">
          {editingProfile ? 'Done' : 'Edit'}
        </button>
      </div>

      {editingProfile ? (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-gray-600 uppercase tracking-wider">Name</label>
            <input type="text" value={profile.name} onChange={(e) => updateProfile('name', e.target.value)} placeholder="Your name" className="w-full glass-input px-3 py-2 text-sm mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-600 uppercase tracking-wider">Age</label>
              <input type="number" value={profile.age} onChange={(e) => updateProfile('age', e.target.value)} placeholder="Years" className="w-full glass-input px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-gray-600 uppercase tracking-wider">Gender</label>
              <select value={profile.gender} onChange={(e) => updateProfile('gender', e.target.value)} className="w-full glass-input px-3 py-2 text-sm mt-1 bg-transparent">
                <option value="" className="bg-[#0F1117]">Select</option>
                <option value="male" className="bg-[#0F1117]">Male</option>
                <option value="female" className="bg-[#0F1117]">Female</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-600 uppercase tracking-wider">Weight (lbs)</label>
              <input type="number" value={profile.weight} onChange={(e) => updateProfile('weight', e.target.value)} placeholder="lbs" className="w-full glass-input px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-gray-600 uppercase tracking-wider">Height (in)</label>
              <input type="number" value={profile.height} onChange={(e) => updateProfile('height', e.target.value)} placeholder="inches" className="w-full glass-input px-3 py-2 text-sm mt-1" />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-sm font-bold text-gray-400">
              {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{profile.name || 'Set your name'}</div>
              <div className="text-xs text-gray-600">
                {profile.age ? `${profile.age} yrs` : '-'}
                {profile.gender ? ` / ${profile.gender === 'male' ? 'Male' : 'Female'}` : ''}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/[0.02] rounded-lg p-2.5 text-center border border-white/[0.05]">
              <div className="text-lg font-bold text-white">{profile.weight || '-'}</div>
              <div className="text-[10px] text-gray-600 uppercase">lbs</div>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-2.5 text-center border border-white/[0.05]">
              <div className="text-lg font-bold text-white">
                {profile.height ? `${Math.floor(parseInt(profile.height) / 12)}'${parseInt(profile.height) % 12}"` : '-'}
              </div>
              <div className="text-[10px] text-gray-600 uppercase">height</div>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-2.5 text-center border border-white/[0.05]">
              <div className="text-lg font-bold text-white">{bmi ?? '-'}</div>
              <div className="text-[10px] text-gray-600 uppercase">bmi</div>
            </div>
          </div>
          {bmi && <div className="text-xs text-gray-500 text-center">{bmiLabel}</div>}
        </div>
      )}
    </div>
  );

  const renderRecovery = () => (
    <div className="glass p-5 flex flex-col items-center space-y-2">
      <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider self-start">Recovery Status</h3>
      <div className="relative" style={{ width: 150, height: 150 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="62%" outerRadius="88%" startAngle={210} endAngle={-30} barSize={12}
            data={[{ value: aggregatedData.recoveryScore, fill: aggregatedData.recoveryColor }]}>
            <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'rgba(255,255,255,0.03)' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <div>
            <div className="text-3xl font-bold text-white">{aggregatedData.recoveryScore}</div>
            <div className="text-[10px] text-gray-600 uppercase tracking-wider">score</div>
          </div>
        </div>
      </div>
      <div className="text-sm font-medium" style={{ color: aggregatedData.recoveryColor }}>{aggregatedData.recoveryLabel}</div>
      <div className="text-xs text-gray-600">
        {aggregatedData.daysSinceLastWorkout === 0 ? 'Trained today' : aggregatedData.daysSinceLastWorkout === 1 ? '1 day since last workout' : `${aggregatedData.daysSinceLastWorkout} days since last workout`}
      </div>
    </div>
  );

  const renderQuickStats = () => (
    <div className="grid grid-cols-2 gap-3">
      {[
        { label: 'Total Distance', value: String(aggregatedData.totalDistance), sub: 'mi (8 weeks)' },
        { label: 'Training Time', value: formatTime(aggregatedData.totalWorkoutTime), sub: 'total (8 weeks)' },
        { label: 'Workouts', value: String(aggregatedData.totalSessions), sub: 'sessions logged' },
        { label: 'Avg Heart Rate', value: aggregatedData.avgHr ? String(aggregatedData.avgHr) : '-', sub: aggregatedData.avgHr ? 'bpm average' : 'no data' },
      ].map(s => (
        <div key={s.label} className="glass p-4 flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{s.label}</span>
          <div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-gray-600">{s.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderVolumeLine = () => (
    <div className="glass p-5 space-y-3">
      <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Volume Trend</h3>
      {aggregatedData.activeDisciplines.length > 0 ? (
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={aggregatedData.weeklyLineData}>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 11 }} width={35} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(label) => `Week of ${label}`}
                formatter={(value: unknown, name: unknown) => {
                  const label = DISCIPLINE_LABELS[String(name)] || String(name);
                  const unit = ['swim'].includes(String(name)) ? 'km' : ['run', 'bike', 'ride'].includes(String(name)) ? 'mi' : 'sessions';
                  return [`${value} ${unit}`, label];
                }} />
              <Legend formatter={(value: string) => DISCIPLINE_LABELS[value] || value} wrapperStyle={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }} />
              {aggregatedData.activeDisciplines.map((disc) => (
                <Line key={disc} type="monotone" dataKey={disc} stroke={CHART_COLORS[disc] || '#6B7280'} strokeWidth={2}
                  dot={{ fill: CHART_COLORS[disc] || '#6B7280', strokeWidth: 0, r: 2.5 }}
                  activeDot={{ stroke: CHART_COLORS[disc] || '#6B7280', strokeWidth: 3, r: 4, strokeOpacity: 0.3 }}
                  connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex items-center justify-center" style={{ height: 220 }}>
          <div className="text-xs text-gray-600">Log workouts to see your volume trends</div>
        </div>
      )}
    </div>
  );

  const renderVolumeBar = () => (
    <div className="glass p-5 space-y-3">
      <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Weekly Volume Breakdown</h3>
      {aggregatedData.activeDisciplines.length > 0 ? (
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={aggregatedData.weeklyLineData}>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 11 }} width={35} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(label) => `Week of ${label}`}
                formatter={(value: unknown, name: unknown) => {
                  const label = DISCIPLINE_LABELS[String(name)] || String(name);
                  const unit = ['swim'].includes(String(name)) ? 'km' : ['run', 'bike', 'ride'].includes(String(name)) ? 'mi' : 'sessions';
                  return [`${value} ${unit}`, label];
                }}
              />
              <Legend formatter={(value: string) => DISCIPLINE_LABELS[value] || value} wrapperStyle={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }} />
              {aggregatedData.activeDisciplines.map((disc) => (
                <Bar key={disc} dataKey={disc} fill={CHART_COLORS[disc] || '#6B7280'} radius={[3, 3, 0, 0]} stackId="stack" />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex items-center justify-center" style={{ height: 220 }}>
          <div className="text-xs text-gray-600">Log workouts to see your volume breakdown</div>
        </div>
      )}
    </div>
  );

  const renderDistribution = () => (
    <div className="glass p-5 space-y-3">
      <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Training Distribution</h3>
      {aggregatedData.pieData.length > 0 ? (
        <div className="flex flex-col lg:flex-row items-center gap-6">
          <div style={{ width: 200, height: 200 }} className="flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={aggregatedData.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {aggregatedData.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: unknown, name: unknown) => [`${value}`, String(name)]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2 w-full">
            {aggregatedData.pieData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="text-sm text-gray-400 flex-1">{entry.name}</span>
                <span className="text-sm font-semibold text-white">{entry.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center" style={{ height: 200 }}>
          <div className="text-xs text-gray-600">Log workouts to see your training distribution</div>
        </div>
      )}
    </div>
  );

  const renderRaceProgress = () => (
    <div className="glass p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">This Week's Progress by Race</h3>
        <button onClick={() => setEditingRaces(!editingRaces)} className="text-xs text-gray-500 hover:text-white transition-colors">
          {editingRaces ? 'Done' : 'Edit'}
        </button>
      </div>

      {editingRaces ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {RACES.map((race) => {
            const isActive = activeRaces.includes(race.id);
            return (
              <button key={race.id} onClick={() => toggleRace(race.id)}
                className={`rounded-lg p-3 text-center space-y-2 transition-all border ${isActive ? 'bg-[#1E6F6B]/10 border-[#1E6F6B]/30' : 'bg-white/[0.02] border-white/[0.05] opacity-35'}`}>
                <div className="text-xs font-bold text-gray-400">{race.icon}</div>
                <div className="text-[11px] font-medium text-gray-400 leading-tight">{race.name}</div>
                <div className={`text-[10px] font-semibold uppercase tracking-wider ${isActive ? 'text-[#1E6F6B]' : 'text-gray-600'}`}>
                  {isActive ? 'Active' : 'Hidden'}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className={`grid gap-3 grid-cols-2 ${activeRaces.length <= 3 ? 'sm:grid-cols-3' : activeRaces.length <= 4 ? 'lg:grid-cols-4' : activeRaces.length <= 5 ? 'md:grid-cols-3 lg:grid-cols-5' : 'md:grid-cols-3 lg:grid-cols-6'}`}>
          {aggregatedData.raceProgress
            .filter(({ raceId }) => activeRaces.includes(raceId as RaceId))
            .map(({ raceId, name, icon, pct }) => (
            <button key={raceId} onClick={() => onSelect(raceId as RaceId)}
              className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.05] text-center space-y-2 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all cursor-pointer">
              <div className="text-xs font-bold text-gray-500">{icon}</div>
              <div className="text-[11px] font-medium text-gray-400 leading-tight">{name}</div>
              <div className="relative mx-auto" style={{ width: 48, height: 48 }}>
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="2.5" />
                  <circle cx="18" cy="18" r="15" fill="none"
                    stroke={pct >= 80 ? '#34C759' : pct >= 40 ? '#1E6F6B' : 'rgba(255,255,255,0.1)'}
                    strokeWidth="2.5" strokeDasharray={`${pct * 0.942} 94.2`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-400">{pct}%</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const SECTION_RENDERERS: Record<string, () => React.ReactNode> = {
    'profile': renderProfile,
    'recovery': renderRecovery,
    'quick-stats': renderQuickStats,
    'volume': renderVolumeLine,
    'volume-bar': renderVolumeBar,
    'distribution': renderDistribution,
    'race-progress': renderRaceProgress,
  };

  // Group sections: profile+recovery+quick-stats go into the top 3-col grid,
  // everything else is full-width
  const TOP_ROW_IDS = new Set(['profile', 'recovery', 'quick-stats']);

  const visibleTopRow = layout.filter(s => TOP_ROW_IDS.has(s.id) && s.visible);
  const visibleFullWidth = layout.filter(s => !TOP_ROW_IDS.has(s.id) && s.visible);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {profile.name ? `Welcome back, ${profile.name}` : 'Training Dashboard'}
          </h1>
          <p className="text-gray-600 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Edit Layout Button */}
          <button
            onClick={() => setEditingLayout(!editingLayout)}
            className={`px-4 py-2.5 text-sm font-medium transition-all flex items-center gap-2 rounded-lg border ${
              editingLayout
                ? 'bg-[#1E6F6B] text-white border-[#1E6F6B]'
                : 'glass text-gray-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            <span>{editingLayout ? 'Done' : 'Edit Layout'}</span>
          </button>

          <button
            onClick={onBreakdown}
            className="glass px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Breakdown</span>
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="glow-btn px-5 py-2.5 text-sm font-medium flex items-center gap-2"
            >
              <span>Race Dashboard</span>
              <svg
                className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 glass-elevated rounded-lg overflow-hidden shadow-2xl z-50">
                {RACES.map((race) => (
                  <button
                    key={race.id}
                    onClick={() => { onSelect(race.id); setDropdownOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.06] transition-colors border-b border-white/[0.04] last:border-0"
                  >
                    <span className="text-xs font-bold text-gray-500 w-8">{race.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-white">{race.name}</div>
                      <div className="text-[10px] text-gray-600">{race.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Layout Editor Panel */}
      {editingLayout && (
        <div className="glass p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Dashboard Layout</h3>
            <span className="text-[10px] text-gray-600">Drag to reorder / toggle visibility</span>
          </div>
          <div className="space-y-1.5">
            {layout.map((section, index) => (
              <div
                key={section.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                  dragOverIndex === index
                    ? 'border-[#1E6F6B]/50 bg-[#1E6F6B]/10'
                    : dragIndex === index
                    ? 'border-white/20 bg-white/[0.04] opacity-50'
                    : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                {/* Drag handle */}
                <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                </svg>

                {/* Section name */}
                <span className={`text-sm flex-1 ${section.visible ? 'text-white' : 'text-gray-600'}`}>
                  {section.label}
                </span>

                {/* Up/Down arrows for mobile */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); moveSection(index, index - 1); }}
                    disabled={index === 0}
                    className="p-1 text-gray-600 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveSection(index, index + 1); }}
                    disabled={index === layout.length - 1}
                    className="p-1 text-gray-600 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Toggle */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSection(section.id); }}
                  className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ${
                    section.visible ? 'bg-[#1E6F6B]' : 'bg-white/[0.08]'
                  }`}
                  style={{ width: 40, height: 22 }}
                >
                  <div
                    className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white transition-transform shadow-sm ${
                      section.visible ? 'translate-x-[20px]' : 'translate-x-[2px]'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dashboard content — rendered in layout order */}
      {visibleTopRow.length > 0 && (
        <div className={`grid grid-cols-1 gap-4 ${
          visibleTopRow.length === 1 ? 'lg:grid-cols-1' :
          visibleTopRow.length === 2 ? 'lg:grid-cols-2' :
          'lg:grid-cols-3'
        }`}>
          {visibleTopRow.map(section => (
            <div key={section.id}>{SECTION_RENDERERS[section.id]?.()}</div>
          ))}
        </div>
      )}

      {/* Full-width sections in layout order */}
      {visibleFullWidth.map(section => (
        <div key={section.id}>{SECTION_RENDERERS[section.id]?.()}</div>
      ))}
    </div>
  );
}
