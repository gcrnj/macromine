import {
  macroKeys,
  type BuilderLine,
  type Ingredient,
  type Macros,
  type Meal,
  type Snapshot,
} from "./types";

export const zeroMacros = (): Macros => ({
  calories: 0,
  protein: 0,
  fiber: 0,
  fat: 0,
});

/** The only scaling rule. Never round until display or numeric persistence. */
export function scaleMacros(
  macros: Macros,
  amount: number,
  referenceAmount: number,
): Macros {
  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    !Number.isFinite(referenceAmount) ||
    referenceAmount <= 0
  ) {
    throw new Error(
      "Amount must be non-negative and reference amount must be positive.",
    );
  }
  const result = zeroMacros();
  for (const key of macroKeys) {
    if (!Number.isFinite(macros[key]) || macros[key] < 0)
      throw new Error("Macros must be finite and non-negative.");
    result[key] = macros[key] * (amount / referenceAmount);
    if (!Number.isFinite(result[key])) throw new Error("Amount is too large.");
  }
  return result;
}

export function sumMacros(values: Macros[]): Macros {
  return values.reduce((total, value) => {
    for (const key of macroKeys) total[key] += value[key];
    return total;
  }, zeroMacros());
}

export function expandLines(
  lines: BuilderLine[],
  ingredients: Ingredient[],
  meals: Meal[],
  path: string[] = [],
): Snapshot[] {
  return lines.flatMap((line): Snapshot[] => {
    if (line.kind === "ingredient") {
      const ingredient = ingredients.find(
        (item) => item.id === line.ingredient_id,
      );
      if (!ingredient)
        throw new Error("An ingredient is missing. Reload and try again.");
      return [
        {
          label: [ingredient.name, ingredient.brand]
            .filter(Boolean)
            .join(" · "),
          amount: line.amount,
          unit: ingredient.unit,
          ...scaleMacros(ingredient, line.amount, ingredient.reference_amount),
        },
      ];
    }
    if (line.kind === "direct")
      return [
        {
          label: line.label,
          amount: line.amount,
          unit: line.unit,
          ...scaleMacros(line, line.amount, line.reference_amount),
        },
      ];
    const meal = meals.find((item) => item.id === line.child_meal_id);
    if (!meal)
      throw new Error("A saved meal is missing. Reload and try again.");
    if (path.includes(meal.id) || path.length >= 2)
      throw new Error("Meals can nest only one level, without cycles.");
    return expandLines(meal.components, ingredients, meals, [
      ...path,
      meal.id,
    ]).map((snapshot) => ({
      ...snapshot,
      amount: snapshot.amount * line.amount,
      ...scaleMacros(snapshot, line.amount, 1),
    }));
  });
}

/** Flatten a chosen template into independently editable lines for this log. */
export function editableMealLines(
  meal: Meal,
  meals: Meal[],
  path: string[] = [],
): BuilderLine[] {
  if (path.includes(meal.id) || path.length > 1)
    throw new Error("Meals can nest only one level, without cycles.");
  return meal.components.flatMap((line): BuilderLine[] => {
    if (line.kind !== "meal") return [{ ...line, id: crypto.randomUUID() }];
    const child = meals.find((item) => item.id === line.child_meal_id);
    if (!child) throw new Error("Saved meal not found.");
    return editableMealLines(child, meals, [...path, meal.id]).map((item) => ({
      ...item,
      amount: item.amount * line.amount,
    }));
  });
}

export const formatMacro = (key: keyof Macros, value: number) =>
  !Number.isFinite(value)
    ? "—"
    : key === "calories"
      ? Math.round(value).toLocaleString("en-US")
      : value.toLocaleString("en-US", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });
