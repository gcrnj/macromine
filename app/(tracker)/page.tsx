export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { TrackerPage } from "@/components/tracker-page";
export const metadata: Metadata = { title: "Today" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  return <TrackerPage view="today" selectedDate={date} />;
}
