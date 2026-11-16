import "server-only";
import { cookies } from "next/headers";
import { todayISO } from "./dates";

/** "Today" in the viewer's time zone (set by <TimeZoneCookie />), UTC until known. */
export async function getToday(): Promise<string> {
  const tz = (await cookies()).get("tz")?.value;
  return todayISO(tz ? decodeURIComponent(tz) : undefined);
}
