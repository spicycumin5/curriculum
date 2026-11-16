"use client";

import type { Course, Item, Unit } from "@/lib/types";
import { ITEM_KINDS } from "@/lib/types";
import { ScheduleFields } from "./schedule";
import { FormError, SubmitButton } from "./ui";
import { useForm, type FormAction } from "./useForm";


export function CourseForm({
  action,
  initial,
  submitLabel,
  withSchedule = false,
}: {
  action: FormAction;
  initial?: Partial<Course>;
  submitLabel: string;
  withSchedule?: boolean;
}) {
  const { state, pending, formProps } = useForm(action, { reset: false });
  return (
    <form {...formProps} className="grid gap-4">
      <div>
        <label className="label" htmlFor="c-title">Title</label>
        <input id="c-title" name="title" required maxLength={200} className="input" defaultValue={initial?.title} placeholder="e.g. Intro to Linear Algebra…" />
      </div>
      <div>
        <label className="label" htmlFor="c-desc">Description</label>
        <textarea id="c-desc" name="description" rows={3} maxLength={5000} className="input" defaultValue={initial?.description ?? ""} placeholder="What you want to get out of this course" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="c-start">Start date</label>
          <input id="c-start" type="date" name="start_date" className="input" defaultValue={initial?.start_date ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="c-end">End date</label>
          <input id="c-end" type="date" name="end_date" className="input" defaultValue={initial?.end_date ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="c-color">Color</label>
          <input id="c-color" type="color" name="color" className="input h-[38px] p-1" defaultValue={initial?.color ?? "#3d5a80"} />
        </div>
      </div>
      {withSchedule && (
        <div className="rounded-lg border border-line bg-surface-2/40 p-3">
          <p className="mb-2 text-sm font-medium">Weekly class schedule</p>
          <p className="mb-3 text-xs text-muted">
            Pick the days you&apos;ll study this course. They show up on your dashboard, week view and calendar. You can add more times
            (e.g. a different time on Fridays) later in Settings.
          </p>
          <ScheduleFields idPrefix="new" />
        </div>
      )}
      <FormError state={state} />
      {state?.ok && <p className="text-sm text-ok">Saved.</p>}
      <div>
        <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

export function UnitForm({
  action,
  initial,
  submitLabel,
  onDone,
  onCancel,
}: {
  action: FormAction;
  initial?: Partial<Unit>;
  submitLabel: string;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const { state, pending, formProps } = useForm(action, { reset: !initial, onDone });
  return (
    <form {...formProps} className="grid gap-3">
      <input name="title" required maxLength={200} className="input" defaultValue={initial?.title} placeholder="Module title, e.g. Vectors and spans…" aria-label="Module title" />
      <textarea name="description" rows={2} maxLength={5000} className="input" defaultValue={initial?.description ?? ""} placeholder="Goals for this module (optional)…" aria-label="Module description" />
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-muted">
          Starts
          <input type="date" name="start_date" className="input mt-1" defaultValue={initial?.start_date ?? ""} />
        </label>
        <label className="text-xs text-muted">
          Due
          <input type="date" name="due_date" className="input mt-1" defaultValue={initial?.due_date ?? ""} />
        </label>
      </div>
      <FormError state={state} />
      <div className="flex gap-2">
        <SubmitButton className="btn btn-primary btn-sm" pending={pending}>{submitLabel}</SubmitButton>
        {onCancel && (
          <button type="button" className="btn btn-sm" onClick={onCancel}>
            {initial ? "Cancel" : "Close"}
          </button>
        )}
      </div>
    </form>
  );
}

export function ItemForm({
  action,
  initial,
  submitLabel,
  onDone,
  onCancel,
}: {
  action: FormAction;
  initial?: Partial<Item>;
  submitLabel: string;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const { state, pending, formProps } = useForm(action, { reset: !initial, onDone });
  return (
    <form {...formProps} className="grid gap-3 rounded-lg border border-dashed border-line p-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <input name="title" required maxLength={300} className="input" defaultValue={initial?.title} placeholder="e.g. Read chapter 2…" aria-label="Item title" />
        <select name="kind" className="input" defaultValue={initial?.kind ?? "read"} aria-label="Kind">
          {ITEM_KINDS.map((k) => (
            <option key={k} value={k}>
              {k[0].toUpperCase() + k.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <input name="url" type="url" className="input" defaultValue={initial?.url ?? ""} placeholder="https://… (optional)" aria-label="Link" />
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-muted">
          Due (blank = module&apos;s due date)
          <input type="date" name="due_date" className="input mt-1" defaultValue={initial?.due_date ?? ""} />
        </label>
        <label className="text-xs text-muted">
          Estimated minutes
          <input type="number" min={0} name="est_minutes" className="input mt-1" defaultValue={initial?.est_minutes ?? ""} />
        </label>
      </div>
      <textarea name="notes" rows={2} maxLength={5000} className="input" defaultValue={initial?.notes ?? ""} placeholder="Notes (optional)" aria-label="Notes" />
      <FormError state={state} />
      <div className="flex gap-2">
        <SubmitButton className="btn btn-primary btn-sm" pending={pending}>{submitLabel}</SubmitButton>
        {onCancel && (
          <button type="button" className="btn btn-sm" onClick={onCancel}>
            {initial ? "Cancel" : "Close"}
          </button>
        )}
      </div>
    </form>
  );
}
