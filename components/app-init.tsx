"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export function AppInit() {
  const router = useRouter();
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const previous = document.cookie
        .split("; ")
        .find((cookie) => cookie.startsWith("macromine-timezone="))
        ?.split("=")[1];
      if (previous !== encodeURIComponent(tz)) {
        document.cookie = `macromine-timezone=${encodeURIComponent(tz)}; Path=/; Max-Age=31536000; SameSite=Lax`;
        router.refresh();
      }
    } catch {
      /* Device timezone is optional; the server has a default. */
    }
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        /* Online use remains available. */
      });
    }
  }, [router]);
  return null;
}
