"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { getLibrary } from "@/lib/data";
import { expandLines } from "@/lib/macros";
import {
  date,
  parseIngredient,
  parseLines,
  parseMacros,
  text,
  uuid,
} from "@/lib/validation";
import type {
  ActionResult,
  BuilderLine,
  Ingredient,
  LogEntry,
  Macros,
} from "@/lib/types";

function failure(error: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error:
      error instanceof Error
        ? error.message
        : "Could not save. Please try again.",
  };
}
function refresh() {
  revalidatePath("/", "layout");
}
export async function saveIngredient(
  id: string | null,
  input: Omit<Ingredient, "id">,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const value = parseIngredient(input);
    const result = id
      ? await supabase
          .from("ingredients")
          .update(value)
          .eq("id", uuid(id))
          .eq("user_id", user.id)
          .select("id")
          .single()
      : await supabase.from("ingredients").insert(value).select("id").single();
    if (result.error)
      throw new Error(
        "Could not save the ingredient. Check your connection and try again.",
      );
    refresh();
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}
export async function deleteRecord(
  kind: "ingredient" | "meal" | "log",
  id: string,
): Promise<ActionResult> {
  try {
    const tables = {
      ingredient: "ingredients",
      meal: "meals",
      log: "log_entries",
    };
    if (!(kind in tables)) throw new Error("Invalid record type.");
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from(tables[kind])
      .delete()
      .eq("id", uuid(id))
      .eq("user_id", user.id)
      .select("id")
      .single();
    if (error)
      throw new Error(
        error.code === "23503"
          ? "This item is used in a saved meal. Remove it from that meal first."
          : "Could not delete this item. Try again.",
      );
    refresh();
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}
export async function saveMeal(
  id: string | null,
  name: string,
  input: BuilderLine[],
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const lines = parseLines(input);
    const { ingredients, meals } = await getLibrary(supabase, user.id);
    expandLines(lines, ingredients, meals, id ? [uuid(id)] : ["new"]);
    const { error } = await supabase.rpc("save_meal", {
      p_id: id ? uuid(id) : null,
      p_name: text(name, "Meal name"),
      p_components: lines,
    });
    if (error)
      throw new Error(
        "Could not save. Meals may nest only one level, without cycles. Check your connection and try again.",
      );
    refresh();
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}
export async function saveLog(input: {
  id: string | null;
  date: string;
  name: string;
  lines: BuilderLine[];
  mode: "log" | "update" | "new";
  mealId: string | null;
  mealName: string;
}): Promise<ActionResult<LogEntry>> {
  try {
    const { supabase, user } = await requireUser();
    const lines = parseLines(input.lines);
    const { ingredients, meals } = await getLibrary(supabase, user.id);
    const snapshots = expandLines(lines, ingredients, meals);
    if (snapshots.length > 100)
      throw new Error("Use at most 100 expanded lines.");
    if (!["log", "update", "new"].includes(input.mode))
      throw new Error("Invalid save action.");
    if (input.mode === "update" && !input.mealId)
      throw new Error("Choose the saved meal to update.");
    const name = text(input.name, "Entry name");
    const logDate = date(input.date);
    const { data: id, error } = await supabase.rpc("save_log", {
      p_id: input.id ? uuid(input.id) : null,
      p_name: name,
      p_date: logDate,
      p_lines: snapshots,
      p_meal_id: input.mode === "update" ? uuid(input.mealId) : null,
      p_meal_name:
        input.mode !== "log" ? text(input.mealName, "Meal name") : null,
      p_components: input.mode !== "log" ? lines : null,
    });
    if (error)
      throw new Error(
        "Could not save your entry. Check your connection and saved meal nesting, then try again.",
      );
    refresh();
    return {
      ok: true,
      data: {
        id,
        name,
        log_date: logDate,
        lines: snapshots,
        created_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    return failure(error);
  }
}
export async function saveTargets(input: Macros): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("daily_targets")
      .upsert({ user_id: user.id, ...parseMacros(input) });
    if (error)
      throw new Error("Could not save your targets. Please try again.");
    refresh();
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}
