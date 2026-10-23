export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { Brand } from "@/components/brand";
import { isConfigured } from "@/lib/supabase/server";
export const metadata: Metadata = { title: "Sign in" };
export default function LoginPage() {
  const configured = isConfigured();
  return (
    <main className="login-page">
      <div className="login-wrap">
        <Brand />
        <div className="login-heading">
          <span className="eyebrow">YOUR DAILY RECORD</span>
          <h1>Welcome back.</h1>
          <p className="quiet">Sign in to MacroMine.</p>
        </div>
        {!configured && (
          <div className="notice">
            <strong>Connect your account</strong>
            <p>
              Add your Supabase URL and anon key to <code>.env.local</code>, run
              the migration, and create your account in Supabase. Setup steps
              are in the README.
            </p>
          </div>
        )}
        <LoginForm configured={configured} />
      </div>
      <span className="login-bottom">MacroMine · Nutrition, at a glance.</span>
    </main>
  );
}
