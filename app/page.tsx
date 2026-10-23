
import { redirect } from "next/navigation";
import { createClient, isConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!isConfigured()) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) redirect("/login");

  redirect("/dashboard");
}
