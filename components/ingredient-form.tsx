"use client";
import { clientAction } from "@/lib/client-action";
import { useState, type FormEvent } from "react";
import { Search, ArrowDownToLine } from "lucide-react";
import { saveIngredient } from "@/app/actions";
import { zeroMacros } from "@/lib/macros";
import { units, type FoodResult, type Ingredient } from "@/lib/types";
import { MacroInputs, MacroValues, Sheet } from "./ui";
export function IngredientForm({
  ingredient,
  onClose,
  onSaved,
}: {
  ingredient: Ingredient | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState<Omit<Ingredient, "id">>(
    ingredient ?? {
      name: "",
      brand: "",
      reference_amount: 100,
      unit: "g",
      ...zeroMacros(),
      source: "manual",
      source_id: null,
    },
  );
  const [lookup, setLookup] = useState(false);
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("usda");
  const [branded, setBranded] = useState(false);
  const [results, setResults] = useState<FoodResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [warning, setWarning] = useState("");
  const [saving, setSaving] = useState(false);
  async function search(e: FormEvent) {
    e.preventDefault();
    setSearching(true);
    setLookupError("");
    setResults([]);
    setSearched(false);
    try {
      const response = await fetch(
        `/api/foods/${provider}?q=${encodeURIComponent(query)}&branded=${branded}`,
        { signal: AbortSignal.timeout(18000) },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || "Food lookup is unavailable. Enter macros manually.",
        );
      setResults(data.results);
      setSearched(true);
    } catch (error) {
      setLookupError(
        error instanceof Error
          ? error.message
          : "Could not search. Enter macros manually.",
      );
    } finally {
      setSearching(false);
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const result = await clientAction(() =>
      saveIngredient(ingredient?.id ?? null, value),
    );
    setSaving(false);
    if (!result.ok) setError(result.error);
    else onSaved();
  }
  return (
    <Sheet
      title={ingredient ? "Edit ingredient" : "New ingredient"}
      onClose={onClose}
    >
      <div className="sheet-content">
        <button
          type="button"
          className="button secondary full"
          onClick={() => setLookup(!lookup)}
        >
          <Search size={18} />
          {lookup ? "Hide food lookup" : "Look up a food"}
        </button>
        {lookup && (
          <section className="lookup-panel">
            <form onSubmit={search} className="stack">
              <label>
                Food database
                <select
                  value={provider}
                  onChange={(e) => {
                    setProvider(e.target.value);
                    setResults([]);
                    setSearched(false);
                  }}
                >
                  <option value="usda">USDA FoodData Central</option>
                  <option value="off">Open Food Facts · unverified</option>
                </select>
              </label>
              <label>
                Search foods
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. rolled oats"
                  minLength={2}
                  maxLength={100}
                  required
                />
              </label>
              {provider === "usda" && (
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={branded}
                    onChange={(e) => setBranded(e.target.checked)}
                  />{" "}
                  Include branded foods
                </label>
              )}
              <button className="button secondary" disabled={searching}>
                {searching ? "Searching…" : "Search"}
              </button>
            </form>
            <p className="hint">
              Search on submit. Results prefill a 100 g or 100 ml reference;
              review every value.
            </p>
            {lookupError && (
              <p className="error" role="alert">
                {lookupError} Manual entry is always available below.
              </p>
            )}
            {searched && results.length === 0 && (
              <p className="quiet">
                No foods found. Try another search or enter manually.
              </p>
            )}
            <div className="lookup-results">
              {results.map((result) => (
                <button
                  type="button"
                  className="lookup-result"
                  key={result.source_id}
                  onClick={() => {
                    const { missing, unverified, ...prefill } = result;
                    setValue(prefill);
                    setWarning(
                      [
                        unverified ? "Open Food Facts data is unverified." : "",
                        missing.length
                          ? `Missing ${missing.join(", ")}: prefilled as 0. Review before saving.`
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" "),
                    );
                    setLookup(false);
                  }}
                >
                  <span>
                    <strong>{result.name}</strong>
                    <small>
                      {result.brand ||
                        (provider === "off"
                          ? "Unverified · Open Food Facts"
                          : "USDA")}{" "}
                      · {result.calories.toFixed(0)} kcal /{" "}
                      {result.reference_amount} {result.unit}
                      {result.missing.length ? " · Missing nutrients" : ""}
                    </small>
                  </span>
                  <ArrowDownToLine size={18} />
                </button>
              ))}
            </div>
          </section>
        )}
        <form
          id="ingredient-form"
          onSubmit={save}
          className="stack ingredient-fields"
        >
          {warning && (
            <p className="notice" role="status">
              {warning}
            </p>
          )}
          <label>
            Ingredient name
            <input
              value={value.name}
              onChange={(e) => setValue({ ...value, name: e.target.value })}
              maxLength={200}
              placeholder="e.g. Rolled oats"
              required
            />
          </label>
          <label>
            Brand <span className="quiet">optional</span>
            <input
              value={value.brand ?? ""}
              onChange={(e) => setValue({ ...value, brand: e.target.value })}
              maxLength={200}
              placeholder="e.g. Quaker"
            />
          </label>
          <div className="two-fields">
            <label>
              Reference amount
              <input
                type="number"
                inputMode="decimal"
                min="0.0001"
                max="9999999"
                step="any"
                value={
                  Number.isNaN(value.reference_amount)
                    ? ""
                    : value.reference_amount
                }
                onChange={(e) =>
                  setValue({
                    ...value,
                    reference_amount:
                      e.target.value === "" ? NaN : Number(e.target.value),
                  })
                }
                required
              />
            </label>
            <label>
              Unit
              <select
                value={value.unit}
                onChange={(e) =>
                  setValue({
                    ...value,
                    unit: e.target.value as Ingredient["unit"],
                  })
                }
              >
                {units.map((unit) => (
                  <option key={unit}>{unit}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="hint">
            Enter macros for this reference amount. It becomes the default
            portion when you pick this ingredient.
          </p>
          <MacroInputs
            values={value}
            onChange={(macros) => setValue({ ...value, ...macros })}
          />
          <MacroValues values={value} />
          {value.source !== "manual" && (
            <p className="hint">
              Prefilled from{" "}
              {value.source === "off"
                ? "Open Food Facts (unverified)"
                : "USDA FoodData Central"}
              . Every field is editable.
            </p>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>
      </div>
      <div className="sheet-footer">
        <button
          form="ingredient-form"
          className="button primary full"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save ingredient"}
        </button>
      </div>
    </Sheet>
  );
}
