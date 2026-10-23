"use client";
import { clientAction } from "@/lib/client-action";
import { useState } from "react";
import { Plus, Search, Trash2, Utensils } from "lucide-react";
import { saveLog, saveMeal } from "@/app/actions";
import {
  editableMealLines,
  expandLines,
  sumMacros,
  zeroMacros,
} from "@/lib/macros";
import type {
  BuilderLine,
  DirectLine,
  Ingredient,
  LogEntry,
  Meal,
} from "@/lib/types";
import { MacroInputs, MacroValues, Sheet, Empty } from "./ui";

type Props = {
  mode: "meal" | "log";
  ingredients: Ingredient[];
  meals: Meal[];
  date: string;
  meal?: Meal;
  entry?: LogEntry;
  onClose: () => void;
  onSaved: () => void;
  onOptimistic?: (entry: LogEntry) => void;
  onRollback?: () => void;
};
export function Builder(props: Props) {
  const { mode, ingredients, meals, date, meal, entry, onClose, onSaved } =
    props;
  const [name, setName] = useState(meal?.name ?? entry?.name ?? "");
  const [lines, setLines] = useState<BuilderLine[]>(
    () =>
      meal?.components ??
      entry?.lines.map((line) => ({
        ...line,
        id: crypto.randomUUID(),
        kind: "direct" as const,
        reference_amount: line.amount,
      })) ??
      [],
  );
  const [tab, setTab] = useState<
    "Saved meal" | "Direct macros" | "Ingredients"
  >("Saved meal");
  const [query, setQuery] = useState("");
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [saveMode, setSaveMode] = useState<"log" | "update" | "new">("log");
  const [mealName, setMealName] = useState("");
  const [direct, setDirect] = useState({ label: "", ...zeroMacros() });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  let calculationError = "";
  let totals = zeroMacros();
  try {
    totals = sumMacros(
      expandLines(
        lines,
        ingredients,
        meals,
        mode === "meal" ? [meal?.id ?? "new"] : [],
      ),
    );
  } catch (e) {
    calculationError = e instanceof Error ? e.message : "Invalid amounts.";
  }
  const invalid =
    lines.length === 0 ||
    lines.some((line) => !Number.isFinite(line.amount) || line.amount <= 0) ||
    Boolean(calculationError);
  function add(line: BuilderLine) {
    setLines((current) => [...current, line]);
    setError("");
  }
  function chooseMeal(chosen: Meal) {
    if (mode === "meal")
      add({
        id: crypto.randomUUID(),
        kind: "meal",
        child_meal_id: chosen.id,
        amount: 1,
      });
    else {
      try {
        setLines((current) => [
          ...current,
          ...editableMealLines(chosen, meals),
        ]);
        if (!sourceId) {
          setSourceId(chosen.id);
          setMealName(chosen.name);
        }
        if (!name) setName(chosen.name);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Could not add meal.",
        );
      }
    }
  }
  async function save() {
    if (invalid || !name.trim()) {
      setError("Name your entry and add positive amounts.");
      return;
    }
    setSaving(true);
    setError("");
    if (mode === "meal") {
      const result = await clientAction(() =>
        saveMeal(meal?.id ?? null, name, lines),
      );
      setSaving(false);
      if (!result.ok) setError(result.error);
      else onSaved();
      return;
    }
    const optimistic: LogEntry = {
      id: entry?.id ?? "pending",
      name,
      log_date: date,
      created_at: entry?.created_at ?? new Date().toISOString(),
      lines: expandLines(lines, ingredients, meals),
    };
    props.onOptimistic?.(optimistic);
    const result = await clientAction(() =>
      saveLog({
        id: entry?.id ?? null,
        date,
        name,
        lines,
        mode: saveMode,
        mealId: sourceId,
        mealName,
      }),
    );
    setSaving(false);
    if (!result.ok) {
      props.onRollback?.();
      setError(result.error);
    } else onSaved();
  }
  const availableMeals = meals.filter(
    (item) =>
      item.id !== meal?.id &&
      (mode === "log" || !item.components.some((c) => c.kind === "meal")) &&
      item.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Sheet
      title={
        mode === "meal"
          ? meal
            ? "Edit saved meal"
            : "New saved meal"
          : entry
            ? "Edit food entry"
            : "Log food"
      }
      onClose={() => {
        if (!saving) onClose();
      }}
      wide
    >
      <div className="sheet-content builder-content">
        <label>
          {mode === "meal" ? "Meal name" : "Entry name"}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            placeholder={
              mode === "meal" ? "e.g. Morning oats" : "e.g. Breakfast"
            }
            required
          />
        </label>
        <div className="segmented" role="tablist" aria-label="Add food source">
          {(["Saved meal", "Direct macros", "Ingredients"] as const).map(
            (item) => (
              <button
                type="button"
                key={item}
                id={`tab-${item.replace(" ", "-")}`}
                role="tab"
                aria-selected={tab === item}
                aria-controls="food-source-panel"
                tabIndex={tab === item ? 0 : -1}
                onKeyDown={(e) => {
                  const tabs = [
                    "Saved meal",
                    "Direct macros",
                    "Ingredients",
                  ] as const;
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    const next =
                      tabs[
                        (tabs.indexOf(tab) + (e.key === "ArrowRight" ? 1 : 2)) %
                          3
                      ];
                    setTab(next);
                    document
                      .getElementById(`tab-${next.replace(" ", "-")}`)
                      ?.focus();
                  }
                }}
                onClick={() => {
                  setTab(item);
                  setQuery("");
                }}
              >
                {item}
              </button>
            ),
          )}
        </div>
        <section
          className="source-panel"
          role="tabpanel"
          id="food-source-panel"
          aria-labelledby={`tab-${tab.replace(" ", "-")}`}
        >
          {tab !== "Direct macros" && (
            <label className="search-field">
              <Search size={18} />
              <input
                aria-label={`Search ${tab.toLowerCase()}`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${tab === "Saved meal" ? "saved meals" : "your ingredients"}…`}
              />
            </label>
          )}
          {tab === "Saved meal" && (
            <div className="picker-list">
              {availableMeals.length === 0 ? (
                <p className="hint">
                  {meals.length === 0
                    ? "No saved meals yet. Add ingredients or direct macros below."
                    : "No matching meals available. Nested meals cannot be nested again."}
                </p>
              ) : (
                availableMeals.map((item) => (
                  <button
                    type="button"
                    className="picker-row"
                    key={item.id}
                    onClick={() => chooseMeal(item)}
                  >
                    <span>
                      <strong>{item.name}</strong>
                      <small>
                        {item.components.length} components ·{" "}
                        {mode === "log" ? "Adds editable lines" : "1 serving"}
                      </small>
                    </span>
                    <Plus size={18} />
                  </button>
                ))
              )}
            </div>
          )}
          {tab === "Ingredients" && (
            <div className="picker-list">
              {ingredients
                .filter((item) =>
                  `${item.name} ${item.brand ?? ""}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((item) => (
                  <button
                    type="button"
                    className="picker-row"
                    key={item.id}
                    onClick={() =>
                      add({
                        id: crypto.randomUUID(),
                        kind: "ingredient",
                        ingredient_id: item.id,
                        amount: item.reference_amount,
                      })
                    }
                  >
                    <span>
                      <strong>{item.name}</strong>
                      <small>
                        {item.brand ? `${item.brand} · ` : ""}
                        {item.reference_amount} {item.unit} ·{" "}
                        {Math.round(item.calories)} kcal
                      </small>
                    </span>
                    <Plus size={18} />
                  </button>
                ))}
              {ingredients.length === 0 && (
                <p className="hint">
                  No ingredients yet. Add one on the Ingredients page, or use
                  direct macros.
                </p>
              )}
            </div>
          )}
          {tab === "Direct macros" && (
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                add({
                  ...direct,
                  id: crypto.randomUUID(),
                  kind: "direct",
                  amount: 1,
                  reference_amount: 1,
                  unit: "pc",
                });
                setDirect({ label: "", ...zeroMacros() });
              }}
            >
              <label>
                Label
                <input
                  value={direct.label}
                  onChange={(e) =>
                    setDirect({ ...direct, label: e.target.value })
                  }
                  placeholder="e.g. Café lunch"
                  required
                  maxLength={200}
                />
              </label>
              <MacroInputs
                values={direct}
                onChange={(value) => setDirect({ ...direct, ...value })}
              />
              <button className="button secondary">
                <Plus size={18} />
                Add direct macros
              </button>
            </form>
          )}
        </section>
        <div className="section-caption">
          <h3>{mode === "meal" ? "Meal components" : "This entry"}</h3>
          <span className="quiet">
            {lines.length} {lines.length === 1 ? "line" : "lines"}
          </span>
        </div>
        <div className="builder-lines">
          {lines.length === 0 && (
            <Empty>
              <Utensils size={20} />
              <p>Choose a saved meal, add an ingredient, or enter macros.</p>
            </Empty>
          )}
          {lines.map((line) => {
            const ingredient =
              line.kind === "ingredient"
                ? ingredients.find((item) => item.id === line.ingredient_id)
                : null;
            const child =
              line.kind === "meal"
                ? meals.find((item) => item.id === line.child_meal_id)
                : null;
            const label =
              ingredient?.name ?? child?.name ?? (line as DirectLine).label;
            const unit =
              ingredient?.unit ??
              (line.kind === "meal" ? "servings" : (line as DirectLine).unit);
            let values = zeroMacros();
            try {
              values = sumMacros(expandLines([line], ingredients, meals));
            } catch {
              /* Form validation explains invalid values. */
            }
            return (
              <div className="builder-line" key={line.id}>
                <div className="line-top">
                  <div className="line-title">
                    <strong>{label}</strong>
                    <small>
                      {ingredient?.brand ||
                        (line.kind === "direct"
                          ? "Direct macros"
                          : line.kind === "meal"
                            ? "Saved meal"
                            : "Ingredient")}
                    </small>
                  </div>
                  <label className="amount-field">
                    <input
                      aria-label={`Amount for ${label}`}
                      type="number"
                      inputMode="decimal"
                      min="0.0001"
                      step="any"
                      value={Number.isNaN(line.amount) ? "" : line.amount}
                      onChange={(e) =>
                        setLines(
                          lines.map((item) =>
                            item.id === line.id
                              ? {
                                  ...item,
                                  amount:
                                    e.target.value === ""
                                      ? NaN
                                      : Number(e.target.value),
                                }
                              : item,
                          ),
                        )
                      }
                    />
                    <span>{unit}</span>
                  </label>
                  <button
                    type="button"
                    className="icon-button danger"
                    aria-label={`Remove ${label}`}
                    onClick={() =>
                      setLines(lines.filter((item) => item.id !== line.id))
                    }
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                {line.kind === "direct" && (
                  <details className="direct-edit">
                    <summary>Edit label and macros</summary>
                    <label>
                      Label
                      <input
                        value={line.label}
                        maxLength={200}
                        onChange={(e) =>
                          setLines(
                            lines.map((item) =>
                              item.id === line.id
                                ? { ...line, label: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <p className="hint">
                      Macros per {line.reference_amount} {line.unit}
                    </p>
                    <MacroInputs
                      values={line}
                      onChange={(values) =>
                        setLines(
                          lines.map((item) =>
                            item.id === line.id ? { ...line, ...values } : item,
                          ),
                        )
                      }
                    />
                  </details>
                )}
                <MacroValues values={values} />
              </div>
            );
          })}
        </div>
        {mode === "log" && lines.length > 0 && (
          <div className="save-options">
            <label>
              Save action
              <select
                value={saveMode}
                onChange={(e) => setSaveMode(e.target.value as typeof saveMode)}
              >
                <option value="log">Log only</option>
                <option value="update" disabled={!sourceId}>
                  Log and update saved meal
                </option>
                <option value="new">Save as new meal and log</option>
              </select>
            </label>
            {saveMode === "update" && (
              <label>
                Saved meal to update
                <select
                  value={sourceId ?? ""}
                  onChange={(e) => {
                    setSourceId(e.target.value);
                    setMealName(
                      meals.find((m) => m.id === e.target.value)?.name ?? "",
                    );
                  }}
                >
                  {meals.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <span className="hint">
                  The full list above will replace this saved meal.
                </span>
              </label>
            )}
            {saveMode !== "log" && (
              <label>
                Saved meal name
                <input
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                  maxLength={200}
                  required
                />
              </label>
            )}
            <p className="hint">
              {saveMode === "log"
                ? "Changes apply only to this log entry."
                : "Your log and saved meal are saved together."}
            </p>
          </div>
        )}
        {(error || calculationError) && (
          <p className="error" role="alert">
            {error || calculationError}
          </p>
        )}
      </div>
      <div className="sheet-footer totals-footer">
        <div className="section-caption">
          <span className="eyebrow">
            {mode === "meal" ? "PER MEAL" : "ENTRY TOTAL"}
          </span>
          <span className="live-dot">Live totals</span>
        </div>
        <div aria-live="polite">
          <MacroValues values={totals} prominent />
        </div>
        <button
          type="button"
          className="button primary full"
          onClick={save}
          disabled={
            saving ||
            invalid ||
            !name.trim() ||
            (saveMode !== "log" && !mealName.trim())
          }
        >
          {saving
            ? "Saving…"
            : mode === "meal"
              ? "Save meal"
              : saveMode === "update"
                ? "Log and update saved meal"
                : saveMode === "new"
                  ? "Save as new meal and log"
                  : "Log only"}
        </button>
      </div>
    </Sheet>
  );
}
