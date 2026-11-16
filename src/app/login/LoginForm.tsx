"use client";

import { useState } from "react";
import { requestPasswordReset, signIn, signUp } from "@/app/actions/auth";
import { FormError, SubmitButton } from "@/components/ui";
import { useForm } from "@/components/useForm";

type Mode = "signin" | "signup" | "reset";

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<Mode>("signin");
  return (
    <div className="card p-6">
      {mode !== "reset" && (
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
      )}
      {mode === "signin" && <SignInForm next={next} onForgot={() => setMode("reset")} />}
      {mode === "signup" && <SignUpForm next={next} />}
      {mode === "reset" && <ResetForm onBack={() => setMode("signin")} />}
    </div>
  );
}

function EmailField() {
  return (
    <div>
      <label className="label" htmlFor="email">Email</label>
      <input id="email" name="email" type="email" required className="input" autoComplete="email" />
    </div>
  );
}

function SignInForm({ next, onForgot }: { next: string; onForgot: () => void }) {
  const { state, pending, formProps } = useForm(signIn, { reset: false });
  return (
    <form {...formProps} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <EmailField />
      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <label className="label mb-0" htmlFor="password">Password</label>
          <button type="button" onClick={onForgot} className="text-xs text-accent hover:underline">
            Forgot password?
          </button>
        </div>
        <input id="password" name="password" type="password" required className="input" autoComplete="current-password" />
      </div>
      <FormError state={state} />
      <SubmitButton className="btn btn-primary w-full py-2" pending={pending}>Sign in</SubmitButton>
    </form>
  );
}

function SignUpForm({ next }: { next: string }) {
  const { state, pending, formProps } = useForm(signUp, { reset: false });
  if (state?.ok) {
    return (
      <div className="text-center">
        <h2 className="font-serif text-xl font-semibold">Check your email</h2>
        <p className="mt-2 text-sm text-muted">We sent you a confirmation link. Open it on any device to finish signing up.</p>
      </div>
    );
  }
  return (
    <form {...formProps} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="display_name">Display name</label>
        <input id="display_name" name="display_name" className="input" autoComplete="nickname" placeholder="Shown to people you share courses with" />
      </div>
      <EmailField />
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required minLength={8} className="input" autoComplete="new-password" />
      </div>
      <FormError state={state} />
      <SubmitButton className="btn btn-primary w-full py-2" pending={pending}>Create account</SubmitButton>
    </form>
  );
}

function ResetForm({ onBack }: { onBack: () => void }) {
  const { state, pending, formProps } = useForm(requestPasswordReset, { reset: false });
  return (
    <div className="grid gap-4">
      <div>
        <h2 className="font-serif text-xl font-semibold">Reset your password</h2>
        <p className="mt-1 text-sm text-muted">We&apos;ll email you a link to choose a new password.</p>
      </div>
      {state?.ok ? (
        <p className="rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 text-sm">
          If an account exists for that email, a reset link is on its way. Open it on any device.
        </p>
      ) : (
        <form {...formProps} className="grid gap-4">
          <EmailField />
          <FormError state={state} />
          <SubmitButton className="btn btn-primary w-full py-2" pending={pending}>Send reset link</SubmitButton>
        </form>
      )}
      <button type="button" onClick={onBack} className="text-sm text-accent hover:underline">
        ← Back to sign in
      </button>
    </div>
  );
}
