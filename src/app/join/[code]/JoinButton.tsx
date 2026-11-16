"use client";

import { useState, useTransition } from "react";
import { redeemInvite } from "@/app/actions/courses";

export function JoinButton({ code }: { code: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="grid gap-2">
      <button
        type="button"
        className="btn btn-primary mx-auto px-6 py-2"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await redeemInvite(code);
            if (res?.error) setError(res.error);
          })
        }
      >
        {pending ? "Enrolling…" : "Enroll"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
