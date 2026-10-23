import { describe, it, expect } from "vitest";
import { date, parseLines, parseIngredient } from "./validation";
describe("server input validation", () => {
  it("rejects impossible and invalid dates", () => {
    expect(date("2026-10-23")).toBe("2026-10-23");
    for (const value of ["2026-02-30", "wrong", "2026-1-1"])
      expect(() => date(value)).toThrow();
  });
  it("rejects empty and invalid components", () => {
    expect(() => parseLines([])).toThrow();
    expect(() =>
      parseLines([
        {
          id: "11111111-1111-4111-8111-111111111111",
          kind: "ingredient",
          ingredient_id: "22222222-2222-4222-8222-222222222222",
          amount: -1,
        },
      ]),
    ).toThrow();
  });
  it("rejects nonfinite manual nutrients", () => {
    expect(() =>
      parseIngredient({
        name: "Oats",
        brand: null,
        unit: "g",
        reference_amount: 40,
        calories: Infinity,
        protein: 1,
        fiber: 1,
        fat: 1,
        source: "manual",
        source_id: null,
      }),
    ).toThrow();
  });
});
