// ── Nutrition & Meal-Prep Module Types ──────────────────────────────────────

export interface Macros {
  calories: number;
  protein: number;   // grams
  carbs: number;     // grams
  fat: number;       // grams
}

export interface Micros {
  potassium: number;   // mg
  calcium: number;     // mg
  iron: number;        // mg
  vitaminD: number;    // mcg
  sodium: number;      // mg
}

export const EMPTY_MICROS: Micros = { potassium: 0, calcium: 0, iron: 0, vitaminD: 0, sodium: 0 };

export const DEFAULT_MICRO_GOALS: Micros = {
  potassium: 4700,   // mg
  calcium: 1000,     // mg
  iron: 18,          // mg
  vitaminD: 20,      // mcg
  sodium: 2300,      // mg
};

export interface Ingredient {
  id: string;
  name: string;
  amount: number;      // raw weight in grams
  unit: string;        // 'g', 'ml', 'oz', 'cups', etc.
  macros: Macros;      // macros for the specified amount
  micros?: Micros;     // optional micronutrients for the specified amount
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
  microsPerPortion?: Micros;
}

export interface MealPrepInventory {
  items: MealPrepItem[];
}

export interface ConsumedMeal {
  id: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  macros: Macros;
  micros?: Micros;
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
  source: 'recipe' | 'manual';   // auto-generated from cook batch or manually added
}

export interface BuyHistoryItem {
  id: string;
  name: string;
  amount: number;
  unit: string;
  reason: string;
  purchasedAt: string;    // ISO timestamp
  addedToPantry: boolean; // whether pantry was incremented
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

// ── Micronutrient helpers ──

export function recipeTotalMicros(recipe: Recipe): Micros {
  return recipe.ingredients.reduce(
    (acc, ing) => {
      const m = ing.micros || EMPTY_MICROS;
      return {
        potassium: acc.potassium + m.potassium,
        calcium: acc.calcium + m.calcium,
        iron: acc.iron + m.iron,
        vitaminD: acc.vitaminD + m.vitaminD,
        sodium: acc.sodium + m.sodium,
      };
    },
    { ...EMPTY_MICROS },
  );
}

export function recipePerPortionMicros(recipe: Recipe): Micros {
  const total = recipeTotalMicros(recipe);
  const s = recipe.batchSize || 1;
  return {
    potassium: Math.round(total.potassium / s),
    calcium: Math.round(total.calcium / s),
    iron: Math.round((total.iron / s) * 10) / 10,
    vitaminD: Math.round((total.vitaminD / s) * 10) / 10,
    sodium: Math.round(total.sodium / s),
  };
}

/** Sum micronutrients from consumed meals for the day */
export function dailyTotalMicros(meals: ConsumedMeal[]): Micros {
  return meals.reduce(
    (acc, meal) => {
      const m = meal.micros || EMPTY_MICROS;
      return {
        potassium: acc.potassium + m.potassium,
        calcium: acc.calcium + m.calcium,
        iron: acc.iron + m.iron,
        vitaminD: acc.vitaminD + m.vitaminD,
        sodium: acc.sodium + m.sodium,
      };
    },
    { ...EMPTY_MICROS },
  );
}

/** Calculate micronutrients for a set of ingredients scaled by portions */
export function calculateMicros(ingredients: Ingredient[], portions: number): Micros {
  const total = ingredients.reduce(
    (acc, ing) => {
      const m = ing.micros || EMPTY_MICROS;
      return {
        potassium: acc.potassium + m.potassium,
        calcium: acc.calcium + m.calcium,
        iron: acc.iron + m.iron,
        vitaminD: acc.vitaminD + m.vitaminD,
        sodium: acc.sodium + m.sodium,
      };
    },
    { ...EMPTY_MICROS },
  );
  const s = portions || 1;
  return {
    potassium: Math.round(total.potassium / s),
    calcium: Math.round(total.calcium / s),
    iron: Math.round((total.iron / s) * 10) / 10,
    vitaminD: Math.round((total.vitaminD / s) * 10) / 10,
    sodium: Math.round(total.sodium / s),
  };
}
