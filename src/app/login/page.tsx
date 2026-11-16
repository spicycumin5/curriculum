import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");

  return (
    <div className="mx-auto grid max-w-4xl overflow-hidden rounded-[14px] border border-line bg-surface md:mt-8 md:grid-cols-[1.05fr_1fr]">
      <div className="notebook flex flex-col justify-between gap-10 p-8 pl-14 text-white" style={{ "--c": "#1e2a4a" } as React.CSSProperties}>
        <p className="font-serif text-xl font-bold">Curriculum</p>
        <div>
          <h1 className="font-serif text-4xl leading-tight font-bold">Your own school, for whatever you want to learn next.</h1>
          <ul className="mt-6 grid gap-2 text-white/85">
            <li>Courses split into weekly modules of readings, videos and assignments</li>
            <li>Class days on a timetable, so you know what to study today</li>
            <li>Deadlines, progress, and courses shared with a study group</li>
          </ul>
        </div>
      </div>
      <div className="grid content-center gap-4 p-6 sm:p-8">
        {error && (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <LoginForm next={next ?? ""} />
      </div>
    </div>
  );
}
