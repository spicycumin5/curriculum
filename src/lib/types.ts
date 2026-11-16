export type Role = "viewer" | "editor" | "owner";
export type ItemKind = "read" | "watch" | "do" | "other";

export const ITEM_KINDS: ItemKind[] = ["read", "watch", "do", "other"];
export const ROLE_RANK: Record<Role, number> = { viewer: 1, editor: 2, owner: 3 };

export interface Course {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  color: string;
  start_date: string | null; // YYYY-MM-DD
  end_date: string | null;
  created_at: string;
}

export interface Unit {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  position: number;
  start_date: string | null;
  due_date: string | null;
}

export interface Item {
  id: string;
  unit_id: string;
  title: string;
  kind: ItemKind;
  url: string | null;
  notes: string | null;
  est_minutes: number | null;
  due_date: string | null;
  position: number;
}

export interface UnitWithItems extends Unit {
  items: Item[];
}

export interface CourseWithContent extends Course {
  role: Role;
  units: UnitWithItems[];
}

export type ActionResult = { error?: string; ok?: boolean } | undefined;
