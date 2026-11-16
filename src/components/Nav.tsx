import { signOut } from "@/app/actions/auth";
import { initials } from "@/lib/course-style";
import { createClient } from "@/lib/supabase/server";
import { IconLogout } from "./icons";
import { RailLinks } from "./RailLinks";

/** Canvas-style global navigation: a navy rail on desktop, a bottom tab bar on phones. */
export async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const name = (user.user_metadata?.display_name as string | undefined) || user.email || "You";

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-y-0 left-0 z-30 hidden w-[84px] flex-col items-center bg-rail py-4 text-rail-ink md:flex"
      >
        <span
          className="mb-5 grid size-11 place-items-center rounded-full bg-highlight font-serif text-lg font-bold text-highlight-ink"
          title={`${name} (${user.email})`}
          aria-label={`Signed in as ${user.email}`}
        >
          {initials(name)}
        </span>
        <RailLinks variant="rail" />
        <form action={signOut} className="mt-auto">
          <button className="flex w-[76px] flex-col items-center gap-1 rounded-md py-2 text-[11px] font-semibold hover:bg-rail-hover hover:text-white">
            <IconLogout className="size-6" />
            Sign out
          </button>
        </form>
      </nav>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-white/10 bg-rail px-1 pb-[env(safe-area-inset-bottom)] text-rail-ink md:hidden"
      >
        <RailLinks variant="bar" />
      </nav>
    </>
  );
}
