"use server";

import { createClient as createPlainClient, type EmailOtpType } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

function safeNext(next: FormDataEntryValue | null): string {
  const s = typeof next === "string" ? next : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : "/dashboard";
}

async function origin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host")}`;
}

export async function signIn(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "invalid_credentials") {
      return { error: "Wrong email or password. Forgot your password? Use “Forgot password?” below to reset it." };
    }
    if (error.code === "email_not_confirmed") {
      return { error: "Please confirm your email first. Check your inbox for the confirmation link." };
    }
    return { error: error.message };
  }
  redirect(safeNext(formData.get("next")));
}

/** Implicit-flow client so emailed links work in any browser/device (see /auth/confirm). */
function linkClient() {
  const { url, key } = supabaseEnv();
  return createPlainClient(url, key, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function requestPasswordReset(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email." };
  const { error } = await linkClient().auth.resetPasswordForEmail(email, {
    redirectTo: `${await origin()}/auth/confirm?next=${encodeURIComponent("/reset-password")}`,
  });
  // Don't reveal whether the address has an account; only surface rate limits.
  if (error && /rate limit|too many/i.test(error.message)) {
    return { error: "Too many emails were sent recently. Please wait a few minutes and try again." };
  }
  return { ok: true };
}

export async function updatePassword(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "The two passwords don't match." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your reset link has expired. Request a new one from the sign-in page." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function signUp(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  if (!email || password.length < 8) return { error: "Enter an email and a password of at least 8 characters." };

  const next = safeNext(formData.get("next"));
  // Implicit flow (not PKCE) for sign-up: the confirmation link then works in any browser or device,
  // because it doesn't depend on a code-verifier cookie from the browser that signed up.
  const { data, error } = await linkClient().auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName || undefined },
      emailRedirectTo: `${await origin()}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { error: error.message };
  if (data.session) {
    // Email confirmation disabled: store the session in this browser's cookies.
    const supabase = await createClient();
    await supabase.auth.setSession(data.session);
    redirect(next);
  }
  // Supabase returns a user with no identities (and sends no email) when the address is already registered.
  if (data.user && data.user.identities?.length === 0) {
    return { error: "An account with this email already exists. Sign in instead (switch to the Sign in tab)." };
  }
  return { ok: true };
}

const LOGIN_HINT = "If you already confirmed your email, just sign in below.";

export async function confirmEmail(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = String(formData.get("type") ?? "email") as EmailOtpType;
  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(`That confirmation link can't be used (${error.message}). ${LOGIN_HINT}`)}`);
  }
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
