import { useState, useEffect, useCallback } from 'react';
import { loadFromStorage, saveToStorage } from '../utils';
import type { MealPrepInventory, ConsumedMeal, DailyLog } from '../nutritionTypes';
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

const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface UndoAction {
  id: string;
  itemName: string;
  timeout: ReturnType<typeof setTimeout>;
  undoFn: () => void;
}

export default function ActivePrepsCard({ onNavigate }: Props) {
  const today = todayKey();
  const calorieGoal = loadFromStorage('nutrition-calorie-goal', 2500);

  // Local state mirrors the cache — allows instant re-render on mutations
  const [mealPrep, setMealPrep] = useState<MealPrepInventory>(() =>
    loadFromStorage<MealPrepInventory>('nutrition-meal-prep', { items: [] })
  );
  const [dailyLogs, setDailyLogs] = useState<Record<string, DailyLog>>(() =>
    loadFromStorage<Record<string, DailyLog>>('nutrition-daily-log', {})
  );
  const [undoActions, setUndoActions] = useState<UndoAction[]>([]);
  const [animatingIdx, setAnimatingIdx] = useState<number | null>(null);

  // Re-sync from cache whenever external changes happen (e.g. NutritionPage edits)
  useEffect(() => {
    const interval = setInterval(() => {
      const freshPrep = loadFromStorage<MealPrepInventory>('nutrition-meal-prep', { items: [] });
      const freshLogs = loadFromStorage<Record<string, DailyLog>>('nutrition-daily-log', {});
      setMealPrep(freshPrep);
      setDailyLogs(freshLogs);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const todayLog = dailyLogs[today] || {
    date: today,
    meals: [] as ConsumedMeal[],
    calorieGoal,
    macroGoals: { calories: 2500, protein: 180, carbs: 300, fat: 70 },
  };
  const todayMacros = dailyTotalMacros(todayLog.meals);

  const saveMealPrep = useCallback((updated: MealPrepInventory) => {
    setMealPrep(updated);
    saveToStorage('nutrition-meal-prep', updated);
  }, []);

  const saveDailyLogs = useCallback((updated: Record<string, DailyLog>) => {
    setDailyLogs(updated);
    saveToStorage('nutrition-daily-log', updated);
  }, []);

  const consumePrepItem = useCallback((itemIdx: number) => {
    const item = mealPrep.items[itemIdx];
    if (!item || item.count <= 0) return;

    // Animate
    setAnimatingIdx(itemIdx);
    setTimeout(() => setAnimatingIdx(null), 400);

    // Save snapshot for undo
    const prevPrep = { items: [...mealPrep.items.map(i => ({ ...i }))] };
    const prevLogs = { ...dailyLogs };

    // Decrement prep count
    const updatedItems = [...mealPrep.items];
    updatedItems[itemIdx] = { ...item, count: item.count - 1 };
    if (updatedItems[itemIdx].count <= 0) updatedItems.splice(itemIdx, 1);
    const newPrep = { items: updatedItems };
    saveMealPrep(newPrep);

    // Log to daily consumed
    const meal: ConsumedMeal = {
      id: uid(),
      mealType: item.mealType,
      name: item.recipeName,
      macros: { ...item.macrosPerPortion },
      source: 'prep',
      timestamp: new Date().toISOString(),
    };
    const log = { ...todayLog, meals: [...todayLog.meals, meal] };
    const newLogs = { ...dailyLogs, [today]: log };
    saveDailyLogs(newLogs);

    // Create undo action
    const undoId = uid();
    const timeout = setTimeout(() => {
      setUndoActions(prev => prev.filter(u => u.id !== undoId));
    }, 5000);

    const undoFn = () => {
      saveMealPrep(prevPrep);
      saveDailyLogs(prevLogs);
      clearTimeout(timeout);
      setUndoActions(prev => prev.filter(u => u.id !== undoId));
    };

    setUndoActions(prev => [...prev, { id: undoId, itemName: item.recipeName, timeout, undoFn }]);
  }, [mealPrep, dailyLogs, todayLog, today, saveMealPrep, saveDailyLogs]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      undoActions.forEach(u => clearTimeout(u.timeout));
    };
  }, []);

  const activeItems = mealPrep.items.filter(i => i.count > 0);
  const calPct = calorieGoal > 0 ? Math.min(100, (todayMacros.calories / calorieGoal) * 100) : 0;

  if (activeItems.length === 0) {
    return (
      <div className="glass p-5 cursor-pointer hover:border-[#CCF472]/20 transition-colors" onClick={onNavigate}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Active Preps</h3>
          <span className="text-[9px] text-[#CCF472] uppercase tracking-wider font-semibold">Manage &rarr;</span>
        </div>
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xs text-gray-600 text-center">No meals prepped yet</p>
          <p className="text-[10px] text-gray-700 text-center">Cook a batch in the Nutrition tab to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass p-5 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Active Preps</h3>
        <button
          onClick={onNavigate}
          className="text-[9px] text-[#CCF472] uppercase tracking-wider font-semibold hover:underline"
        >
          Nutrition Tab &rarr;
        </button>
      </div>

      {/* Today's calorie progress mini-bar */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[9px] text-gray-600 uppercase tracking-wider">Today</span>
        <div className="flex-1 bg-white/[0.06] rounded-full h-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${calPct}%`,
              background: calPct >= 100 ? '#CCF472' : 'linear-gradient(90deg, #3B82F6, #8B5CF6)',
            }}
          />
        </div>
        <span className="text-[10px] text-gray-500 tabular-nums w-20 text-right">
          {todayMacros.calories} / {calorieGoal}
        </span>
      </div>

      {/* Prep items */}
      <div className="space-y-2">
        {activeItems.map((item) => {
          const realIdx = mealPrep.items.indexOf(item);
          const isAnimating = animatingIdx === realIdx;
          return (
            <div
              key={`${item.recipeId}-${item.recipeName}`}
              className={`rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 transition-all duration-300 ${
                isAnimating ? 'scale-[0.98] opacity-70' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left: info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{MEAL_ICONS[item.mealType] || '🍽️'}</span>
                    <h4 className="text-sm font-semibold text-white truncate">{item.recipeName}</h4>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="font-medium" style={{ color: MEAL_COLORS[item.mealType] }}>
                      {item.count} {item.count === 1 ? 'portion' : 'portions'} left
                    </span>
                    <span className="text-gray-600">|</span>
                    <span className="text-gray-500">{item.macrosPerPortion.calories} kcal</span>
                  </div>
                  {/* Macro chips */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <MacroChip label="P" value={item.macrosPerPortion.protein} color="#3B82F6" />
                    <MacroChip label="C" value={item.macrosPerPortion.carbs} color="#F59E0B" />
                    <MacroChip label="F" value={item.macrosPerPortion.fat} color="#EF4444" />
                  </div>
                </div>

                {/* Right: log button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    consumePrepItem(realIdx);
                  }}
                  className="flex-shrink-0 w-10 h-10 rounded-lg flex flex-col items-center justify-center gap-0.5 bg-[#CCF472]/10 hover:bg-[#CCF472]/25 border border-[#CCF472]/20 hover:border-[#CCF472]/40 transition-all group"
                  title={`Log one ${item.recipeName}`}
                >
                  <svg className="w-4 h-4 text-[#CCF472] group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                  </svg>
                  <span className="text-[7px] text-[#CCF472] font-bold uppercase">Log</span>
                </button>
              </div>

              {/* Low-stock warning */}
              {item.count <= 2 && (
                <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                  <svg className="w-3 h-3 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-[9px] text-amber-400 font-medium">
                    {item.count === 1 ? 'Last portion!' : 'Running low — only 2 left'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Undo toast notifications */}
      {undoActions.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
          {undoActions.map(action => (
            <div
              key={action.id}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#1A1A1A] border border-white/[0.1] shadow-2xl animate-slide-up"
            >
              <svg className="w-4 h-4 text-[#CCF472] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-gray-300">
                Logged <span className="font-medium text-white">{action.itemName}</span>
              </span>
              <button
                onClick={action.undoFn}
                className="ml-2 px-3 py-1 rounded text-xs font-bold text-[#CCF472] bg-[#CCF472]/10 hover:bg-[#CCF472]/20 border border-[#CCF472]/30 transition-colors"
              >
                Undo
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MacroChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium"
      style={{ background: `${color}15`, color }}
    >
      {label} {value.toFixed(0)}g
    </span>
  );
}
