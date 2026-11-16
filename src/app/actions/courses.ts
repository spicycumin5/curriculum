"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/supabase/server";
import { courseJson, formatIssues, itemJson, parseCourseJson, unitJson } from "@/lib/schema/course-json";
import type { ActionResult, Role } from "@/lib/types";

// ------------------------------------------------------------------ helpers

function field(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function numField(fd: FormData, key: string): number | null {
  const v = field(fd, key);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function fail(issues: string[]): ActionResult {
  return { error: issues.join("\n") };
}

const NOT_ALLOWED = "That change isn't allowed (you may not have edit access).";

function refresh() {
  revalidatePath("/", "layout");
}

function courseFields(fd: FormData) {
  return courseJson.safeParse({
    title: field(fd, "title") ?? "",
    description: field(fd, "description"),
    color: field(fd, "color"),
    start_date: field(fd, "start_date"),
    end_date: field(fd, "end_date"),
  });
}

function unitFields(fd: FormData) {
  return unitJson.safeParse({
    title: field(fd, "title") ?? "",
    description: field(fd, "description"),
    start_date: field(fd, "start_date"),
    due_date: field(fd, "due_date"),
  });
}

function itemFields(fd: FormData) {
  return itemJson.safeParse({
    title: field(fd, "title") ?? "",
    kind: field(fd, "kind") ?? "read",
    url: field(fd, "url"),
    notes: field(fd, "notes"),
    est_minutes: numField(fd, "est_minutes"),
    due_date: field(fd, "due_date"),
  });
}

/** Rewrite positions 0..n after moving one row up/down among its siblings. */
async function reorder(
  supabase: SupabaseClient,
  table: "units" | "items",
  parentCol: "course_id" | "unit_id",
  id: string,
  dir: -1 | 1,
) {
  const { data: row } = await supabase.from(table).select(parentCol).eq("id", id).single();
  if (!row) return { error: NOT_ALLOWED };
  const parentId = (row as Record<string, string>)[parentCol];
  const { data: siblings } = await supabase
    .from(table)
    .select("id, position")
    .eq(parentCol, parentId)
    .order("position")
    .order("created_at");
  const list = siblings ?? [];
  const idx = list.findIndex((s) => s.id === id);
  const target = idx + dir;
  if (idx < 0 || target < 0 || target >= list.length) return {};
  [list[idx], list[target]] = [list[target], list[idx]];
  for (let p = 0; p < list.length; p++) {
    if (list[p].position === p) continue;
    const { data, error } = await supabase.from(table).update({ position: p }).eq("id", list[p].id).select("id");
    if (error) return { error: error.message };
    if (!data?.length) return { error: NOT_ALLOWED };
  }
  return {};
}

// ------------------------------------------------------------------ courses

export async function createCourse(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const parsed = courseFields(fd);
  if (!parsed.success) return fail(formatIssues(parsed.error));
  const { supabase, user } = await requireUser();
  const { units: _units, version: _v, ...values } = parsed.data;
  const { data, error } = await supabase
    .from("courses")
    .insert({ ...values, color: values.color ?? undefined, owner_id: user.id })
    .select("id")
    .single();
  if (error) return { error: error.message };
  refresh();
  redirect(`/courses/${data.id}?edit=1`);
}

export async function updateCourse(courseId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const parsed = courseFields(fd);
  if (!parsed.success) return fail(formatIssues(parsed.error));
  const { supabase } = await requireUser();
  const { units: _units, version: _v, ...values } = parsed.data;
  const { data, error } = await supabase
    .from("courses")
    .update({ ...values, color: values.color ?? "#4f46e5" })
    .eq("id", courseId)
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: NOT_ALLOWED };
  refresh();
  return { ok: true };
}

export async function deleteCourse(courseId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("courses").delete().eq("id", courseId).select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Only the course owner can delete it." };
  refresh();
  redirect("/dashboard");
}

export async function importCourse(text: string): Promise<ActionResult> {
  const parsed = parseCourseJson(text);
  if (!parsed.ok) return fail(parsed.errors);
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("import_course", { payload: parsed.data });
  if (error) return { error: error.message };
  refresh();
  redirect(`/courses/${data}`);
}

// ------------------------------------------------------------------ units

export async function addUnit(courseId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const parsed = unitFields(fd);
  if (!parsed.success) return fail(formatIssues(parsed.error));
  const { supabase } = await requireUser();
  const { count } = await supabase.from("units").select("id", { count: "exact", head: true }).eq("course_id", courseId);
  const { items: _items, ...values } = parsed.data;
  const { error } = await supabase.from("units").insert({ ...values, course_id: courseId, position: count ?? 0 });
  if (error) return { error: error.message.includes("row-level security") ? NOT_ALLOWED : error.message };
  refresh();
  return { ok: true };
}

export async function updateUnit(unitId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const parsed = unitFields(fd);
  if (!parsed.success) return fail(formatIssues(parsed.error));
  const { supabase } = await requireUser();
  const { items: _items, ...values } = parsed.data;
  const { data, error } = await supabase
    .from("units")
    .update({ title: values.title, description: values.description ?? null, start_date: values.start_date ?? null, due_date: values.due_date ?? null })
    .eq("id", unitId)
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: NOT_ALLOWED };
  refresh();
  return { ok: true };
}

export async function deleteUnit(unitId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("units").delete().eq("id", unitId).select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: NOT_ALLOWED };
  refresh();
  return { ok: true };
}

export async function moveUnit(unitId: string, dir: -1 | 1): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const res = await reorder(supabase, "units", "course_id", unitId, dir);
  refresh();
  return res;
}

// ------------------------------------------------------------------ items

export async function addItem(unitId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const parsed = itemFields(fd);
  if (!parsed.success) return fail(formatIssues(parsed.error));
  const { supabase } = await requireUser();
  const { count } = await supabase.from("items").select("id", { count: "exact", head: true }).eq("unit_id", unitId);
  const { error } = await supabase.from("items").insert({ ...parsed.data, unit_id: unitId, position: count ?? 0 });
  if (error) return { error: error.message.includes("row-level security") ? NOT_ALLOWED : error.message };
  refresh();
  return { ok: true };
}

export async function updateItem(itemId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const parsed = itemFields(fd);
  if (!parsed.success) return fail(formatIssues(parsed.error));
  const { supabase } = await requireUser();
  const v = parsed.data;
  const { data, error } = await supabase
    .from("items")
    .update({
      title: v.title,
      kind: v.kind,
      url: v.url ?? null,
      notes: v.notes ?? null,
      est_minutes: v.est_minutes ?? null,
      due_date: v.due_date ?? null,
    })
    .eq("id", itemId)
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: NOT_ALLOWED };
  refresh();
  return { ok: true };
}

export async function deleteItem(itemId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("items").delete().eq("id", itemId).select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: NOT_ALLOWED };
  refresh();
  return { ok: true };
}

export async function moveItem(itemId: string, dir: -1 | 1): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const res = await reorder(supabase, "items", "unit_id", itemId, dir);
  refresh();
  return res;
}

// ------------------------------------------------------------------ progress

export async function toggleItem(itemId: string, done: boolean): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const { error } = done
    ? await supabase
        .from("item_progress")
        .upsert({ item_id: itemId, user_id: user.id }, { onConflict: "item_id,user_id", ignoreDuplicates: true })
    : await supabase.from("item_progress").delete().eq("item_id", itemId).eq("user_id", user.id);
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}

// ------------------------------------------------------------------ sharing

export async function createInvite(courseId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const role = field(fd, "role");
  if (role !== "viewer" && role !== "editor") return { error: "Pick a role." };
  const days = Math.min(Math.max(numField(fd, "days") ?? 14, 1), 90);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("course_invites").insert({
    course_id: courseId,
    role,
    expires_at: new Date(Date.now() + days * 86_400_000).toISOString(),
  });
  if (error) return { error: error.message.includes("row-level security") ? "Only the owner can invite." : error.message };
  refresh();
  return { ok: true };
}

export async function deleteInvite(code: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("course_invites").delete().eq("code", code);
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}

export async function setMemberRole(courseId: string, userId: string, role: Role): Promise<ActionResult> {
  if (role !== "viewer" && role !== "editor") return { error: "Invalid role." };
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("course_members")
    .update({ role })
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .select("user_id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: NOT_ALLOWED };
  refresh();
  return { ok: true };
}

export async function removeMember(courseId: string, userId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("course_members")
    .delete()
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .select("user_id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: NOT_ALLOWED };
  refresh();
  if (userId === user.id) redirect("/dashboard");
  return { ok: true };
}

export async function redeemInvite(code: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("redeem_invite", { p_code: code });
  if (error) return { error: error.message };
  refresh();
  redirect(`/courses/${data}`);
}
