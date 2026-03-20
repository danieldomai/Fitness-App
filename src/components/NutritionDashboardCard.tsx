import { useMemo } from 'react';
import { loadFromStorage } from '../utils';
import type { MealPrepInventory, DailyLog, ConsumedMeal, Macros } from '../nutritionTypes';
import { dailyTotalMacros } from '../nutritionTypes';

interface Props {
  onNavigate: () => void;
}

const MEAL_COLORS: Record<string, string> = {
  breakfast: '#F59E0B',
  lunch: '#3B82F6',
  dinner: '#EF6C57',
  snack: '#8B5CF6',
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NutritionDashboardCard({ onNavigate }: Props) {
  const today = todayKey();
  const calorieGoal = loadFromStorage('nutrition-calorie-goal', 2500);
  const dailyLogs = loadFromStorage<Record<string, DailyLog>>('nutrition-daily-log', {});
  const mealPrep = loadFromStorage<MealPrepInventory>('nutrition-meal-prep', { items: [] });

  const todayLog = dailyLogs[today] || { date: today, meals: [] as ConsumedMeal[], calorieGoal, macroGoals: { calories: 2500, protein: 180, carbs: 300, fat: 70 } };
  const todayMacros = useMemo(() => dailyTotalMacros(todayLog.meals), [todayLog.meals]);

  const prepCounts = useMemo(() => {
    const counts = { breakfast: 0, lunch: 0, dinner: 0, snack: 0, total: 0 };
    for (const item of mealPrep.items) {
      counts[item.mealType] += item.count;
      counts.total += item.count;
    }
    return counts;
  }, [mealPrep]);

  const calPct = calorieGoal > 0 ? Math.min(100, (todayMacros.calories / calorieGoal) * 100) : 0;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (calPct / 100) * circumference;

  return (
    <div className="glass p-5 cursor-pointer hover:border-[#CCF472]/20 transition-colors" onClick={onNavigate}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Nutrition</h3>
        <span className="text-[9px] text-[#CCF472] uppercase tracking-wider font-semibold">View All &rarr;</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Mini calorie ring */}
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 90 90">
            <circle cx="45" cy="45" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
            <circle
              cx="45" cy="45" r="40" fill="none"
              stroke={calPct >= 100 ? '#CCF472' : '#3B82F6'}
              strokeWidth="5" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold text-white">{todayMacros.calories}</span>
            <span className="text-[7px] text-gray-600">/ {calorieGoal}</span>
          </div>
        </div>

        <div className="flex-1 space-y-1.5">
          {/* Macro mini bars */}
          {[
            { label: 'P', val: todayMacros.protein, color: '#3B82F6', goal: 180 },
            { label: 'C', val: todayMacros.carbs, color: '#F59E0B', goal: 300 },
            { label: 'F', val: todayMacros.fat, color: '#EF4444', goal: 70 },
          ].map(m => (
            <div key={m.label} className="flex items-center gap-2">
              <span className="text-[9px] text-gray-600 w-3">{m.label}</span>
              <div className="flex-1 bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (m.val / m.goal) * 100)}%`, background: m.color }} />
              </div>
              <span className="text-[9px] text-gray-600 w-8 text-right">{m.val.toFixed(0)}g</span>
            </div>
          ))}
        </div>
      </div>

      {/* Prep counts row */}
      {prepCounts.total > 0 && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/[0.06]">
          <span className="text-[9px] text-gray-600 uppercase tracking-wider">Prep:</span>
          {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(type => (
            prepCounts[type] > 0 ? (
              <span key={type} className="text-[10px] font-medium" style={{ color: MEAL_COLORS[type] }}>
                {prepCounts[type]} {type.charAt(0).toUpperCase() + type.slice(1)}
              </span>
            ) : null
          ))}
        </div>
      )}
    </div>
  );
}
