// ── Nutrition & Meal-Prep Module Types ──────────────────────────────────────

export interface Macros {
  calories: number;
  protein: number;   // grams
  carbs: number;     // grams
  fat: number;       // grams
}

export interface Ingredient {
  id: string;
  name: string;
  amount: number;      // raw weight in grams
  unit: string;        // 'g', 'ml', 'oz', 'cups', etc.
  macros: Macros;      // macros for the specified amount
}

export interface Recipe {
  id: string;
  name: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  ingredients: Ingredient[];
  batchSize: number;     // how many portions this recipe makes
  createdAt: string;
}

export interface MealPrepItem {
  recipeId: string;
  recipeName: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  count: number;          // remaining portions
  macrosPerPortion: Macros;
}

export interface MealPrepInventory {
  items: MealPrepItem[];
}

export interface ConsumedMeal {
  id: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  macros: Macros;
  source: 'prep' | 'manual';   // from meal-prep or manual entry
  timestamp: string;
}

export interface DailyLog {
  date: string;           // ISO date "2026-03-20"
  meals: ConsumedMeal[];
  calorieGoal: number;
  macroGoals: Macros;
}

export interface PantryItem {
  id: string;
  name: string;
  amount: number;
  unit: string;
  category: string;       // 'protein', 'grain', 'vegetable', 'dairy', 'other'
}

export interface ShoppingItem {
  id: string;
  name: string;
  amount: number;
  unit: string;
  reason: string;         // e.g., "Needed for Chicken & Rice (deficit: 500g)"
  checked: boolean;
}

// ── Helper: compute total macros for a recipe ──
export function recipeTotalMacros(recipe: Recipe): Macros {
  return recipe.ingredients.reduce(
    (acc, ing) => ({
      calories: acc.calories + ing.macros.calories,
      protein: acc.protein + ing.macros.protein,
      carbs: acc.carbs + ing.macros.carbs,
      fat: acc.fat + ing.macros.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function recipePerPortionMacros(recipe: Recipe): Macros {
  const total = recipeTotalMacros(recipe);
  const s = recipe.batchSize || 1;
  return {
    calories: Math.round(total.calories / s),
    protein: Math.round((total.protein / s) * 10) / 10,
    carbs: Math.round((total.carbs / s) * 10) / 10,
    fat: Math.round((total.fat / s) * 10) / 10,
  };
}

export function dailyTotalMacros(meals: ConsumedMeal[]): Macros {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.macros.calories,
      protein: acc.protein + m.macros.protein,
      carbs: acc.carbs + m.macros.carbs,
      fat: acc.fat + m.macros.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
