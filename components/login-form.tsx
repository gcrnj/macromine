"use client";
import { useActionState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { login } from "@/app/login/actions";
export function LoginForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(login, { error: "" });
  return (
    <form action={action} className="login-form">
      <label>
        Email
        <input
          name="email"
          type="email"
          autoComplete="username"
          placeholder="you@example.com"
          required
          disabled={!configured}
        />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          required
          disabled={!configured}
        />
      </label>
      {state.error && (
        <p role="alert" className="error">
          {state.error}
        </p>
      )}
      <button className="button primary" disabled={!configured || pending}>
        {pending ? "Signing in…" : "Sign in"}
        <ArrowRight size={18} />
      </button>
      <p className="quiet login-footnote">
        <LockKeyhole size={15} /> Your personal nutrition journal.
      </p>
    </form>
  );
}
