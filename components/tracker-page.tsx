import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Tracker, type View } from "./tracker";
import { getTrackerData } from "@/lib/data";
import { createClient, isConfigured } from "@/lib/supabase/server";
import type { TrackerData } from "@/lib/types";
import { date as parseDate } from "@/lib/validation";
export async function TrackerPage({
  view,
  selectedDate,
}: {
  view: View;
  selectedDate?: string;
}) {
  if (!isConfigured()) redirect("/login");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // A timezone cookie from the phone keeps the initial date correct on any host.
  const cookieStore = await cookies();
  let timeZone = cookieStore.get("macromine-timezone")?.value ?? "Asia/Manila";
  try {
    new Intl.DateTimeFormat("en", { timeZone });
  } catch {
    timeZone = "Asia/Manila";
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const today = ["year", "month", "day"]
    .map((type) => parts.find((p) => p.type === type)!.value)
    .join("-");
  let date = today;
  try {
    if (selectedDate) date = parseDate(selectedDate);
  } catch {
    /* Invalid query dates fall back to today. */
  }
  let data: TrackerData = {
    ingredients: [],
    meals: [],
    entries: [],
    targets: null,
  };
  let loadError: string | undefined;
  try {
    data = await getTrackerData(supabase, user.id, date);
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Could not load your journal.";
  }
  return (
    <Tracker
      key={`${view}-${date}`}
      view={view}
      data={data}
      date={date}
      loadError={loadError}
    />
  );
}
