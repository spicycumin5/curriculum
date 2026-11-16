import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";

export async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-line bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href={user ? "/dashboard" : "/login"} className="font-serif text-xl font-semibold tracking-tight">
          Curriculum
        </Link>
        {user && (
          <>
            <nav className="flex flex-1 flex-wrap items-center gap-1 text-sm">
              <NavLink href="/dashboard">Dashboard</NavLink>
              <NavLink href="/week">Week</NavLink>
              <NavLink href="/calendar">Calendar</NavLink>
              <NavLink href="/courses/new">New course</NavLink>
              <NavLink href="/courses/import">Import</NavLink>
            </nav>
            <form action={signOut} className="flex items-center gap-3 text-sm text-muted">
              <span className="hidden max-w-48 truncate sm:inline">{user.email}</span>
              <button className="btn btn-sm">Sign out</button>
            </form>
          </>
        )}
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-md px-2.5 py-1.5 text-muted hover:bg-surface-2 hover:text-ink">
      {children}
    </Link>
  );
}
