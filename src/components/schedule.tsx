"use client";

import { addMeetings, deleteMeeting } from "@/app/actions/courses";
import { WEEKDAYS, formatTimeRange, summarizeSchedule } from "@/lib/schedule";
import type { Meeting } from "@/lib/types";
import { ConfirmButton, FormError, SubmitButton } from "./ui";
import { useForm } from "./useForm";

/** Day toggles + times + location. Field names: days (multi), start_time, end_time, location. */
export function ScheduleFields({ idPrefix = "s" }: { idPrefix?: string }) {
  return (
    <div className="grid gap-3">
      <fieldset>
        <legend className="label">Class days</legend>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((d) => (
            <label key={d.n} className="cursor-pointer">
              <input type="checkbox" name="days" value={d.n} className="peer sr-only" />
              <span className="inline-block rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition-colors select-none peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40">
                {d.short}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-muted" htmlFor={`${idPrefix}-start`}>
          Starts (optional)
          <input id={`${idPrefix}-start`} type="time" name="start_time" className="input mt-1" />
        </label>
        <label className="text-xs text-muted" htmlFor={`${idPrefix}-end`}>
          Ends (optional)
          <input id={`${idPrefix}-end`} type="time" name="end_time" className="input mt-1" />
        </label>
        <label className="text-xs text-muted" htmlFor={`${idPrefix}-loc`}>
          Where (optional)
          <input id={`${idPrefix}-loc`} name="location" maxLength={300} className="input mt-1" placeholder="Library, Zoom link…" />
        </label>
      </div>
    </div>
  );
}

export function LocationText({ location }: { location: string | null }) {
  if (!location) return null;
  return /^https?:\/\//i.test(location) ? (
    <a href={location} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
      Join link ↗
    </a>
  ) : (
    <span>{location}</span>
  );
}

export function ScheduleEditor({ courseId, meetings, canEdit }: { courseId: string; meetings: Meeting[]; canEdit: boolean }) {
  const { state, pending, formProps } = useForm(addMeetings.bind(null, courseId), { reset: true });

  return (
    <div className="grid gap-4">
      {meetings.length === 0 ? (
        <p className="text-sm text-muted">No class days yet.</p>
      ) : (
        <>
          <p className="text-sm font-medium">{summarizeSchedule(meetings)}</p>
          <ul className="divide-y divide-line">
            {meetings.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>
                  <span className="inline-block w-24 font-medium">{WEEKDAYS[m.weekday - 1].long}</span>
                  <span className="text-muted">{formatTimeRange(m.start_time, m.end_time) ?? "Any time"}</span>
                  {m.location && (
                    <span className="ml-3 text-muted">
                      <LocationText location={m.location} />
                    </span>
                  )}
                </span>
                {canEdit && <ConfirmButton action={() => deleteMeeting(m.id)} label="Remove" confirmLabel="Remove class time?" />}
              </li>
            ))}
          </ul>
        </>
      )}
      {canEdit && (
        <form {...formProps} className="grid gap-3 rounded-lg border border-dashed border-line p-3">
          <ScheduleFields idPrefix="edit" />
          <FormError state={state} />
          <div>
            <SubmitButton className="btn btn-primary btn-sm" pending={pending}>Add class time</SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
