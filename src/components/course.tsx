"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { ActionResult, Item, Unit } from "@/lib/types";
import { DueLabel, KindBadge, formatMinutes, kindLabel } from "./badges";
import { IconExternal } from "./icons";
import { ItemForm, UnitForm } from "./forms";
import { ActionButton, ConfirmButton } from "./ui";

type FormAction = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

export interface EditActions {
  update: FormAction;
  remove: () => Promise<ActionResult>;
  move: (dir: -1 | 1) => Promise<ActionResult>;
}

function isSafeUrl(url: string | null): url is string {
  return !!url && /^https?:\/\//i.test(url);
}

export function ItemRow({
  item,
  due,
  done,
  today,
  color,
  toggle,
  edit,
  isFirst,
  isLast,
}: {
  item: Item;
  due: string | null;
  done: boolean;
  today: string;
  color: string;
  toggle: (done: boolean) => Promise<ActionResult>;
  edit?: EditActions;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [optimisticDone, setOptimisticDone] = useOptimistic(done);
  const [, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string>();

  if (editing && edit) {
    return (
      <li className="px-4 py-3">
        <ItemForm action={edit.update} initial={item} submitLabel="Save item" onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
      </li>
    );
  }

  const toggleDone = () => {
    const next = !optimisticDone;
    setError(undefined);
    start(async () => {
      setOptimisticDone(next);
      const res = await toggle(next);
      if (res?.error) setError(res.error);
    });
  };

  return (
    <li className={`flex items-start gap-3 px-4 py-3 ${optimisticDone ? "bg-surface-2/50" : ""}`}>
      <span className="mt-0.5">
        <KindBadge kind={item.kind} />
      </span>
      <div className="min-w-0 flex-1">
        {isSafeUrl(item.url) ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-start gap-1 leading-snug font-semibold hover:underline ${optimisticDone ? "text-muted" : "text-accent"}`}
          >
            {item.title}
            <IconExternal className="mt-0.5 size-3.5 opacity-70" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : (
          <span className={`leading-snug font-semibold ${optimisticDone ? "text-muted" : ""}`}>{item.title}</span>
        )}
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
          <span>{kindLabel(item.kind)}</span>
          <DueLabel due={due} done={optimisticDone} today={today} />
          {item.est_minutes != null && <span>{formatMinutes(item.est_minutes)}</span>}
        </div>
        {item.notes && <p className="mt-1 max-w-prose text-sm whitespace-pre-wrap text-muted">{item.notes}</p>}
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        {edit && (
          <div className="mt-2 flex flex-wrap gap-1">
            <ActionButton label="Move up" action={() => edit.move(-1)} className={`btn btn-sm ${isFirst ? "invisible" : ""}`}>↑</ActionButton>
            <ActionButton label="Move down" action={() => edit.move(1)} className={`btn btn-sm ${isLast ? "invisible" : ""}`}>↓</ActionButton>
            <button type="button" className="btn btn-sm" onClick={() => setEditing(true)}>Edit</button>
            <ConfirmButton action={edit.remove} />
          </div>
        )}
      </div>
      <button
        type="button"
        role="checkbox"
        aria-checked={optimisticDone}
        aria-label={`Mark "${item.title}" as ${optimisticDone ? "not done" : "done"}`}
        onClick={toggleDone}
        className={`grid size-8 shrink-0 place-items-center rounded-full border-2 transition-colors ${
          optimisticDone ? "border-transparent text-white" : "border-line text-transparent hover:border-ok hover:text-ok/50"
        }`}
        style={optimisticDone ? { background: color } : undefined}
        title={optimisticDone ? "Done. Click to undo" : "Mark as done"}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </button>
    </li>
  );
}

export function UnitEditor({
  unit,
  edit,
  isFirst,
  isLast,
}: {
  unit: Unit;
  edit: EditActions;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <div className="mt-3">
        <UnitForm action={edit.update} initial={unit} submitLabel="Save module" onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
      </div>
    );
  }
  return (
    <div className="mt-3 flex flex-wrap gap-1">
      <ActionButton label="Move module up" action={() => edit.move(-1)} className={`btn btn-sm ${isFirst ? "invisible" : ""}`}>↑</ActionButton>
      <ActionButton label="Move module down" action={() => edit.move(1)} className={`btn btn-sm ${isLast ? "invisible" : ""}`}>↓</ActionButton>
      <button type="button" className="btn btn-sm" onClick={() => setEditing(true)}>Edit module</button>
      <ConfirmButton action={edit.remove} label="Delete module" confirmLabel="Delete module and its items?" />
    </div>
  );
}

export function AddItem({ action }: { action: FormAction }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button type="button" className="btn btn-sm mt-2 border-dashed" onClick={() => setOpen(true)}>
        + Add item
      </button>
    );
  return (
    <div className="mt-2">
      <ItemForm action={action} submitLabel="Add item" onCancel={() => setOpen(false)} />
    </div>
  );
}

export function AddUnit({ action }: { action: FormAction }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button type="button" className="btn w-full border-dashed py-3" onClick={() => setOpen(true)}>
        + Add module
      </button>
    );
  return (
    <div className="card p-4">
      <h3 className="mb-3 font-serif text-lg font-semibold">New module</h3>
      <UnitForm action={action} submitLabel="Add module" onDone={() => setOpen(false)} onCancel={() => setOpen(false)} />
    </div>
  );
}
