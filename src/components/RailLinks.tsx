"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconCalendar, IconDashboard, IconImport, IconPlus, IconWeek } from "./icons";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", Icon: IconDashboard, match: (p: string) => p === "/dashboard" || p.startsWith("/courses/") && !p.startsWith("/courses/new") && !p.startsWith("/courses/import") },
  { href: "/week", label: "Week", Icon: IconWeek, match: (p: string) => p.startsWith("/week") },
  { href: "/calendar", label: "Calendar", Icon: IconCalendar, match: (p: string) => p.startsWith("/calendar") },
  { href: "/courses/new", label: "New course", Icon: IconPlus, match: (p: string) => p.startsWith("/courses/new") },
  { href: "/courses/import", label: "Import", Icon: IconImport, match: (p: string) => p.startsWith("/courses/import") },
];

export function RailLinks({ variant }: { variant: "rail" | "bar" }) {
  const path = usePathname() ?? "";
  return (
    <ul className={variant === "rail" ? "grid gap-1" : "flex w-full justify-around"}>
      {LINKS.map(({ href, label, Icon, match }) => {
        const active = match(path);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                variant === "rail"
                  ? `relative flex w-[76px] flex-col items-center gap-1 rounded-md py-2 text-[11px] font-semibold transition-colors ${
                      active ? "bg-surface text-ink" : "hover:bg-rail-hover hover:text-white"
                    }`
                  : `flex flex-col items-center gap-0.5 px-2 py-2 text-[10px] font-semibold ${active ? "text-highlight" : ""}`
              }
            >
              {variant === "rail" && active && <span className="absolute inset-y-2 left-0 w-1 rounded-r bg-highlight" aria-hidden />}
              <Icon className={variant === "rail" ? "size-6" : "size-5"} />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
