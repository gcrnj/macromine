import {
  macroKeys,
  units,
  type BuilderLine,
  type Ingredient,
  type Macros,
} from "./types";
export function text(value: unknown, label: string, max = 200): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new Error(`${label} must be between 1 and ${max} characters.`);
  return value.trim();
}
export function number(
  value: unknown,
  label: string,
  positive = false,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    (positive && value < 0.0001) ||
    value > 9999999
  )
    throw new Error(
      `${label} must be ${positive ? "positive" : "non-negative"} and below 10,000,000.`,
    );
  return value;
}
export function parseMacros(value: Macros): Macros {
  return Object.fromEntries(
    macroKeys.map((key) => [key, number(value[key], key)]),
  ) as Macros;
}
export function uuid(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value)
  )
    throw new Error("Invalid record identifier.");
  return value;
}
export function parseIngredient(input: Omit<Ingredient, "id">) {
  if (!units.includes(input.unit)) throw new Error("Choose a supported unit.");
  if (!["manual", "usda", "off"].includes(input.source))
    throw new Error("Invalid food source.");
  return {
    name: text(input.name, "Name"),
    brand: input.brand ? text(input.brand, "Brand") : null,
    reference_amount: number(input.reference_amount, "Reference amount", true),
    unit: input.unit,
    ...parseMacros(input),
    source: input.source,
    source_id: input.source_id ? text(input.source_id, "Source ID") : null,
  };
}
export function parseLines(input: BuilderLine[]): BuilderLine[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 100)
    throw new Error("Add between 1 and 100 lines.");
  return input.map((line) => {
    const base = {
      id: uuid(line.id),
      amount: number(line.amount, "Amount", true),
    };
    if (line.kind === "ingredient")
      return {
        ...base,
        kind: "ingredient",
        ingredient_id: uuid(line.ingredient_id),
      };
    if (line.kind === "meal")
      return { ...base, kind: "meal", child_meal_id: uuid(line.child_meal_id) };
    if (line.kind !== "direct" || !units.includes(line.unit))
      throw new Error("Invalid line.");
    return {
      ...base,
      kind: "direct",
      label: text(line.label, "Label"),
      unit: line.unit,
      reference_amount: number(line.reference_amount, "Reference amount", true),
      ...parseMacros(line),
    };
  });
}
export function date(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    throw new Error("Choose a valid date.");
  return value;
}
