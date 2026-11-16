import { requireUser } from "@/lib/supabase/server";
import { NewPasswordForm } from "./NewPasswordForm";

/** Reached from the password-reset email (via /auth/confirm, which signs the user in first). */
export default async function ResetPasswordPage() {
  const { user } = await requireUser();
  return (
    <div className="mx-auto mt-10 grid max-w-sm gap-6">
      <div className="text-center">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="mt-2 text-sm text-muted">For {user.email}</p>
      </div>
      <div className="card p-6">
        <NewPasswordForm />
      </div>
    </div>
  );
}
