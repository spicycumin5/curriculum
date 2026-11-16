import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCourse, removeMember, updateCourse } from "@/app/actions/courses";
import { RoleBadge } from "@/components/badges";
import { CourseForm } from "@/components/forms";
import { ConfirmButton } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { getCourses } from "@/lib/queries";
import { requireUser } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";
import { InviteManager, MemberRoleSelect } from "./SharingClient";

export default async function CourseSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, user } = await requireUser();

  const [{ courses }, membersRes, invitesRes] = await Promise.all([
    getCourses(supabase, user.id, id),
    supabase.from("course_members").select("user_id, role, joined_at").eq("course_id", id).order("joined_at"),
    supabase.from("course_invites").select("code, role, expires_at").eq("course_id", id).order("created_at", { ascending: false }),
  ]);
  const course = courses[0];
  if (!course) notFound();

  const members = (membersRes.data ?? []) as { user_id: string; role: Role; joined_at: string }[];
  const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", members.map((m) => m.user_id));
  const nameOf = new Map((profiles ?? []).map((p) => [p.id as string, p.display_name as string]));
  const isOwner = course.role === "owner";
  const canEdit = course.role !== "viewer";

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div>
        <Link href={`/courses/${id}`} className="text-sm text-muted hover:underline">← {course.title}</Link>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">{isOwner ? "Settings & sharing" : "Course info"}</h1>
      </div>

      {canEdit && (
        <section className="card p-5">
          <h2 className="mb-4 font-serif text-lg font-semibold">Details</h2>
          <CourseForm action={updateCourse.bind(null, id)} initial={course} submitLabel="Save details" />
        </section>
      )}

      <section className="card p-5">
        <h2 className="mb-1 font-serif text-lg font-semibold">Members</h2>
        <p className="mb-4 text-sm text-muted">Everyone sees the same units and resources; progress is tracked per person.</p>
        <ul className="divide-y divide-line">
          {members.map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div>
                <span className="font-medium">{nameOf.get(m.user_id) || "Member"}</span>
                {m.user_id === user.id && <span className="ml-1 text-sm text-muted">(you)</span>}
                <p className="text-xs text-muted">Joined {formatDate(m.joined_at.slice(0, 10), "MMM d, yyyy")}</p>
              </div>
              <div className="flex items-center gap-2">
                {isOwner && m.role !== "owner" ? (
                  <>
                    <MemberRoleSelect courseId={id} userId={m.user_id} role={m.role} />
                    <ConfirmButton action={removeMember.bind(null, id, m.user_id)} label="Remove" confirmLabel="Remove member?" />
                  </>
                ) : (
                  <RoleBadge role={m.role} />
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {isOwner && (
        <section className="card p-5">
          <h2 className="mb-1 font-serif text-lg font-semibold">Invite links</h2>
          <p className="mb-4 text-sm text-muted">
            Anyone signed in with the link can join. Editors can change units and resources; viewers can only track their own progress.
          </p>
          <InviteManager courseId={id} invites={(invitesRes.data ?? []) as { code: string; role: Role; expires_at: string }[]} />
        </section>
      )}

      <section className="card p-5">
        <h2 className="mb-1 font-serif text-lg font-semibold">Export</h2>
        <p className="mb-4 text-sm text-muted">
          Download this course as JSON to back it up, share it as a template, or hand it to Claude to revise. Progress is not included.
        </p>
        <a href={`/courses/${id}/export`} className="btn" download>
          Download JSON
        </a>
      </section>

      <section className="card border-danger/30 p-5">
        <h2 className="mb-3 font-serif text-lg font-semibold text-danger">{isOwner ? "Delete course" : "Leave course"}</h2>
        {isOwner ? (
          <ConfirmButton action={deleteCourse.bind(null, id)} label="Delete this course" confirmLabel="Delete for all members?" />
        ) : (
          <ConfirmButton action={removeMember.bind(null, id, user.id)} label="Leave this course" confirmLabel="Really leave?" />
        )}
      </section>
    </div>
  );
}
