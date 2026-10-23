import { describe, expect, it } from "vitest";
import { mapOff, mapUsda } from "./foods";
describe("food lookup normalization", () => {
  it("maps real FDC nutrient IDs and checks units rather than array positions", () => {
    const food = mapUsda({
      fdcId: 175028,
      description: "Rolls, dinner, oat bran",
      foodNutrients: [
        { nutrientId: 1008, value: 236, unitName: "KCAL" },
        { nutrientId: 1004, value: 4.6, unitName: "G" },
        { nutrientId: 1003, value: 9.5, unitName: "G" },
        { nutrientId: 1079, value: 4.1, unitName: "G" },
      ],
    });
    expect(food).toMatchObject({
      calories: 236,
      protein: 9.5,
      fat: 4.6,
      fiber: 4.1,
      reference_amount: 100,
      missing: [],
    });
  });
  it("flags missing/invalid nutrients and never substitutes kJ as kcal", () => {
    expect(
      mapUsda({
        fdcId: 1,
        description: "Food",
        foodNutrients: [{ nutrientId: 1008, value: 300, unitName: "kJ" }],
      }),
    ).toMatchObject({
      calories: 0,
      fiber: 0,
      missing: ["calories", "protein", "fiber", "fat"],
    });
  });
  it("labels OFF results unverified and converts explicit kJ to kcal", () => {
    const result = mapOff({
      code: "123",
      product_name: "Drink",
      product_quantity_unit: "ml",
      nutriments: { "energy-kj_100g": 418.4, proteins_100g: 5, fat_100g: 0 },
    });
    expect(result.calories).toBeCloseTo(100);
    expect(result).toMatchObject({
      unverified: true,
      missing: ["fiber"],
      unit: "ml",
      reference_amount: 100,
    });
  });
});
