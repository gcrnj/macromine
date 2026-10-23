"use client";
import { clientAction } from "@/lib/client-action";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  SlidersHorizontal,
  Search,
  Pencil,
  Trash2,
  Utensils,
  BookOpen,
  Wheat,
  Dumbbell,
  SunMoon,
  LogOut,
  ArrowUpRight,
  Check,
} from "lucide-react";
import { logout } from "@/app/login/actions";
import { deleteRecord, saveTargets } from "@/app/actions";
import { expandLines, formatMacro, sumMacros, zeroMacros } from "@/lib/macros";
import {
  macroKeys,
  type Ingredient,
  type LogEntry,
  type Macros,
  type Meal,
  type Snapshot,
  type TrackerData,
} from "@/lib/types";
import { Brand } from "./brand";
import { Builder } from "./builder";
import { IngredientForm } from "./ingredient-form";
import { Empty, MacroInputs, MacroValues, Sheet, macroLabels } from "./ui";

export type View = "today" | "ingredients" | "meals";
type Dialog =
  | { kind: "ingredient"; item: Ingredient | null }
  | { kind: "meal"; item?: Meal }
  | { kind: "log"; item?: LogEntry }
  | { kind: "targets" }
  | {
      kind: "delete";
      type: "ingredient" | "meal" | "log";
      id: string;
      name: string;
    }
  | null;
export function Tracker({
  view,
  data,
  date,
  loadError,
}: {
  view: View;
  data: TrackerData;
  date: string;
  loadError?: string;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [query, setQuery] = useState("");
  const [optimistic, setOptimistic] = useState<LogEntry | null>(null);
  const [notice, setNotice] = useState("");
  const entries = optimistic
    ? [...data.entries.filter((item) => item.id !== optimistic.id), optimistic]
    : data.entries;
  const totals = sumMacros(entries.flatMap((entry) => entry.lines));
  function saved(message: string) {
    setDialog(null);
    setOptimistic(null);
    setNotice(message);
    router.refresh();
  }
  function changeDate(offset: number) {
    const next = new Date(`${date}T12:00:00`);
    next.setDate(next.getDate() + offset);
    router.push(`/?date=${localDate(next)}`);
    setOptimistic(null);
  }
  function theme() {
    const dark =
      document.documentElement.dataset.theme === "dark" ||
      (!document.documentElement.dataset.theme &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "light" : "dark";
    localStorage.setItem("macromine-theme", dark ? "light" : "dark");
  }
  const title =
    view === "today"
      ? "Daily journal"
      : view === "ingredients"
        ? "Ingredients"
        : "Saved meals";
  const nav = [
    { href: "/", label: "Today", icon: CalendarDays, view: "today" },
    { href: "/meals", label: "Meals", icon: BookOpen, view: "meals" },
    {
      href: "/ingredients",
      label: "Ingredients",
      icon: Wheat,
      view: "ingredients",
    },
  ];
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link href="/" aria-label="MacroMine today">
          <Brand />
        </Link>
        <div className="header-actions">
          <span className="private-label">PERSONAL TRACKER</span>
          <button
            className="icon-button"
            title="Toggle light or dark mode"
            aria-label="Toggle light or dark mode"
            onClick={theme}
          >
            <SunMoon size={20} />
          </button>
          <form action={logout}>
            <button
              className="icon-button"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={19} />
            </button>
          </form>
        </div>
      </header>
      <main className="workspace">
        <div className="page-heading">
          <div>
            <span className="eyebrow">
              {view === "today" ? "ONE DAY AT A TIME" : "YOUR FOOD LIBRARY"}
            </span>
            <h1>{title}</h1>
            <p className="quiet">
              {view === "today"
                ? "A clear picture of what’s on your plate."
                : view === "ingredients"
                  ? "Your foods, brands, and reference portions."
                  : "Build once. Adjust and log whenever you need."}
            </p>
          </div>
          <button
            className="button primary heading-action"
            disabled={Boolean(loadError)}
            onClick={() =>
              setDialog(
                view === "today"
                  ? { kind: "log" }
                  : view === "meals"
                    ? { kind: "meal" }
                    : { kind: "ingredient", item: null },
              )
            }
          >
            <Plus size={19} />
            {view === "today"
              ? "Log food"
              : view === "meals"
                ? "New meal"
                : "Add ingredient"}
          </button>
        </div>
        {loadError && (
          <div className="notice error" role="alert">
            {loadError}
            <button
              className="button secondary"
              onClick={() => router.refresh()}
            >
              Try again
            </button>
          </div>
        )}
        {notice && (
          <div className="status-notice" role="status">
            <Check size={16} />
            {notice}
            <button
              className="text-button"
              onClick={() => setNotice("")}
              aria-label="Dismiss notification"
            >
              Dismiss
            </button>
          </div>
        )}
        {view === "today" ? (
          <>
            <div className="date-toolbar">
              <div className="date-switcher">
                <button
                  className="icon-button"
                  onClick={() => changeDate(-1)}
                  aria-label="Previous day"
                >
                  <ChevronLeft size={20} />
                </button>
                <label className="date-label">
                  <CalendarDays size={18} />
                  <input
                    aria-label="Journal date"
                    type="date"
                    value={date}
                    onChange={(e) => {
                      if (e.target.value) {
                        setOptimistic(null);
                        router.push(`/?date=${e.target.value}`);
                      }
                    }}
                  />
                </label>
                <button
                  className="icon-button"
                  onClick={() => changeDate(1)}
                  aria-label="Next day"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
              <button
                className="text-button"
                onClick={() => {
                  setOptimistic(null);
                  router.push(`/?date=${localDate(new Date())}`);
                }}
              >
                Today
                <ArrowUpRight size={15} />
              </button>
            </div>
            <section
              className="daily-summary"
              aria-label="Daily nutrition summary"
            >
              <div className="summary-top">
                <span className="eyebrow">DAILY TOTALS</span>
                <button
                  className="text-button"
                  disabled={Boolean(loadError)}
                  onClick={() => setDialog({ kind: "targets" })}
                >
                  <SlidersHorizontal size={16} />
                  Daily targets
                </button>
              </div>
              <div className="progress-grid">
                {macroKeys.map((key) => {
                  const target = data.targets?.[key] ?? 0;
                  const percent = target > 0 ? (totals[key] / target) * 100 : 0;
                  return (
                    <div
                      className={`progress-macro ${key === "calories" ? "calorie-total" : ""}`}
                      key={key}
                    >
                      <span className="macro-label">{macroLabels[key]}</span>
                      <div className="daily-number">
                        {formatMacro(key, totals[key])}
                        <small>{key === "calories" ? "kcal" : "g"}</small>
                      </div>
                      <div
                        className={`progress-track ${percent > 100 ? "over" : ""}`}
                        role="progressbar"
                        aria-label={macroLabels[key]}
                        aria-valuenow={Math.round(Math.min(percent, 100))}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuetext={`${formatMacro(key, totals[key])} of ${formatMacro(key, target)} ${key === "calories" ? "kcal" : "grams"}`}
                      >
                        <span style={{ width: `${Math.min(percent, 100)}%` }} />
                      </div>
                      <span className="progress-caption">
                        {target > 0 ? (
                          <>
                            {formatMacro(key, Math.abs(target - totals[key]))}{" "}
                            {key === "calories" ? "kcal" : "g"}{" "}
                            {totals[key] > target ? "over" : "remaining"}
                            <span className="target-value">
                              / {formatMacro(key, target)}
                            </span>
                          </>
                        ) : (
                          "No target set"
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
              {!data.targets && (
                <button
                  className="target-prompt"
                  disabled={Boolean(loadError)}
                  onClick={() => setDialog({ kind: "targets" })}
                >
                  Set your daily targets to see your progress{" "}
                  <ArrowUpRight size={16} />
                </button>
              )}
            </section>
            <section className="journal-section">
              <div className="section-heading">
                <h2>
                  Food journal <span className="count">{entries.length}</span>
                </h2>
                <span className="quiet">
                  {new Intl.DateTimeFormat("en", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  }).format(new Date(`${date}T12:00:00`))}
                </span>
              </div>
              {!entries.length ? (
                <Empty>
                  <Utensils size={24} />
                  <h3>No food logged for this day.</h3>
                  <p>Add a saved meal, ingredients, or direct macros.</p>
                  <button
                    className="button secondary"
                    disabled={Boolean(loadError)}
                    onClick={() => setDialog({ kind: "log" })}
                  >
                    <Plus size={18} />
                    Log food
                  </button>
                </Empty>
              ) : (
                <div className="journal-entries">
                  {entries.map((entry, index) => (
                    <article
                      className={`journal-entry ${entry.id === "pending" ? "pending" : ""}`}
                      key={entry.id}
                    >
                      <div className="entry-heading">
                        <div className="entry-title">
                          <span className="entry-index">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <h3>{entry.name}</h3>
                            <span className="hint">
                              {entry.id === "pending"
                                ? "Saving…"
                                : `${entry.lines.length} ${entry.lines.length === 1 ? "item" : "items"}`}
                            </span>
                          </div>
                        </div>
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            disabled={Boolean(optimistic)}
                            onClick={() =>
                              setDialog({ kind: "log", item: entry })
                            }
                            aria-label={`Edit ${entry.name}`}
                          >
                            <Pencil size={17} />
                          </button>
                          <button
                            className="icon-button danger"
                            disabled={Boolean(optimistic)}
                            onClick={() =>
                              setDialog({
                                kind: "delete",
                                type: "log",
                                id: entry.id,
                                name: entry.name,
                              })
                            }
                            aria-label={`Delete ${entry.name}`}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>
                      <MacroValues values={sumMacros(entry.lines)} />
                      <details className="entry-details">
                        <summary>View items</summary>
                        {entry.lines.map((line, i) => (
                          <div className="snapshot-row" key={i}>
                            <span>
                              {line.label}
                              <small>
                                {Number(line.amount.toFixed(4))} {line.unit}
                              </small>
                            </span>
                            <span>
                              {Math.round(line.calories)} <small>kcal</small>
                            </span>
                          </div>
                        ))}
                      </details>
                    </article>
                  ))}
                </div>
              )}
            </section>
            <div className="journal-footnote">
              <span className="tiny-square" />
              Past entries keep the nutrition values from the day you logged
              them.
            </div>
          </>
        ) : (
          <>
            <div className="library-toolbar">
              <label className="search-field">
                <Search size={19} />
                <input
                  aria-label={`Search ${view}`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    view === "ingredients"
                      ? "Search ingredients or brands…"
                      : "Search saved meals…"
                  }
                />
              </label>
              <span className="quiet">
                {view === "ingredients"
                  ? data.ingredients.length
                  : data.meals.length}{" "}
                {view === "ingredients" ? "ingredients" : "meals"}
              </span>
            </div>
            {view === "ingredients" ? (
              <div className="library-table">
                <div className="ingredient-table-head">
                  <span>INGREDIENT / REFERENCE</span>
                  <span>KCAL</span>
                  <span>PROTEIN</span>
                  <span>FIBER</span>
                  <span>FAT</span>
                  <span />
                </div>
                {data.ingredients
                  .filter((item) =>
                    `${item.name} ${item.brand ?? ""}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((item) => (
                    <div className="ingredient-row" key={item.id}>
                      <div className="ingredient-name">
                        <strong>{item.name}</strong>
                        <small>
                          {item.brand ? `${item.brand} · ` : ""}
                          {item.reference_amount} {item.unit}
                          {item.source === "off" ? " · unverified" : ""}
                        </small>
                      </div>
                      <div className="ingredient-values">
                        <MacroValues values={item} />
                      </div>
                      <div className="row-actions">
                        <button
                          className="icon-button"
                          aria-label={`Edit ${item.name}`}
                          onClick={() =>
                            setDialog({ kind: "ingredient", item })
                          }
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          className="icon-button danger"
                          aria-label={`Delete ${item.name}`}
                          onClick={() =>
                            setDialog({
                              kind: "delete",
                              type: "ingredient",
                              id: item.id,
                              name: item.name,
                            })
                          }
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                  ))}
                {!data.ingredients.length && (
                  <Empty>
                    <Wheat size={24} />
                    <h3>No ingredients yet. Add one.</h3>
                    <p>
                      Enter your own values or look up a food to get started.
                    </p>
                  </Empty>
                )}
              </div>
            ) : (
              <div className="meal-list">
                {data.meals
                  .filter((item) =>
                    item.name.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((item) => {
                    let values: Macros = zeroMacros();
                    let contents: Snapshot[] = [];
                    let error = "";
                    try {
                      contents = expandLines(
                        item.components,
                        data.ingredients,
                        data.meals,
                        [item.id],
                      );
                      values = sumMacros(contents);
                    } catch {
                      error = "Could not calculate this meal.";
                    }
                    return (
                      <article className="meal-row" key={item.id}>
                        <details className="meal-details">
                          <summary
                            className="meal-summary"
                            aria-label={`Ingredients in ${item.name}`}
                          >
                            <div className="meal-summary-heading">
                              <ChevronDown
                                className="meal-chevron"
                                size={18}
                                aria-hidden="true"
                              />
                              <div>
                                <h3>{item.name}</h3>
                                <span className="hint">
                                  {item.components.length}{" "}
                                  {item.components.length === 1
                                    ? "component"
                                    : "components"}{" "}
                                  · per meal
                                </span>
                              </div>
                            </div>
                            {error ? (
                              <p className="error">{error}</p>
                            ) : (
                              <MacroValues values={values} />
                            )}
                          </summary>
                          {!error && (
                            <ul
                              className="meal-ingredients"
                              aria-label={`Contents of ${item.name}`}
                            >
                              {contents.map((line, index) => (
                                <li className="meal-ingredient" key={index}>
                                  <div className="meal-ingredient-heading">
                                    <strong>{line.label}</strong>
                                    <span>
                                      {Number(line.amount.toFixed(4))}{" "}
                                      {line.unit}
                                    </span>
                                  </div>
                                  <MacroValues values={line} />
                                </li>
                              ))}
                            </ul>
                          )}
                        </details>
                        <div className="row-actions meal-actions">
                          <button
                            className="icon-button"
                            aria-label={`Edit ${item.name}`}
                            onClick={() => setDialog({ kind: "meal", item })}
                          >
                            <Pencil size={17} />
                          </button>
                          <button
                            className="icon-button danger"
                            aria-label={`Delete ${item.name}`}
                            onClick={() =>
                              setDialog({
                                kind: "delete",
                                type: "meal",
                                id: item.id,
                                name: item.name,
                              })
                            }
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                {!data.meals.length && (
                  <Empty>
                    <BookOpen size={24} />
                    <h3>No saved meals yet. Create one.</h3>
                    <p>Combine ingredients, direct macros, and a saved meal.</p>
                  </Empty>
                )}
              </div>
            )}
            {query &&
              !(view === "ingredients"
                ? data.ingredients.some((item) =>
                    `${item.name} ${item.brand ?? ""}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                : data.meals.some((item) =>
                    item.name.toLowerCase().includes(query.toLowerCase()),
                  )) && <Empty>No matching {view}.</Empty>}
          </>
        )}
      </main>
      <nav className="bottom-nav" aria-label="Main navigation">
        <div className="nav-inner">
          {nav.map((item) => (
            <Link
              key={item.view}
              href={item.href}
              className={view === item.view ? "active" : ""}
              aria-current={view === item.view ? "page" : undefined}
            >
              <item.icon size={21} strokeWidth={1.75} />
              <span>{item.label}</span>
            </Link>
          ))}
          <button disabled aria-label="Gym, coming soon">
            <Dumbbell size={21} strokeWidth={1.75} />
            <span>
              Gym <small>Soon</small>
            </span>
          </button>
        </div>
      </nav>
      {dialog?.kind === "ingredient" && (
        <IngredientForm
          ingredient={dialog.item}
          onClose={() => setDialog(null)}
          onSaved={() => saved("Ingredient saved.")}
        />
      )}
      {(dialog?.kind === "meal" || dialog?.kind === "log") && (
        <Builder
          mode={dialog.kind}
          meal={dialog.kind === "meal" ? dialog.item : undefined}
          entry={dialog.kind === "log" ? dialog.item : undefined}
          date={date}
          ingredients={data.ingredients}
          meals={data.meals}
          onClose={() => setDialog(null)}
          onSaved={() =>
            saved(dialog.kind === "meal" ? "Meal saved." : "Food logged.")
          }
          onOptimistic={setOptimistic}
          onRollback={() => setOptimistic(null)}
        />
      )}
      {dialog?.kind === "targets" && (
        <TargetsForm
          targets={data.targets}
          onClose={() => setDialog(null)}
          onSaved={() => saved("Daily targets saved.")}
        />
      )}
      {dialog?.kind === "delete" && (
        <DeleteDialog
          item={dialog}
          onClose={() => setDialog(null)}
          onSaved={() => saved("Item deleted.")}
        />
      )}
    </div>
  );
}
function TargetsForm({
  targets,
  onClose,
  onSaved,
}: {
  targets: Macros | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState(targets ?? zeroMacros());
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <Sheet title="Daily targets" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          const result = await clientAction(() => saveTargets(values));
          setPending(false);
          if (result.ok) onSaved();
          else setError(result.error);
        }}
      >
        <div className="sheet-content stack">
          <p className="quiet">
            Set your own daily goals. Use 0 to leave a nutrient without a
            target.
          </p>
          <MacroInputs values={values} onChange={setValues} />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="sheet-footer">
          <button className="button primary full" disabled={pending}>
            {pending ? "Saving…" : "Save targets"}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
function DeleteDialog({
  item,
  onClose,
  onSaved,
}: {
  item: { type: "ingredient" | "meal" | "log"; id: string; name: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <Sheet
      title={`Delete ${item.type === "log" ? "entry" : item.type}?`}
      onClose={onClose}
    >
      <div className="sheet-content">
        <p>Delete “{item.name}”? This cannot be undone.</p>
        {item.type !== "log" && (
          <p className="hint">Past log snapshots stay intact.</p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="sheet-footer two-fields">
        <button
          className="button secondary"
          onClick={onClose}
          disabled={pending}
        >
          Cancel
        </button>
        <button
          className="button destructive"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            const result = await clientAction(() =>
              deleteRecord(item.type, item.id),
            );
            setPending(false);
            if (result.ok) onSaved();
            else setError(result.error);
          }}
        >
          {pending ? "Deleting…" : "Delete"}
        </button>
      </div>
    </Sheet>
  );
}
function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
