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
    <div className="mx-auto mt-10 grid max-w-sm gap-6">
      <div className="text-center">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Your self-study term</h1>
        <p className="mt-2 text-sm text-muted">Courses, units, resources and deadlines for whatever you want to learn next.</p>
      </div>
      {error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <LoginForm next={next ?? ""} />
    </div>
  );
}
