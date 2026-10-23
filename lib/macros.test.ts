import { describe, expect, it } from "vitest";
import {
  editableMealLines,
  expandLines,
  scaleMacros,
  sumMacros,
} from "./macros";
import type { Ingredient, Meal } from "./types";
const oats: Ingredient = {
  id: "oats",
  name: "Oats",
  brand: "Quaker",
  reference_amount: 40,
  unit: "g",
  calories: 150,
  protein: 5,
  fiber: 4,
  fat: 3,
  source: "manual",
  source_id: null,
};
describe("scaleMacros", () => {
  it("scales every tracked macro from its reference amount", () => {
    expect(scaleMacros(oats, 60, 40)).toEqual({
      calories: 225,
      protein: 7.5,
      fiber: 6,
      fat: 4.5,
    });
  });
  it("keeps fractional precision and supports zero portions", () => {
    expect(scaleMacros(oats, 1, 40).protein).toBe(0.125);
    expect(scaleMacros(oats, 0, 40)).toEqual({
      calories: 0,
      protein: 0,
      fiber: 0,
      fat: 0,
    });
  });
  it.each([0, -1, NaN, Infinity])("rejects invalid references %s", (ref) =>
    expect(() => scaleMacros(oats, 1, ref)).toThrow(),
  );
  it.each([-1, NaN, Infinity])("rejects invalid amounts %s", (amount) =>
    expect(() => scaleMacros(oats, amount, 40)).toThrow(),
  );
  it("rejects invalid nutrients", () =>
    expect(() => scaleMacros({ ...oats, fat: -1 }, 1, 40)).toThrow());
});
describe("meal snapshots", () => {
  const child: Meal = {
    id: "child",
    name: "Oats",
    components: [
      { id: "c", kind: "ingredient", ingredient_id: "oats", amount: 40 },
    ],
  };
  const parent: Meal = {
    id: "parent",
    name: "Double oats",
    components: [{ id: "p", kind: "meal", child_meal_id: "child", amount: 2 }],
  };
  it("scales nested meals and direct macros using the same rule", () => {
    const result = expandLines(
      parent.components,
      [oats],
      [child, parent],
      [parent.id],
    );
    expect(sumMacros(result).calories).toBe(300);
    expect(result[0].amount).toBe(80);
    expect(editableMealLines(parent, [child, parent])[0].amount).toBe(80);
  });
  it("does not mutate historical snapshots or ingredients", () => {
    const result = expandLines(child.components, [oats], [child]);
    expect(
      expandLines(child.components, [{ ...oats, calories: 10 }], [child])[0]
        .calories,
    ).toBe(10);
    expect(result[0].calories).toBe(150);
    expect(oats.calories).toBe(150);
  });
  it("rejects cycles, excess depth, and missing references", () => {
    const cycle: Meal = {
      ...child,
      components: [
        { id: "cycle", kind: "meal", child_meal_id: "parent", amount: 1 },
      ],
    };
    expect(() =>
      expandLines(parent.components, [oats], [cycle, parent], [parent.id]),
    ).toThrow();
    expect(() => expandLines(child.components, [], [child])).toThrow();
  });
});
