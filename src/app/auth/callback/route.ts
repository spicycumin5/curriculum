import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Handles email confirmation links (PKCE `code` or `token_hash`). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const nextParam = searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  const supabase = await createClient();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  let error: string | undefined;
  if (code) {
    error = (await supabase.auth.exchangeCodeForSession(code)).error?.message;
  } else if (tokenHash && type) {
    error = (await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error?.message;
  } else {
    error = "Missing confirmation code.";
  }

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
