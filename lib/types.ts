export const macroKeys = ["calories", "protein", "fiber", "fat"] as const;
export type MacroKey = (typeof macroKeys)[number];
export type Macros = Record<MacroKey, number>;
export const units = ["g", "ml", "pc", "tbsp", "tsp"] as const;
export type Unit = (typeof units)[number];
export type Ingredient = Macros & {
  id: string;
  name: string;
  brand: string | null;
  reference_amount: number;
  unit: Unit;
  source: "manual" | "usda" | "off";
  source_id: string | null;
};
export type IngredientLine = {
  id: string;
  kind: "ingredient";
  ingredient_id: string;
  amount: number;
};
export type MealLine = {
  id: string;
  kind: "meal";
  child_meal_id: string;
  amount: number;
};
export type DirectLine = Macros & {
  id: string;
  kind: "direct";
  label: string;
  amount: number;
  reference_amount: number;
  unit: Unit;
};
export type BuilderLine = IngredientLine | MealLine | DirectLine;
export type Meal = { id: string; name: string; components: BuilderLine[] };
export type Snapshot = Macros & { label: string; amount: number; unit: Unit };
export type LogEntry = {
  id: string;
  name: string;
  log_date: string;
  created_at: string;
  lines: Snapshot[];
};
export type TrackerData = {
  ingredients: Ingredient[];
  meals: Meal[];
  entries: LogEntry[];
  targets: Macros | null;
};
export type FoodResult = Omit<Ingredient, "id"> & {
  missing: MacroKey[];
  unverified: boolean;
};
export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string };
