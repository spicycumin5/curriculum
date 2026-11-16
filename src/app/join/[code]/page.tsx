import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { JoinButton } from "./JoinButton";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { supabase } = await requireUser();
  const { data } = await supabase.rpc("invite_info", { p_code: code });
  const invite = (data as { course_id: string; course_title: string; role: string; expired: boolean }[] | null)?.[0];

  return (
    <div className="mx-auto mt-10 max-w-md">
      <div className="card grid gap-4 p-6 text-center">
        {!invite || invite.expired ? (
          <>
            <h1 className="font-serif text-2xl font-semibold">Invite not valid</h1>
            <p className="text-sm text-muted">This link is invalid or has expired. Ask the course owner for a new one.</p>
            <Link href="/dashboard" className="btn mx-auto">Go to dashboard</Link>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">You&apos;re invited to enroll in</p>
            <h1 className="font-serif text-2xl font-semibold break-words">{invite.course_title}</h1>
            <p className="text-sm text-muted">
              as {invite.role === "editor" ? "an " : "a "}
              <span className="font-semibold text-ink">{invite.role === "editor" ? "editor" : "student"}</span>
              {invite.role === "editor" ? ", who can change the modules." : ", who follows along and tracks their own progress."}
            </p>
            <JoinButton code={code} />
          </>
        )}
      </div>
    </div>
  );
}
