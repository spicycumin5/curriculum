"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { ActionResult, Item, Unit } from "@/lib/types";
import { DueLabel, KindBadge, formatMinutes } from "./badges";
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
      <li className="py-2">
        <ItemForm action={edit.update} initial={item} submitLabel="Save item" onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="flex gap-3 py-2.5">
      <input
        type="checkbox"
        className="mt-1 size-4 shrink-0 cursor-pointer"
        style={{ accentColor: color }}
        checked={optimisticDone}
        aria-label={`Mark "${item.title}" ${optimisticDone ? "not done" : "done"}`}
        onChange={(e) => {
          const next = e.target.checked;
          setError(undefined);
          start(async () => {
            setOptimisticDone(next);
            const res = await toggle(next);
            if (res?.error) setError(res.error);
          });
        }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <KindBadge kind={item.kind} />
          {isSafeUrl(item.url) ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`font-medium underline decoration-line underline-offset-4 hover:decoration-accent ${optimisticDone ? "text-muted line-through" : ""}`}
            >
              {item.title}
              <span aria-hidden className="ml-1 text-xs text-muted">↗</span>
            </a>
          ) : (
            <span className={`font-medium ${optimisticDone ? "text-muted line-through" : ""}`}>{item.title}</span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
          <DueLabel due={due} done={optimisticDone} today={today} />
          {item.est_minutes != null && <span>~{formatMinutes(item.est_minutes)}</span>}
        </div>
        {item.notes && <p className="mt-1 text-sm whitespace-pre-wrap text-muted">{item.notes}</p>}
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
        <UnitForm action={edit.update} initial={unit} submitLabel="Save unit" onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
      </div>
    );
  }
  return (
    <div className="mt-3 flex flex-wrap gap-1">
      <ActionButton label="Move unit up" action={() => edit.move(-1)} className={`btn btn-sm ${isFirst ? "invisible" : ""}`}>↑</ActionButton>
      <ActionButton label="Move unit down" action={() => edit.move(1)} className={`btn btn-sm ${isLast ? "invisible" : ""}`}>↓</ActionButton>
      <button type="button" className="btn btn-sm" onClick={() => setEditing(true)}>Edit unit</button>
      <ConfirmButton action={edit.remove} label="Delete unit" confirmLabel="Delete unit and its items?" />
    </div>
  );
}

export function AddItem({ action }: { action: FormAction }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button type="button" className="btn btn-sm mt-2 border-dashed" onClick={() => setOpen(true)}>
        + Add resource / task
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
        + Add unit
      </button>
    );
  return (
    <div className="card p-4">
      <h3 className="mb-3 font-serif text-lg font-semibold">New unit</h3>
      <UnitForm action={action} submitLabel="Add unit" onDone={() => setOpen(false)} onCancel={() => setOpen(false)} />
    </div>
  );
}
