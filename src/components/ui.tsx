"use client";

import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "@/lib/types";

export function SubmitButton({ children, className = "btn btn-primary" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? "Saving…" : children}
    </button>
  );
}

export function FormError({ state }: { state: ActionResult }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm whitespace-pre-line text-danger">
      {state.error}
    </p>
  );
}

/** Two-step destructive button (no native confirm dialogs). */
export function ConfirmButton({
  action,
  label = "Delete",
  confirmLabel = "Really delete?",
  className = "btn btn-sm btn-danger",
}: {
  action: () => Promise<ActionResult>;
  label?: string;
  confirmLabel?: string;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <span className="inline-flex items-center gap-1">
      {armed ? (
        <>
          <button
            type="button"
            className={className}
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await action();
                if (res?.error) setError(res.error);
                setArmed(false);
              })
            }
          >
            {pending ? "…" : confirmLabel}
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setArmed(false)}>
            Cancel
          </button>
        </>
      ) : (
        <button type="button" className={className} onClick={() => setArmed(true)}>
          {label}
        </button>
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}

/** Small button that runs a server action (e.g. move up/down). */
export function ActionButton({
  action,
  children,
  label,
  className = "btn btn-sm",
}: {
  action: () => Promise<ActionResult>;
  children: React.ReactNode;
  label: string;
  className?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={className}
      disabled={pending}
      onClick={() => start(async () => void (await action()))}
    >
      {children}
    </button>
  );
}

export function ProgressBar({ pct, color, label }: { pct: number; color?: string; label?: string }) {
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progress"}
    >
      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: color ?? "var(--accent)" }} />
    </div>
  );
}
