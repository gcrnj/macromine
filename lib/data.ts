import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BuilderLine,
  Ingredient,
  LogEntry,
  Macros,
  Meal,
  Snapshot,
  TrackerData,
} from "./types";
export async function getLibrary(supabase: SupabaseClient, userId: string) {
  const results = await Promise.all([
    supabase
      .from("ingredients")
      .select("*")
      .eq("user_id", userId)
      .order("name"),
    supabase
      .from("meals")
      .select("id,name")
      .eq("user_id", userId)
      .order("name"),
    supabase
      .from("meal_components")
      .select("*")
      .eq("user_id", userId)
      .order("position"),
  ]);
  for (const result of results)
    if (result.error)
      throw new Error(
        "Could not load your library. Check your connection and database migration.",
      );
  const ingredients = results[0].data as Ingredient[];
  const meals = (results[1].data as Meal[]).map((meal) => ({
    ...meal,
    components: (results[2].data ?? []).filter(
      (c) => c.meal_id === meal.id,
    ) as BuilderLine[],
  }));
  return { ingredients, meals };
}
export async function getTrackerData(
  supabase: SupabaseClient,
  userId: string,
  date: string,
): Promise<TrackerData> {
  const [library, logs, targets] = await Promise.all([
    getLibrary(supabase, userId),
    supabase
      .from("log_entries")
      .select(
        "id,name,log_date,created_at,log_lines(label,amount,unit,calories,protein,fiber,fat,position)",
      )
      .eq("user_id", userId)
      .eq("log_date", date)
      .order("created_at"),
    supabase
      .from("daily_targets")
      .select("calories,protein,fiber,fat")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  if (logs.error || targets.error)
    throw new Error(
      "Could not load your journal. Check your connection and database migration.",
    );
  const entries: LogEntry[] = (logs.data ?? []).map(
    ({ log_lines, ...entry }) => ({
      ...entry,
      lines: [...log_lines].sort(
        (a, b) => a.position - b.position,
      ) as Snapshot[],
    }),
  );
  return { ...library, entries, targets: targets.data as Macros | null };
}
