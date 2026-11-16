"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";
import type { ActionResult } from "@/lib/types";

export type FormAction = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

/**
 * useActionState wired through onSubmit instead of the `action` prop.
 * React 19 resets uncontrolled forms after every `action` submission, which wipes the user's
 * input when validation fails. Here the form is only reset (and onDone called) on success.
 */
export function useForm(action: FormAction, { reset, onDone }: { reset: boolean; onDone?: () => void }) {
  const [state, dispatch, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      if (reset) ref.current?.reset();
      onDone?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  }

  return { state, pending, formProps: { ref, onSubmit } };
}
