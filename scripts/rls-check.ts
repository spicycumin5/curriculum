/**
 * End-to-end permission check against a real Supabase project (local or cloud).
 * Creates two throwaway users, exercises sharing + progress through RLS, then deletes them.
 *
 *   npm run rls-check
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or ANON) and
 * SUPABASE_SERVICE_ROLE_KEY in .env.local, and the migration applied.
 */
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !anon || !service) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, service, opts);
let failures = 0;

function check(name: string, cond: boolean, detail?: unknown) {
  console.log(`${cond ? "✓" : "✗"} ${name}`);
  if (!cond) {
    failures++;
    if (detail !== undefined) console.log("   ", detail);
  }
}

async function makeUser(label: string) {
  const email = `rls-${label}-${randomUUID().slice(0, 8)}@example.test`;
  const password = randomUUID();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const client = createClient(url, anon, opts);
  const { error: e2 } = await client.auth.signInWithPassword({ email, password });
  if (e2) throw e2;
  return { id: data.user.id, client };
}

async function main() {
  const a = await makeUser("a");
  const b = await makeUser("b");
  try {
    await run(a, b);
  } finally {
    await admin.auth.admin.deleteUser(a.id);
    await admin.auth.admin.deleteUser(b.id);
  }
  console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
}

async function run(a: { id: string; client: SupabaseClient }, b: { id: string; client: SupabaseClient }) {
  const anonClient = createClient(url, anon, opts);

  // A imports a course
  const { data: courseId, error: impErr } = await a.client.rpc("import_course", {
    payload: {
      title: "RLS test",
      units: [{ title: "U1", due_date: "2030-01-01", items: [{ title: "I1", kind: "read" }, { title: "I2", kind: "do" }] }],
    },
  });
  check("owner can import a course", !impErr && typeof courseId === "string", impErr);
  const { data: items } = await a.client.from("items").select("id, unit_id").order("position");
  check("owner sees imported items", items?.length === 2, items);
  const [i1, i2] = items ?? [];

  // Anonymous + outsider
  const { data: anonCourses } = await anonClient.from("courses").select("id");
  check("anonymous sees no courses", (anonCourses ?? []).length === 0);
  const { error: anonImp } = await anonClient.rpc("import_course", { payload: { title: "x" }, p_owner: a.id });
  check("anonymous cannot call import_course", !!anonImp);
  const { data: bBefore } = await b.client.from("courses").select("id").eq("id", courseId);
  check("non-member cannot see course", (bBefore ?? []).length === 0);
  const { error: bUnitErr } = await b.client.from("units").insert({ course_id: courseId, title: "hack" });
  check("non-member cannot add units", !!bUnitErr);
  const { error: bProgErr } = await b.client.from("item_progress").insert({ item_id: i1.id, user_id: b.id });
  check("non-member cannot record progress", !!bProgErr);
  const { error: bMemberErr } = await b.client.from("course_members").insert({ course_id: courseId, user_id: b.id, role: "owner" });
  check("non-member cannot add themselves as member", !!bMemberErr);
  const { error: bInvErr } = await b.client.from("course_invites").insert({ course_id: courseId, role: "editor" });
  check("non-member cannot create invites", !!bInvErr);

  // Invite B as viewer
  const { data: inv, error: invErr } = await a.client.from("course_invites").insert({ course_id: courseId, role: "viewer" }).select("code").single();
  check("owner can create invite", !invErr && !!inv, invErr);
  const { data: info } = await b.client.rpc("invite_info", { p_code: inv!.code });
  check("invite_info shows course title", info?.[0]?.course_title === "RLS test", info);
  const { error: redeemErr } = await b.client.rpc("redeem_invite", { p_code: inv!.code });
  check("B can redeem invite", !redeemErr, redeemErr);
  const { error: badRedeem } = await b.client.rpc("redeem_invite", { p_code: "nope" });
  check("bogus invite code is rejected", !!badRedeem);

  // Viewer permissions
  const { data: bCourse } = await b.client.from("courses").select("id").eq("id", courseId);
  check("viewer can see course", bCourse?.length === 1);
  const { data: upd } = await b.client.from("units").update({ title: "changed" }).eq("id", i1.unit_id).select("id");
  check("viewer cannot edit units", (upd ?? []).length === 0);
  const { data: invList } = await b.client.from("course_invites").select("code").eq("course_id", courseId);
  check("viewer cannot list invites", (invList ?? []).length === 0);
  const { data: selfPromote } = await b.client.from("course_members").update({ role: "editor" }).eq("course_id", courseId).eq("user_id", b.id).select("user_id");
  check("viewer cannot promote themselves", (selfPromote ?? []).length === 0);

  // Separate progress
  await a.client.from("item_progress").insert({ item_id: i1.id, user_id: a.id });
  const { error: bp } = await b.client.from("item_progress").insert({ item_id: i2.id, user_id: b.id });
  check("viewer can record own progress", !bp, bp);
  const { error: forge } = await b.client.from("item_progress").insert({ item_id: i2.id, user_id: a.id });
  check("cannot record progress for someone else", !!forge);
  const { data: aProg } = await a.client.from("item_progress").select("item_id");
  const { data: bProg } = await b.client.from("item_progress").select("item_id");
  check("progress is per user (A)", aProg?.length === 1 && aProg[0].item_id === i1.id, aProg);
  check("progress is per user (B)", bProg?.length === 1 && bProg[0].item_id === i2.id, bProg);

  // Profiles visible to co-members
  const { data: profiles } = await b.client.from("profiles").select("id");
  check("co-member profiles are visible", (profiles ?? []).some((p) => p.id === a.id));

  // Promote B to editor; editor can edit but not delete course or remove owner
  const { data: promo } = await a.client.from("course_members").update({ role: "editor" }).eq("course_id", courseId).eq("user_id", b.id).select("user_id");
  check("owner can promote member", promo?.length === 1);
  const { data: edited } = await b.client.from("units").update({ title: "edited by B" }).eq("id", i1.unit_id).select("id");
  check("editor can edit units", edited?.length === 1);
  const { data: ownerChange } = await b.client.from("courses").update({ owner_id: b.id, title: "B owns?" }).eq("id", courseId).select("owner_id");
  check("owner_id cannot be changed by update", ownerChange?.[0]?.owner_id === a.id, ownerChange);
  const { data: del } = await b.client.from("courses").delete().eq("id", courseId).select("id");
  check("editor cannot delete course", (del ?? []).length === 0);
  const { data: kick } = await b.client.from("course_members").delete().eq("course_id", courseId).eq("user_id", a.id).select("user_id");
  check("editor cannot remove owner", (kick ?? []).length === 0);

  // B leaves; loses access
  const { data: leave } = await b.client.from("course_members").delete().eq("course_id", courseId).eq("user_id", b.id).select("user_id");
  check("member can leave", leave?.length === 1);
  const { data: after } = await b.client.from("courses").select("id").eq("id", courseId);
  check("after leaving, course is hidden", (after ?? []).length === 0);

  // Owner deletes
  const { data: gone } = await a.client.from("courses").delete().eq("id", courseId).select("id");
  check("owner can delete course", gone?.length === 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
