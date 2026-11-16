"use client";

import { useActionState, useState } from "react";
import { signIn, signUp } from "@/app/actions/auth";
import { FormError, SubmitButton } from "@/components/ui";

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [inState, signInAction] = useActionState(signIn, undefined);
  const [upState, signUpAction] = useActionState(signUp, undefined);
  const isUp = mode === "signup";

  if (isUp && upState?.ok) {
    return (
      <div className="card p-6 text-center">
        <h2 className="font-serif text-xl font-semibold">Check your email</h2>
        <p className="mt-2 text-sm text-muted">We sent you a confirmation link. Open it to finish signing up.</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="mb-5 grid grid-cols-2 rounded-lg bg-surface-2 p-1 text-sm" role="tablist">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-md py-1.5 font-medium ${mode === m ? "bg-surface shadow-sm" : "text-muted"}`}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <form key={mode} action={isUp ? signUpAction : signInAction} className="grid gap-4">
        <input type="hidden" name="next" value={next} />
        {isUp && (
          <div>
            <label className="label" htmlFor="display_name">Display name</label>
            <input id="display_name" name="display_name" className="input" autoComplete="nickname" placeholder="Shown to people you share courses with" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="input" autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={isUp ? 8 : undefined}
            className="input"
            autoComplete={isUp ? "new-password" : "current-password"}
          />
        </div>
        <FormError state={isUp ? upState : inState} />
        <SubmitButton className="btn btn-primary w-full py-2">{isUp ? "Create account" : "Sign in"}</SubmitButton>
      </form>
    </div>
  );
}
