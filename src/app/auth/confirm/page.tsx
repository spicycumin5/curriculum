import { redirect } from "next/navigation";
import { confirmEmail } from "@/app/actions/auth";
import { SubmitButton } from "@/components/ui";
import { HashSession } from "./HashSession";

const OTP_TYPES = ["email", "signup", "recovery", "invite", "magiclink", "email_change"] as const;

function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/dashboard";
}

/**
 * Where confirmation emails land. Handles three link shapes:
 *  - #access_token=… (implicit flow, the default for our sign-up): finished in the browser by <HashSession>.
 *  - ?code=… (PKCE): forwarded to /auth/callback.
 *  - ?token_hash=…&type=… (custom email template): verified on a button press, so link scanners can't burn it.
 */
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string; code?: string }>;
}) {
  const { token_hash, type, next: rawNext, code } = await searchParams;
  const next = safeNext(rawNext);
  if (code && !token_hash) {
    redirect(`/auth/callback?${new URLSearchParams({ code, next })}`);
  }
  const otp = !!token_hash && OTP_TYPES.includes((type ?? "") as (typeof OTP_TYPES)[number]);

  return (
    <div className="mx-auto mt-10 max-w-sm">
      <div className="card grid gap-4 p-6 text-center">
        {otp ? (
          <>
            <h1 className="font-serif text-2xl font-semibold">Confirm your email</h1>
            <p className="text-sm text-muted">One click and you&apos;re in.</p>
            <form action={confirmEmail} className="grid">
              <input type="hidden" name="token_hash" value={token_hash} />
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="next" value={next} />
              <SubmitButton className="btn btn-primary py-2">Confirm and sign in</SubmitButton>
            </form>
          </>
        ) : (
          <HashSession next={next} />
        )}
      </div>
    </div>
  );
}
