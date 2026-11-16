"use client";

import { useActionState, useState, useTransition } from "react";
import { createInvite, deleteInvite, setMemberRole } from "@/app/actions/courses";
import { ConfirmButton, FormError, SubmitButton } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import type { Role } from "@/lib/types";

export function MemberRoleSelect({ courseId, userId, role }: { courseId: string; userId: string; role: Role }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <>
      <select
        className="input w-auto py-1 text-xs"
        defaultValue={role}
        disabled={pending}
        aria-label="Member role"
        onChange={(e) => {
          const next = e.target.value as Role;
          start(async () => {
            const res = await setMemberRole(courseId, userId, next);
            setError(res?.error);
          });
        }}
      >
        <option value="viewer">Student</option>
        <option value="editor">Editor</option>
      </select>
      {error && <span className="text-xs text-danger">{error}</span>}
    </>
  );
}

export function InviteManager({
  courseId,
  invites,
}: {
  courseId: string;
  invites: { code: string; role: Role; expires_at: string }[];
}) {
  const [state, action] = useActionState(createInvite.bind(null, courseId), undefined);
  const [copied, setCopied] = useState<string>();
  const now = Date.now();

  async function copy(code: string) {
    const url = `${window.location.origin}/join/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(code);
      setTimeout(() => setCopied(undefined), 1500);
    } catch {
      setCopied(`show:${code}`); // clipboard blocked: show the link so it can be copied by hand
    }
  }

  return (
    <div className="grid gap-4">
      <form action={action} className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted">
          Role
          <select name="role" className="input mt-1 w-auto" defaultValue="viewer">
            <option value="viewer">Student</option>
            <option value="editor">Editor</option>
          </select>
        </label>
        <label className="text-xs text-muted">
          Expires in (days)
          <input name="days" type="number" min={1} max={90} defaultValue={14} className="input mt-1 w-24" />
        </label>
        <SubmitButton className="btn btn-primary">Create invite link</SubmitButton>
      </form>
      <FormError state={state} />
      {invites.length > 0 && (
        <ul className="divide-y divide-line">
          {invites.map((inv) => {
            const expired = new Date(inv.expires_at).getTime() < now;
            return (
              <li key={inv.code} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div className="min-w-0">
                  <span>{inv.role === "viewer" ? "Student" : "Editor"} link</span>{" "}
                  <span className={expired ? "text-danger" : "text-muted"}>
                    {expired ? "expired" : `expires ${formatDate(inv.expires_at.slice(0, 10), "MMM d")}`}
                  </span>
                  {copied === `show:${inv.code}` && (
                    <code className="mt-1 block truncate text-xs">{`${window.location.origin}/join/${inv.code}`}</code>
                  )}
                </div>
                <div className="flex gap-1">
                  {!expired && (
                    <button type="button" className="btn btn-sm" onClick={() => copy(inv.code)}>
                      {copied === inv.code ? "Copied!" : "Copy link"}
                    </button>
                  )}
                  <ConfirmButton action={() => deleteInvite(inv.code)} label="Revoke" confirmLabel="Revoke link?" />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
