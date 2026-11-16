import { dueStatus, formatDate, relativeDue, type DueStatus } from "@/lib/dates";
import type { ItemKind, Role } from "@/lib/types";
import { KindIcon } from "./icons";

const KIND_LABEL: Record<ItemKind, string> = { read: "Reading", watch: "Video", do: "Assignment", other: "Resource" };
const KIND_TONE: Record<ItemKind, string> = {
  read: "text-[#2f6f9f] dark:text-[#8cc1e6]",
  watch: "text-[#9b3d8a] dark:text-[#e29ad5]",
  do: "text-[#a2560e] dark:text-[#f0b06a]",
  other: "text-muted",
};

/** Icon for an item's type, with an accessible label. */
export function KindBadge({ kind, withLabel = false }: { kind: ItemKind; withLabel?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${KIND_TONE[kind]}`} title={KIND_LABEL[kind]}>
      <KindIcon kind={kind} className="size-[18px]" />
      {withLabel ? KIND_LABEL[kind] : <span className="sr-only">{KIND_LABEL[kind]}</span>}
    </span>
  );
}

export function kindLabel(kind: ItemKind) {
  return KIND_LABEL[kind];
}

const ROLE_LABEL: Record<Role, string> = { owner: "Owner", editor: "Editor", viewer: "Student" };

export function RoleBadge({ role }: { role: Role }) {
  return <span className="chip">{ROLE_LABEL[role]}</span>;
}

export const STATUS_CLASS: Record<DueStatus, string> = {
  done: "text-ok",
  overdue: "text-danger font-semibold",
  today: "today-mark font-semibold",
  soon: "text-warn",
  later: "text-muted",
  none: "text-muted",
};

export function DueLabel({ due, done, today }: { due: string | null; done: boolean; today: string }) {
  if (!due) return null;
  const status = dueStatus(due, done, today);
  return (
    <span className={STATUS_CLASS[status]} title={formatDate(due, "EEEE, MMMM d, yyyy")}>
      {done ? `Due ${formatDate(due)}` : status === "later" ? `Due ${formatDate(due)}` : relativeDue(due, today)}
    </span>
  );
}

export function formatMinutes(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}
