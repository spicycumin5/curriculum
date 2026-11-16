"use client";

import { updatePassword } from "@/app/actions/auth";
import { FormError, SubmitButton } from "@/components/ui";
import { useForm } from "@/components/useForm";

export function NewPasswordForm() {
  const { state, pending, formProps } = useForm(updatePassword, { reset: false });
  return (
    <form {...formProps} className="grid gap-4">
      <div>
        <label className="label" htmlFor="password">New password</label>
        <input id="password" name="password" type="password" required minLength={8} className="input" autoComplete="new-password" />
      </div>
      <div>
        <label className="label" htmlFor="confirm">Repeat new password</label>
        <input id="confirm" name="confirm" type="password" required minLength={8} className="input" autoComplete="new-password" />
      </div>
      <FormError state={state} />
      <SubmitButton className="btn btn-primary w-full py-2" pending={pending}>Save password</SubmitButton>
    </form>
  );
}
