"use client";

import { useMemo, useState, useTransition } from "react";
import { importCourse } from "@/app/actions/courses";
import { formatMinutes } from "@/components/badges";
import { parseCourseJson } from "@/lib/schema/course-json";
import { dayKeyToNumber, summarizeSchedule } from "@/lib/schedule";

export function ImportForm() {
  const [text, setText] = useState("");
  const [serverError, setServerError] = useState<string>();
  const [pending, start] = useTransition();
  const parsed = useMemo(() => (text.trim() ? parseCourseJson(text) : null), [text]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 2_000_000) {
      setServerError("File is larger than 2 MB.");
      return;
    }
    setServerError(undefined);
    setText(await file.text());
  }

  const course = parsed?.ok ? parsed.data : null;
  const itemCount = course?.units.reduce((s, u) => s + u.items.length, 0) ?? 0;
  const minutes = course?.units.flatMap((u) => u.items).reduce((s, i) => s + (i.est_minutes ?? 0), 0) ?? 0;

  return (
    <div className="grid gap-4">
      <div className="card grid gap-3 p-5">
        <label className="label" htmlFor="file">JSON file</label>
        <input id="file" type="file" accept="application/json,.json" className="text-sm" onChange={(e) => onFile(e.target.files?.[0])} />
        <label className="label mt-2" htmlFor="json">…or paste JSON</label>
        <textarea
          id="json"
          rows={10}
          className="input font-mono text-xs"
          value={text}
          onChange={(e) => {
            setServerError(undefined);
            setText(e.target.value);
          }}
          placeholder='{ "title": "…", "units": [ … ] }'
          spellCheck={false}
        />
      </div>

      {parsed && !parsed.ok && (
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          <p className="font-medium">This JSON isn&apos;t a valid course:</p>
          <ul className="mt-2 list-disc pl-5">
            {parsed.errors.slice(0, 20).map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {course && (
        <div className="card overflow-hidden">
          <div className="h-1.5" style={{ background: course.color ?? "var(--accent)" }} />
          <div className="grid gap-3 p-5">
            <div>
              <p className="text-xs font-medium tracking-wider text-muted uppercase">Preview</p>
              <h2 className="font-serif text-xl font-semibold">{course.title}</h2>
              <p className="text-sm text-muted">
                {course.units.length} units · {itemCount} items
                {minutes > 0 && <> · ~{formatMinutes(minutes)}</>}
                {course.start_date && <> · {course.start_date} → {course.end_date ?? "…"}</>}
              </p>
              {course.schedule.length > 0 && (
                <p className="text-sm text-muted">
                  🗓{" "}
                  {summarizeSchedule(
                    course.schedule.map((m) => ({ weekday: dayKeyToNumber(m.day), start_time: m.start ?? null, end_time: m.end ?? null })),
                  )}
                </p>
              )}
            </div>
            <ol className="grid gap-1 text-sm">
              {course.units.map((u, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="truncate">
                    {i + 1}. {u.title}
                  </span>
                  <span className="shrink-0 text-muted">
                    {u.items.length} items{u.due_date && <> · due {u.due_date}</>}
                  </span>
                </li>
              ))}
            </ol>
            {serverError && <p className="text-sm whitespace-pre-line text-danger">{serverError}</p>}
            <div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await importCourse(text);
                    if (res?.error) setServerError(res.error);
                  })
                }
              >
                {pending ? "Importing…" : "Import course"}
              </button>
            </div>
          </div>
        </div>
      )}
      {!course && serverError && <p className="text-sm text-danger">{serverError}</p>}
    </div>
  );
}
