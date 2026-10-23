import { macroKeys, type FoodResult, type MacroKey } from "./types";
const nutrientIds: Record<MacroKey, number> = {
  calories: 1008,
  protein: 1003,
  fat: 1004,
  fiber: 1079,
};
export type UsdaFood = {
  fdcId: number;
  description: string;
  brandOwner?: string;
  brandName?: string;
  foodNutrients?: { nutrientId: number; value?: number; unitName?: string }[];
};
export type OffFood = {
  code: string;
  product_name?: string;
  brands?: string;
  nutrition_data_per?: string;
  product_quantity_unit?: string;
  nutriments?: Record<string, number | string | undefined>;
};
function nutrient(value: unknown): number | null {
  if (value === "" || value === undefined || value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
export function mapUsda(food: UsdaFood): FoodResult {
  const missing: MacroKey[] = [];
  const macros = Object.fromEntries(
    macroKeys.map((key) => {
      const item = food.foodNutrients?.find(
        (n) => n.nutrientId === nutrientIds[key],
      );
      const value = nutrient(item?.value);
      const expected = key === "calories" ? "KCAL" : "G";
      if (value === null || item?.unitName?.toUpperCase() !== expected) {
        missing.push(key);
        return [key, 0];
      }
      return [key, value];
    }),
  ) as Pick<FoodResult, MacroKey>;
  return {
    name: food.description,
    brand: food.brandName || food.brandOwner || null,
    reference_amount: 100,
    unit: "g",
    ...macros,
    source: "usda",
    source_id: String(food.fdcId),
    missing,
    unverified: false,
  };
}
export function mapOff(food: OffFood): FoodResult {
  const missing: MacroKey[] = [];
  const ids = {
    calories: "energy-kcal_100g",
    protein: "proteins_100g",
    fat: "fat_100g",
    fiber: "fiber_100g",
  };
  const macros = Object.fromEntries(
    macroKeys.map((key) => {
      let value = nutrient(food.nutriments?.[ids[key]]);
      if (key === "calories" && value === null) {
        const kj = nutrient(food.nutriments?.["energy-kj_100g"]);
        if (kj !== null) value = kj / 4.184;
      }
      if (value === null) missing.push(key);
      return [key, value ?? 0];
    }),
  ) as Pick<FoodResult, MacroKey>;
  const liquid =
    food.product_quantity_unit === "ml" || food.product_quantity_unit === "l";
  return {
    name: food.product_name ?? "Unnamed product",
    brand: food.brands || null,
    reference_amount: 100,
    unit: liquid ? "ml" : "g",
    ...macros,
    source: "off",
    source_id: food.code,
    missing,
    unverified: true,
  };
}
