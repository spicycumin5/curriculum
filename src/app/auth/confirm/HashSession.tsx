"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Finishes an implicit-flow email confirmation: Supabase has already confirmed the address and
 * redirected here with #access_token=…&refresh_token=… (or #error_description=…).
 * No PKCE cookie is needed, so this works even if the link is opened in another browser or device.
 */
export function HashSession({ next }: { next: string }) {
  const [state, setState] = useState<{ status: "working" | "error" | "none"; message?: string }>({ status: "working" });

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    // Remove tokens from the address bar/history right away.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    const errorDescription = hash.get("error_description");
    if (errorDescription) {
      setState({ status: "error", message: errorDescription.replace(/\+/g, " ") });
      return;
    }
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    if (!access_token || !refresh_token) {
      setState({ status: "none" });
      return;
    }
    createClient()
      .auth.setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) setState({ status: "error", message: error.message });
        // Full navigation so server components pick up the new session cookies.
        else window.location.replace(next);
      });
  }, [next]);

  if (state.status === "working") {
    return (
      <>
        <h1 className="font-serif text-2xl font-semibold">Confirming…</h1>
        <p className="text-sm text-muted">Signing you in.</p>
      </>
    );
  }
  return (
    <>
      <h1 className="font-serif text-2xl font-semibold">{state.status === "error" ? "That link didn't work" : "Link incomplete"}</h1>
      <p className="text-sm text-muted">
        {state.message ? `${state.message}. ` : ""}
        Confirmation links work once. If you already clicked it, your email is confirmed: just sign in.
      </p>
      <Link href="/login" className="btn btn-primary mx-auto">Go to sign in</Link>
    </>
  );
}
