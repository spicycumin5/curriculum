"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Stores the browser's time zone in a cookie so server-rendered "today"/overdue logic is local. */
export function TimeZoneCookie() {
  const router = useRouter();
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;
    const current = document.cookie.match(/(?:^|; )tz=([^;]*)/)?.[1];
    if (current && decodeURIComponent(current) === tz) return;
    document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);
  return null;
}
