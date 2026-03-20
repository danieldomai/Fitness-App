import { useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { loadFromStorage, saveToStorage } from '../utils';
import type {
  Recipe, Ingredient, MealPrepInventory,
  ConsumedMeal, DailyLog, PantryItem, ShoppingItem,
  Macros,
} from '../nutritionTypes';
import {
  recipeTotalMacros, recipePerPortionMacros, dailyTotalMacros,
} from '../nutritionTypes';

const MEAL_COLORS: Record<string, string> = {
  breakfast: '#F59E0B',
  lunch: '#3B82F6',
  dinner: '#EF6C57',
  snack: '#8B5CF6',
};

const MACRO_COLORS = { protein: '#3B82F6', carbs: '#F59E0B', fat: '#EF4444' };

const tooltipStyle = {
  contentStyle: { background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, fontSize: 12 },
  itemStyle: { color: '#E5E7EB' },
  labelStyle: { color: '#9CA3AF' },
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function pastDayKeys(count: number): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Sub-views ──
type SubView = 'overview' | 'recipes' | 'recipe-detail' | 'pantry';

export default function NutritionPage() {
  const today = todayKey();

  // ── Calorie & macro goals ──
  const [calorieGoal, setCalorieGoal] = useState(() => loadFromStorage('nutrition-calorie-goal', 2500));
  const [macroGoals, setMacroGoals] = useState<Macros>(() =>
    loadFromStorage('nutrition-macro-goals', { calories: 2500, protein: 180, carbs: 300, fat: 70 }),
  );

  // ── Daily logs ──
  const [dailyLogs, setDailyLogs] = useState<Record<string, DailyLog>>(() =>
    loadFromStorage('nutrition-daily-log', {}),
  );

  // ── Recipes ──
  const [recipes, setRecipes] = useState<Recipe[]>(() =>
    loadFromStorage('nutrition-recipes', []),
  );

  // ── Meal prep inventory ──
  const [mealPrep, setMealPrep] = useState<MealPrepInventory>(() =>
    loadFromStorage('nutrition-meal-prep', { items: [] }),
  );

  // ── Pantry ──
  const [pantry, setPantry] = useState<PantryItem[]>(() =>
    loadFromStorage('nutrition-pantry', []),
  );

  // ── Shopping list ──
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>(() =>
    loadFromStorage('nutrition-shopping-list', []),
  );

  // ── UI State ──
  const [subView, setSubView] = useState<SubView>('overview');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [showAddPantry, setShowAddPantry] = useState(false);
  const [batchInput, setBatchInput] = useState('5');

  // ── Manual meal entry state ──
  const [manualMeal, setManualMeal] = useState({ name: '', mealType: 'lunch' as ConsumedMeal['mealType'], calories: '', protein: '', carbs: '', fat: '' });

  // ── New recipe state ──
  const [newRecipe, setNewRecipe] = useState({ name: '', mealType: 'lunch' as Recipe['mealType'], batchSize: '5' });
  const [newIngredients, setNewIngredients] = useState<Ingredient[]>([]);
  const [ingForm, setIngForm] = useState({ name: '', amount: '', unit: 'g', calories: '', protein: '', carbs: '', fat: '' });

  // ── New pantry item state ──
  const [newPantryItem, setNewPantryItem] = useState({ name: '', amount: '', unit: 'g', category: 'other' });

  // ── Derived data ──
  const todayLog = dailyLogs[today] || { date: today, meals: [], calorieGoal, macroGoals };
  const todayMacros = useMemo(() => dailyTotalMacros(todayLog.meals), [todayLog.meals]);

  const prepCounts = useMemo(() => {
    const counts = { breakfast: 0, lunch: 0, dinner: 0, snack: 0, total: 0 };
    for (const item of mealPrep.items) {
      counts[item.mealType] += item.count;
      counts.total += item.count;
    }
    return counts;
  }, [mealPrep]);

  // ── Weekly calorie trend ──
  const weeklyCalorieData = useMemo(() => {
    return pastDayKeys(7).map(dk => {
      const log = dailyLogs[dk];
      const total = log ? dailyTotalMacros(log.meals).calories : 0;
      return { day: dk.slice(5), calories: total, goal: calorieGoal };
    });
  }, [dailyLogs, calorieGoal]);

  // ── Daily macro split (today) ──
  const macroSplitData = useMemo(() => [
    { name: 'Protein', value: todayMacros.protein, color: MACRO_COLORS.protein },
    { name: 'Carbs', value: todayMacros.carbs, color: MACRO_COLORS.carbs },
    { name: 'Fat', value: todayMacros.fat, color: MACRO_COLORS.fat },
  ], [todayMacros]);

  // ── Helpers ──

  function saveDailyLogs(updated: Record<string, DailyLog>) {
    setDailyLogs(updated);
    saveToStorage('nutrition-daily-log', updated);
  }

  function saveMealPrep(updated: MealPrepInventory) {
    setMealPrep(updated);
    saveToStorage('nutrition-meal-prep', updated);
  }

  function savePantry(updated: PantryItem[]) {
    setPantry(updated);
    saveToStorage('nutrition-pantry', updated);
  }

  function saveRecipes(updated: Recipe[]) {
    setRecipes(updated);
    saveToStorage('nutrition-recipes', updated);
  }

  function saveShopping(updated: ShoppingItem[]) {
    setShoppingList(updated);
    saveToStorage('nutrition-shopping-list', updated);
  }

  // ── Consume a meal-prep portion ──
  function consumePrepItem(itemIdx: number) {
    const item = mealPrep.items[itemIdx];
    if (!item || item.count <= 0) return;

    // Decrement prep count
    const updatedItems = [...mealPrep.items];
    updatedItems[itemIdx] = { ...item, count: item.count - 1 };
    if (updatedItems[itemIdx].count <= 0) updatedItems.splice(itemIdx, 1);
    saveMealPrep({ items: updatedItems });

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
    saveDailyLogs({ ...dailyLogs, [today]: log });
  }

  // ── Log manual meal ──
  function handleLogManualMeal() {
    const meal: ConsumedMeal = {
      id: uid(),
      mealType: manualMeal.mealType,
      name: manualMeal.name || 'Quick Meal',
      macros: {
        calories: parseInt(manualMeal.calories) || 0,
        protein: parseFloat(manualMeal.protein) || 0,
        carbs: parseFloat(manualMeal.carbs) || 0,
        fat: parseFloat(manualMeal.fat) || 0,
      },
      source: 'manual',
      timestamp: new Date().toISOString(),
    };
    const log = { ...todayLog, meals: [...todayLog.meals, meal] };
    saveDailyLogs({ ...dailyLogs, [today]: log });
    setManualMeal({ name: '', mealType: 'lunch', calories: '', protein: '', carbs: '', fat: '' });
    setShowAddMeal(false);
  }

  // ── Create recipe ──
  function handleCreateRecipe() {
    const recipe: Recipe = {
      id: uid(),
      name: newRecipe.name || 'Untitled Recipe',
      mealType: newRecipe.mealType,
      ingredients: [...newIngredients],
      batchSize: parseInt(newRecipe.batchSize) || 1,
      createdAt: new Date().toISOString(),
    };
    saveRecipes([...recipes, recipe]);
    setNewRecipe({ name: '', mealType: 'lunch', batchSize: '5' });
    setNewIngredients([]);
    setShowAddRecipe(false);
  }

  // ── Add ingredient to new recipe ──
  function handleAddIngredient() {
    const ing: Ingredient = {
      id: uid(),
      name: ingForm.name || 'Ingredient',
      amount: parseFloat(ingForm.amount) || 0,
      unit: ingForm.unit,
      macros: {
        calories: parseInt(ingForm.calories) || 0,
        protein: parseFloat(ingForm.protein) || 0,
        carbs: parseFloat(ingForm.carbs) || 0,
        fat: parseFloat(ingForm.fat) || 0,
      },
    };
    setNewIngredients([...newIngredients, ing]);
    setIngForm({ name: '', amount: '', unit: 'g', calories: '', protein: '', carbs: '', fat: '' });
  }

  // ── Cook batch (add to meal prep + deduct from pantry) ──
  function handleCookBatch(recipe: Recipe, batchCount: number) {
    const perPortion = recipePerPortionMacros(recipe);

    // Add to meal prep
    const existing = mealPrep.items.findIndex(i => i.recipeId === recipe.id);
    const updatedItems = [...mealPrep.items];
    if (existing >= 0) {
      updatedItems[existing] = { ...updatedItems[existing], count: updatedItems[existing].count + batchCount };
    } else {
      updatedItems.push({
        recipeId: recipe.id,
        recipeName: recipe.name,
        mealType: recipe.mealType,
        count: batchCount,
        macrosPerPortion: perPortion,
      });
    }
    saveMealPrep({ items: updatedItems });

    // Deduct ingredients from pantry (scaled by batch ratio)
    const scale = batchCount / (recipe.batchSize || 1);
    const updatedPantry = [...pantry];
    const newShoppingItems: ShoppingItem[] = [];

    for (const ing of recipe.ingredients) {
      const needed = ing.amount * scale;
      const pantryIdx = updatedPantry.findIndex(
        p => p.name.toLowerCase() === ing.name.toLowerCase() && p.unit === ing.unit,
      );

      if (pantryIdx >= 0) {
        updatedPantry[pantryIdx] = {
          ...updatedPantry[pantryIdx],
          amount: Math.max(0, updatedPantry[pantryIdx].amount - needed),
        };
        if (updatedPantry[pantryIdx].amount <= 0) {
          newShoppingItems.push({
            id: uid(),
            name: ing.name,
            amount: needed,
            unit: ing.unit,
            reason: `Out of stock after ${recipe.name}`,
            checked: false,
          });
        }
      } else {
        newShoppingItems.push({
          id: uid(),
          name: ing.name,
          amount: needed,
          unit: ing.unit,
          reason: `Not in pantry (needed for ${recipe.name})`,
          checked: false,
        });
      }
    }

    savePantry(updatedPantry);
    if (newShoppingItems.length > 0) {
      saveShopping([...shoppingList, ...newShoppingItems]);
    }
  }

  // ── Add pantry item ──
  function handleAddPantryItem() {
    const item: PantryItem = {
      id: uid(),
      name: newPantryItem.name || 'Item',
      amount: parseFloat(newPantryItem.amount) || 0,
      unit: newPantryItem.unit,
      category: newPantryItem.category,
    };
    savePantry([...pantry, item]);
    setNewPantryItem({ name: '', amount: '', unit: 'g', category: 'other' });
    setShowAddPantry(false);
  }

  // ── Update calorie goal ──
  function updateCalorieGoal(val: number) {
    setCalorieGoal(val);
    saveToStorage('nutrition-calorie-goal', val);
  }

  function updateMacroGoals(updated: Macros) {
    setMacroGoals(updated);
    saveToStorage('nutrition-macro-goals', updated);
  }

  // ── Delete consumed meal ──
  function deleteMeal(mealId: string) {
    const log = { ...todayLog, meals: todayLog.meals.filter(m => m.id !== mealId) };
    saveDailyLogs({ ...dailyLogs, [today]: log });
  }

  // ── Progress ring ──
  const calPct = calorieGoal > 0 ? Math.min(100, (todayMacros.calories / calorieGoal) * 100) : 0;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (calPct / 100) * circumference;

  // ── Render: Overview ──
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Top Row: Calorie Ring + Macro Bars + Prep Inventory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calorie Progress Ring */}
        <div className="glass p-5 flex flex-col items-center">
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3 self-start">Daily Calories</h3>
          <div className="relative w-28 h-28">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <circle
                cx="50" cy="50" r="45" fill="none"
                stroke={calPct >= 100 ? '#CCF472' : '#3B82F6'}
                strokeWidth="6" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-white">{todayMacros.calories}</span>
              <span className="text-[9px] text-gray-500">/ {calorieGoal} kcal</span>
            </div>
          </div>
          <div className="mt-3 w-full">
            <label className="text-[9px] text-gray-600 uppercase tracking-wider">Goal</label>
            <input
              type="number" min="500" max="10000" step="50"
              value={calorieGoal}
              onChange={(e) => updateCalorieGoal(parseInt(e.target.value) || 2500)}
              className="w-full glass-input px-2 py-1 text-sm text-center mt-1"
            />
          </div>
        </div>

        {/* Macro Bars */}
        <div className="glass p-5">
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Macros Today</h3>
          <div className="space-y-3">
            {[
              { key: 'protein' as const, label: 'Protein', color: MACRO_COLORS.protein, val: todayMacros.protein, goal: macroGoals.protein },
              { key: 'carbs' as const, label: 'Carbs', color: MACRO_COLORS.carbs, val: todayMacros.carbs, goal: macroGoals.carbs },
              { key: 'fat' as const, label: 'Fat', color: MACRO_COLORS.fat, val: todayMacros.fat, goal: macroGoals.fat },
            ].map(({ key, label, color, val, goal }) => (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">{label}</span>
                  <span className="text-gray-500">{val.toFixed(0)}g / {goal}g</span>
                </div>
                <div className="w-full bg-white/[0.06] rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (val / goal) * 100)}%`, background: color }} />
                </div>
                <input
                  type="number" min="0" max="1000"
                  value={goal}
                  onChange={(e) => updateMacroGoals({ ...macroGoals, [key]: parseInt(e.target.value) || 0 })}
                  className="w-full glass-input px-2 py-0.5 text-[10px] text-center mt-1"
                  placeholder={`${label} goal (g)`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Meal Prep Inventory */}
        <div className="glass p-5">
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Meal Prep Inventory</h3>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(type => (
              <div key={type} className="bg-white/[0.02] border border-white/[0.05] rounded p-2.5 text-center">
                <div className="text-[9px] text-gray-600 uppercase tracking-wider">{type}</div>
                <div className="text-lg font-bold mt-0.5" style={{ color: MEAL_COLORS[type] }}>{prepCounts[type]}</div>
              </div>
            ))}
          </div>
          <div className="text-center border-t border-white/[0.06] pt-3">
            <span className="text-[9px] text-gray-600 uppercase tracking-wider">Total Portions</span>
            <div className="text-2xl font-bold text-[#CCF472]">{prepCounts.total}</div>
          </div>

          {/* Prep items with subtract buttons */}
          {mealPrep.items.length > 0 && (
            <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto">
              {mealPrep.items.map((item, idx) => (
                <div key={`${item.recipeId}-${idx}`} className="flex items-center justify-between bg-white/[0.02] rounded px-3 py-2 border border-white/[0.04]">
                  <div>
                    <div className="text-xs font-medium text-gray-300">{item.recipeName}</div>
                    <div className="text-[9px] text-gray-600">{item.count} portions | {item.macrosPerPortion.calories} kcal ea</div>
                  </div>
                  <button
                    onClick={() => consumePrepItem(idx)}
                    className="w-7 h-7 rounded flex items-center justify-center text-sm font-bold bg-white/[0.06] hover:bg-[#CCF472]/20 hover:text-[#CCF472] text-gray-400 transition-colors"
                    title="Eat one portion"
                  >
                    -
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick-add buttons */}
      <div className="glass p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Log a Meal</h3>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(type => (
            <button
              key={type}
              onClick={() => { setManualMeal({ ...manualMeal, mealType: type }); setShowAddMeal(true); }}
              className="px-4 py-2 rounded text-xs font-medium border transition-colors hover:bg-white/[0.06]"
              style={{ borderColor: MEAL_COLORS[type] + '40', color: MEAL_COLORS[type] }}
            >
              + {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {showAddMeal && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-gray-600 uppercase tracking-wider block mb-1">Meal Name</label>
                <input value={manualMeal.name} onChange={(e) => setManualMeal({ ...manualMeal, name: e.target.value })} className="w-full glass-input px-2 py-1.5 text-sm" placeholder="e.g. Chicken Bowl" />
              </div>
              <div>
                <label className="text-[9px] text-gray-600 uppercase tracking-wider block mb-1">Type</label>
                <select value={manualMeal.mealType} onChange={(e) => setManualMeal({ ...manualMeal, mealType: e.target.value as ConsumedMeal['mealType'] })} className="w-full glass-input px-2 py-1.5 text-sm bg-transparent">
                  <option value="breakfast" className="bg-[#0E0E0E]">Breakfast</option>
                  <option value="lunch" className="bg-[#0E0E0E]">Lunch</option>
                  <option value="dinner" className="bg-[#0E0E0E]">Dinner</option>
                  <option value="snack" className="bg-[#0E0E0E]">Snack</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-[9px] text-gray-600 uppercase tracking-wider block mb-1">Calories</label>
                <input type="number" value={manualMeal.calories} onChange={(e) => setManualMeal({ ...manualMeal, calories: e.target.value })} className="w-full glass-input px-2 py-1.5 text-sm" placeholder="kcal" />
              </div>
              <div>
                <label className="text-[9px] text-gray-600 uppercase tracking-wider block mb-1">Protein (g)</label>
                <input type="number" value={manualMeal.protein} onChange={(e) => setManualMeal({ ...manualMeal, protein: e.target.value })} className="w-full glass-input px-2 py-1.5 text-sm" placeholder="g" />
              </div>
              <div>
                <label className="text-[9px] text-gray-600 uppercase tracking-wider block mb-1">Carbs (g)</label>
                <input type="number" value={manualMeal.carbs} onChange={(e) => setManualMeal({ ...manualMeal, carbs: e.target.value })} className="w-full glass-input px-2 py-1.5 text-sm" placeholder="g" />
              </div>
              <div>
                <label className="text-[9px] text-gray-600 uppercase tracking-wider block mb-1">Fat (g)</label>
                <input type="number" value={manualMeal.fat} onChange={(e) => setManualMeal({ ...manualMeal, fat: e.target.value })} className="w-full glass-input px-2 py-1.5 text-sm" placeholder="g" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleLogManualMeal} className="glow-btn px-4 py-2 text-sm">Log Meal</button>
              <button onClick={() => setShowAddMeal(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-white transition-colors">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Today's Meals */}
      {todayLog.meals.length > 0 && (
        <div className="glass p-5">
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Today's Meals</h3>
          <div className="space-y-2">
            {todayLog.meals.map(meal => (
              <div key={meal.id} className="flex items-center justify-between bg-white/[0.02] border border-white/[0.04] rounded px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: MEAL_COLORS[meal.mealType] }} />
                  <div>
                    <div className="text-sm font-medium text-gray-300">{meal.name}</div>
                    <div className="text-[10px] text-gray-600">
                      {meal.macros.calories} kcal | P {meal.macros.protein}g | C {meal.macros.carbs}g | F {meal.macros.fat}g
                      {meal.source === 'prep' && <span className="ml-1.5 text-[#CCF472]">(prep)</span>}
                    </div>
                  </div>
                </div>
                <button onClick={() => deleteMeal(meal.id)} className="text-xs text-gray-600 hover:text-red-400 transition-colors">Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts: Weekly Calorie Trend + Macro Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass p-5">
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Weekly Calorie Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyCalorieData}>
              <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip {...tooltipStyle} />
              <Line type="monotone" dataKey="calories" stroke="#CCF472" strokeWidth={2} dot={{ fill: '#CCF472', r: 3 }} />
              <Line type="monotone" dataKey="goal" stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" strokeWidth={1} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass p-5">
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Macro Split (Today)</h3>
          {todayMacros.protein + todayMacros.carbs + todayMacros.fat > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={macroSplitData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" nameKey="name">
                  {macroSplitData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={(value) => `${Number(value).toFixed(1)}g`} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-xs text-gray-600">No meals logged yet today</div>
          )}
        </div>
      </div>

      {/* Weekly Macro Stacked Bar */}
      <div className="glass p-5">
        <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Daily Macro Breakdown (Past 7 Days)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={pastDayKeys(7).map(dk => {
            const log = dailyLogs[dk];
            const m = log ? dailyTotalMacros(log.meals) : { protein: 0, carbs: 0, fat: 0 };
            return { day: dk.slice(5), protein: m.protein, carbs: m.carbs, fat: m.fat };
          })}>
            <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
            <Tooltip {...tooltipStyle} formatter={(value) => `${Number(value).toFixed(1)}g`} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="protein" stackId="a" fill={MACRO_COLORS.protein} radius={[0, 0, 0, 0]} />
            <Bar dataKey="carbs" stackId="a" fill={MACRO_COLORS.carbs} />
            <Bar dataKey="fat" stackId="a" fill={MACRO_COLORS.fat} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  // ── Render: Recipes ──
  const renderRecipes = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recipes</h3>
        <button onClick={() => setShowAddRecipe(!showAddRecipe)} className="glow-btn px-4 py-2 text-xs">
          {showAddRecipe ? 'Cancel' : '+ New Recipe'}
        </button>
      </div>

      {showAddRecipe && (
        <div className="glass p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[9px] text-gray-600 uppercase tracking-wider block mb-1">Recipe Name</label>
              <input value={newRecipe.name} onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })} className="w-full glass-input px-2 py-1.5 text-sm" placeholder="Chicken & Rice" />
            </div>
            <div>
              <label className="text-[9px] text-gray-600 uppercase tracking-wider block mb-1">Meal Type</label>
              <select value={newRecipe.mealType} onChange={(e) => setNewRecipe({ ...newRecipe, mealType: e.target.value as Recipe['mealType'] })} className="w-full glass-input px-2 py-1.5 text-sm bg-transparent">
                <option value="breakfast" className="bg-[#0E0E0E]">Breakfast</option>
                <option value="lunch" className="bg-[#0E0E0E]">Lunch</option>
                <option value="dinner" className="bg-[#0E0E0E]">Dinner</option>
                <option value="snack" className="bg-[#0E0E0E]">Snack</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] text-gray-600 uppercase tracking-wider block mb-1">Batch Size (portions)</label>
              <input type="number" min="1" value={newRecipe.batchSize} onChange={(e) => setNewRecipe({ ...newRecipe, batchSize: e.target.value })} className="w-full glass-input px-2 py-1.5 text-sm" />
            </div>
          </div>

          {/* Add Ingredient */}
          <div>
            <h4 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Ingredients</h4>
            <div className="grid grid-cols-7 gap-2 mb-2">
              <input value={ingForm.name} onChange={(e) => setIngForm({ ...ingForm, name: e.target.value })} className="col-span-2 glass-input px-2 py-1.5 text-xs" placeholder="Name" />
              <input type="number" value={ingForm.amount} onChange={(e) => setIngForm({ ...ingForm, amount: e.target.value })} className="glass-input px-2 py-1.5 text-xs" placeholder="Amount" />
              <select value={ingForm.unit} onChange={(e) => setIngForm({ ...ingForm, unit: e.target.value })} className="glass-input px-1 py-1.5 text-xs bg-transparent">
                {['g', 'ml', 'oz', 'cups', 'tbsp', 'tsp', 'whole'].map(u => <option key={u} value={u} className="bg-[#0E0E0E]">{u}</option>)}
              </select>
              <input type="number" value={ingForm.calories} onChange={(e) => setIngForm({ ...ingForm, calories: e.target.value })} className="glass-input px-2 py-1.5 text-xs" placeholder="kcal" />
              <input type="number" value={ingForm.protein} onChange={(e) => setIngForm({ ...ingForm, protein: e.target.value })} className="glass-input px-2 py-1.5 text-xs" placeholder="P (g)" />
              <div className="flex gap-1">
                <input type="number" value={ingForm.carbs} onChange={(e) => setIngForm({ ...ingForm, carbs: e.target.value })} className="w-1/2 glass-input px-1 py-1.5 text-xs" placeholder="C" />
                <input type="number" value={ingForm.fat} onChange={(e) => setIngForm({ ...ingForm, fat: e.target.value })} className="w-1/2 glass-input px-1 py-1.5 text-xs" placeholder="F" />
              </div>
            </div>
            <button onClick={handleAddIngredient} className="text-xs text-[#CCF472] hover:text-white transition-colors">+ Add Ingredient</button>
          </div>

          {/* Ingredient list */}
          {newIngredients.length > 0 && (
            <div className="space-y-1">
              {newIngredients.map((ing, idx) => (
                <div key={ing.id} className="flex items-center justify-between bg-white/[0.02] rounded px-3 py-1.5 text-xs">
                  <span className="text-gray-300">{ing.name} — {ing.amount}{ing.unit}</span>
                  <span className="text-gray-500">{ing.macros.calories} kcal | P{ing.macros.protein} C{ing.macros.carbs} F{ing.macros.fat}</span>
                  <button onClick={() => setNewIngredients(newIngredients.filter((_, i) => i !== idx))} className="text-gray-600 hover:text-red-400 ml-2">x</button>
                </div>
              ))}
            </div>
          )}

          <button onClick={handleCreateRecipe} className="glow-btn px-5 py-2 text-sm" disabled={newIngredients.length === 0}>
            Save Recipe
          </button>
        </div>
      )}

      {/* Recipe List */}
      <div className="space-y-3">
        {recipes.length === 0 && !showAddRecipe && (
          <div className="glass p-8 text-center text-sm text-gray-600">No recipes yet. Create your first recipe above.</div>
        )}
        {recipes.map(recipe => {
          const total = recipeTotalMacros(recipe);
          const perPortion = recipePerPortionMacros(recipe);
          return (
            <div key={recipe.id} className="glass p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-medium text-white">{recipe.name}</span>
                  <span className="ml-2 text-[9px] px-2 py-0.5 rounded uppercase tracking-wider font-semibold" style={{ color: MEAL_COLORS[recipe.mealType], background: MEAL_COLORS[recipe.mealType] + '15' }}>
                    {recipe.mealType}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setSelectedRecipeId(recipe.id); setBatchInput(String(recipe.batchSize)); setSubView('recipe-detail'); }}
                    className="text-xs text-gray-500 hover:text-[#CCF472] transition-colors"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => handleCookBatch(recipe, recipe.batchSize)}
                    className="glow-btn px-3 py-1.5 text-[10px]"
                  >
                    Cook Batch ({recipe.batchSize})
                  </button>
                  <button
                    onClick={() => saveRecipes(recipes.filter(r => r.id !== recipe.id))}
                    className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white/[0.02] rounded p-2 border border-white/[0.04]">
                  <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Total Batch ({recipe.batchSize} portions)</div>
                  <span className="text-gray-400">{total.calories} kcal | P{total.protein.toFixed(0)} C{total.carbs.toFixed(0)} F{total.fat.toFixed(0)}</span>
                </div>
                <div className="bg-white/[0.02] rounded p-2 border border-white/[0.04]">
                  <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Per Portion</div>
                  <span className="text-gray-400">{perPortion.calories} kcal | P{perPortion.protein} C{perPortion.carbs} F{perPortion.fat}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── Render: Recipe Detail ──
  const renderRecipeDetail = () => {
    const recipe = recipes.find(r => r.id === selectedRecipeId);
    if (!recipe) return <div className="text-sm text-gray-500">Recipe not found.</div>;

    const total = recipeTotalMacros(recipe);
    const perPortion = recipePerPortionMacros(recipe);

    // Stock check
    const stockStatus = recipe.ingredients.map(ing => {
      const pantryItem = pantry.find(p => p.name.toLowerCase() === ing.name.toLowerCase() && p.unit === ing.unit);
      const inStock = pantryItem?.amount ?? 0;
      const needed = ing.amount;
      return { ...ing, inStock, needed, sufficient: inStock >= needed };
    });

    return (
      <div className="space-y-6">
        <button onClick={() => setSubView('recipes')} className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to Recipes
        </button>

        <div className="glass p-5">
          <h2 className="text-lg font-bold text-white mb-1">{recipe.name}</h2>
          <span className="text-[9px] px-2 py-0.5 rounded uppercase tracking-wider font-semibold" style={{ color: MEAL_COLORS[recipe.mealType], background: MEAL_COLORS[recipe.mealType] + '15' }}>
            {recipe.mealType}
          </span>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-white/[0.02] border border-white/[0.05] rounded p-3">
              <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-2">Total Batch ({recipe.batchSize} portions)</div>
              <div className="text-xl font-bold text-white">{total.calories} <span className="text-xs font-normal text-gray-500">kcal</span></div>
              <div className="text-xs text-gray-500 mt-1">P {total.protein.toFixed(1)}g | C {total.carbs.toFixed(1)}g | F {total.fat.toFixed(1)}g</div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.05] rounded p-3">
              <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-2">Per Portion</div>
              <div className="text-xl font-bold text-[#CCF472]">{perPortion.calories} <span className="text-xs font-normal text-gray-500">kcal</span></div>
              <div className="text-xs text-gray-500 mt-1">P {perPortion.protein}g | C {perPortion.carbs}g | F {perPortion.fat}g</div>
            </div>
          </div>

          {/* Cook batch with editable count */}
          <div className="flex items-center gap-3 mt-4">
            <label className="text-[9px] text-gray-600 uppercase tracking-wider">Cook batch:</label>
            <input
              type="number" min="1"
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              className="w-20 glass-input px-2 py-1.5 text-sm text-center"
            />
            <span className="text-xs text-gray-500">portions</span>
            <button onClick={() => handleCookBatch(recipe, parseInt(batchInput) || recipe.batchSize)} className="glow-btn px-4 py-1.5 text-xs">
              Cook
            </button>
          </div>
        </div>

        {/* Ingredients Table */}
        <div className="glass p-5">
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Ingredients</h3>
          <table className="glass-table w-full text-xs">
            <thead>
              <tr>
                <th className="text-left px-3 py-2">Ingredient</th>
                <th className="text-right px-3 py-2">Amount</th>
                <th className="text-right px-3 py-2">Calories</th>
                <th className="text-right px-3 py-2">P</th>
                <th className="text-right px-3 py-2">C</th>
                <th className="text-right px-3 py-2">F</th>
              </tr>
            </thead>
            <tbody>
              {recipe.ingredients.map(ing => (
                <tr key={ing.id}>
                  <td className="px-3 py-2 text-gray-300">{ing.name}</td>
                  <td className="px-3 py-2 text-right">{ing.amount} {ing.unit}</td>
                  <td className="px-3 py-2 text-right">{ing.macros.calories}</td>
                  <td className="px-3 py-2 text-right">{ing.macros.protein}g</td>
                  <td className="px-3 py-2 text-right">{ing.macros.carbs}g</td>
                  <td className="px-3 py-2 text-right">{ing.macros.fat}g</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Stock Check */}
        <div className="glass p-5">
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Stock Check</h3>
          <div className="space-y-2">
            {stockStatus.map(item => (
              <div key={item.id} className={`flex items-center justify-between rounded px-3 py-2 border ${item.sufficient ? 'border-green-500/20 bg-green-500/[0.03]' : 'border-red-500/20 bg-red-500/[0.03]'}`}>
                <span className="text-xs text-gray-300">{item.name}</span>
                <div className="text-xs">
                  <span className={item.sufficient ? 'text-green-400' : 'text-red-400'}>
                    {item.inStock} {item.unit} in stock
                  </span>
                  <span className="text-gray-600 ml-2">/ {item.needed} {item.unit} needed</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── Render: Pantry ──
  const renderPantry = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pantry Inventory</h3>
        <button onClick={() => setShowAddPantry(!showAddPantry)} className="glow-btn px-4 py-2 text-xs">
          {showAddPantry ? 'Cancel' : '+ Add Item'}
        </button>
      </div>

      {showAddPantry && (
        <div className="glass p-5 space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-[9px] text-gray-600 uppercase tracking-wider block mb-1">Name</label>
              <input value={newPantryItem.name} onChange={(e) => setNewPantryItem({ ...newPantryItem, name: e.target.value })} className="w-full glass-input px-2 py-1.5 text-sm" placeholder="Chicken breast" />
            </div>
            <div>
              <label className="text-[9px] text-gray-600 uppercase tracking-wider block mb-1">Amount</label>
              <input type="number" value={newPantryItem.amount} onChange={(e) => setNewPantryItem({ ...newPantryItem, amount: e.target.value })} className="w-full glass-input px-2 py-1.5 text-sm" placeholder="0" />
            </div>
            <div>
              <label className="text-[9px] text-gray-600 uppercase tracking-wider block mb-1">Unit</label>
              <select value={newPantryItem.unit} onChange={(e) => setNewPantryItem({ ...newPantryItem, unit: e.target.value })} className="w-full glass-input px-2 py-1.5 text-sm bg-transparent">
                {['g', 'ml', 'oz', 'cups', 'tbsp', 'tsp', 'whole', 'lbs', 'kg'].map(u => <option key={u} value={u} className="bg-[#0E0E0E]">{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-gray-600 uppercase tracking-wider block mb-1">Category</label>
              <select value={newPantryItem.category} onChange={(e) => setNewPantryItem({ ...newPantryItem, category: e.target.value })} className="w-full glass-input px-2 py-1.5 text-sm bg-transparent">
                {['protein', 'grain', 'vegetable', 'fruit', 'dairy', 'oil', 'spice', 'other'].map(c => <option key={c} value={c} className="bg-[#0E0E0E]">{c}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleAddPantryItem} className="glow-btn px-4 py-2 text-sm">Add to Pantry</button>
        </div>
      )}

      {/* Pantry Items */}
      {pantry.length === 0 && !showAddPantry ? (
        <div className="glass p-8 text-center text-sm text-gray-600">Pantry is empty. Add items to track your ingredient stock.</div>
      ) : (
        <div className="glass overflow-hidden">
          <table className="glass-table w-full text-xs">
            <thead>
              <tr>
                <th className="text-left px-4 py-2.5">Item</th>
                <th className="text-left px-4 py-2.5">Category</th>
                <th className="text-right px-4 py-2.5">Amount</th>
                <th className="text-right px-4 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pantry.map(item => (
                <tr key={item.id}>
                  <td className="px-4 py-2.5 text-gray-300">{item.name}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-[9px] px-2 py-0.5 rounded bg-white/[0.04] text-gray-500 uppercase tracking-wider">{item.category}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <input
                      type="number" min="0"
                      value={item.amount}
                      onChange={(e) => {
                        const updated = pantry.map(p => p.id === item.id ? { ...p, amount: parseFloat(e.target.value) || 0 } : p);
                        savePantry(updated);
                      }}
                      className="w-20 glass-input px-2 py-1 text-xs text-right inline-block"
                    />
                    <span className="ml-1 text-gray-600">{item.unit}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => savePantry(pantry.filter(p => p.id !== item.id))} className="text-gray-600 hover:text-red-400 transition-colors">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Shopping List */}
      <div className="glass p-5">
        <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Shopping List</h3>
        {shoppingList.length === 0 ? (
          <div className="text-xs text-gray-600">No items needed. Cook a batch to auto-generate needs.</div>
        ) : (
          <div className="space-y-1.5">
            {shoppingList.map(item => (
              <div key={item.id} className={`flex items-center justify-between rounded px-3 py-2 border border-white/[0.04] ${item.checked ? 'opacity-40' : ''}`}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => saveShopping(shoppingList.map(s => s.id === item.id ? { ...s, checked: !s.checked } : s))}
                    className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] transition-colors ${item.checked ? 'bg-[#CCF472] border-[#CCF472] text-[#0E0E0E]' : 'border-white/[0.15] text-transparent'}`}
                  >
                    {item.checked ? '✓' : ''}
                  </button>
                  <div>
                    <div className={`text-xs ${item.checked ? 'line-through text-gray-600' : 'text-gray-300'}`}>
                      {item.name} — {item.amount} {item.unit}
                    </div>
                    <div className="text-[9px] text-gray-600">{item.reason}</div>
                  </div>
                </div>
                <button onClick={() => saveShopping(shoppingList.filter(s => s.id !== item.id))} className="text-[10px] text-gray-600 hover:text-red-400">x</button>
              </div>
            ))}
            {shoppingList.some(s => s.checked) && (
              <button onClick={() => saveShopping(shoppingList.filter(s => !s.checked))} className="text-[10px] text-gray-500 hover:text-white transition-colors mt-2">
                Clear checked items
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // ── Main Layout ──
  const tabs: { id: SubView; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'recipes', label: 'Recipes' },
    { id: 'pantry', label: 'Pantry & Shopping' },
  ];

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Tab Bar */}
      <div className="flex items-center gap-1 border-b border-white/[0.06] pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubView(tab.id)}
            className={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${
              subView === tab.id || (subView === 'recipe-detail' && tab.id === 'recipes')
                ? 'bg-[#CCF472]/10 text-[#CCF472] border-b-2 border-[#CCF472]'
                : 'text-gray-500 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {subView === 'overview' && renderOverview()}
      {subView === 'recipes' && renderRecipes()}
      {subView === 'recipe-detail' && renderRecipeDetail()}
      {subView === 'pantry' && renderPantry()}
    </main>
  );
}
