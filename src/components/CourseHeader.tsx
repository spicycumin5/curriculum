import Link from "next/link";
import { formatRange } from "@/lib/dates";
import { summarizeSchedule } from "@/lib/schedule";
import type { CourseWithContent } from "@/lib/types";
import { RoleBadge } from "./badges";
import { CourseBanner } from "./CourseBanner";

/** Course banner + tab bar shared by the course's Modules and People & settings pages. */
export function CourseHeader({ course, tab }: { course: CourseWithContent; tab: "modules" | "settings" }) {
  const range = formatRange(course.start_date, course.end_date);
  const schedule = summarizeSchedule(course.meetings);
  const tabs = [
    { key: "modules", label: "Modules", href: `/courses/${course.id}` },
    { key: "settings", label: course.role === "owner" ? "People & settings" : "People & info", href: `/courses/${course.id}/settings` },
  ] as const;

  return (
    <header className="grid gap-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/dashboard" className="hover:underline">Dashboard</Link>
        <span aria-hidden className="mx-1.5">/</span>
        <span className="text-ink" aria-current="page">{course.title}</span>
      </nav>
      <CourseBanner id={course.id} title={course.title} color={course.color} size="page">
        <h1 className="mt-1 font-serif text-3xl leading-tight font-bold break-words sm:text-4xl">{course.title}</h1>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm opacity-90">
          {schedule && <span>{schedule}</span>}
          {range && <span>{range}</span>}
        </div>
      </CourseBanner>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line">
        <ul className="flex gap-1" role="list">
          {tabs.map((t) => (
            <li key={t.key}>
              <Link
                href={t.href}
                aria-current={tab === t.key ? "page" : undefined}
                className={`-mb-px inline-block border-b-[3px] px-3 pb-2 text-sm font-semibold ${
                  tab === t.key ? "border-highlight text-ink" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="pb-2">
          <RoleBadge role={course.role} />
        </div>
      </div>
    </header>
  );
}
