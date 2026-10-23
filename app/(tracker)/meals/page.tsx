export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { TrackerPage } from "@/components/tracker-page";
export const metadata: Metadata = { title: "Meals" };
export default function Page() {
  return <TrackerPage view="meals" />;
}
