import { dueStatus, formatDate, relativeDue, type DueStatus } from "@/lib/dates";
import type { ItemKind, Role } from "@/lib/types";

const KIND_LABEL: Record<ItemKind, string> = { read: "Read", watch: "Watch", do: "Do", other: "Other" };
const KIND_ICON: Record<ItemKind, string> = { read: "📖", watch: "▶", do: "✎", other: "•" };

export function KindBadge({ kind }: { kind: ItemKind }) {
  return (
    <span className="chip shrink-0 px-1.5 py-0 text-[11px]" title={KIND_LABEL[kind]}>
      <span aria-hidden>{KIND_ICON[kind]}</span>
      {KIND_LABEL[kind]}
    </span>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  return <span className="chip capitalize">{role}</span>;
}

export const STATUS_CLASS: Record<DueStatus, string> = {
  done: "text-ok",
  overdue: "text-danger font-medium",
  today: "text-warn font-medium",
  soon: "text-warn",
  later: "text-muted",
  none: "text-muted",
};

export function DueLabel({ due, done, today }: { due: string | null; done: boolean; today: string }) {
  if (!due) return null;
  const status = dueStatus(due, done, today);
  return (
    <span className={STATUS_CLASS[status]} title={formatDate(due, "EEEE, MMMM d, yyyy")}>
      {formatDate(due)}
      {!done && <> · {relativeDue(due, today)}</>}
    </span>
  );
}

export function formatMinutes(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}
