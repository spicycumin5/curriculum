/**
 * Validate and/or import a course JSON file.
 *
 *   npm run validate -- curricula/linear-algebra.json
 *   npm run import -- curricula/linear-algebra.json --owner you@example.com
 *
 * Import needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { parseCourseJson } from "../src/lib/schema/course-json";

config({ path: ".env.local", quiet: true });

function usage(msg?: string): never {
  if (msg) console.error(`Error: ${msg}\n`);
  console.error("Usage: tsx scripts/import-course.ts <file.json> [--owner <email>] [--validate]");
  process.exit(1);
}

async function findUserId(admin: SupabaseClient, email: string): Promise<string> {
  const target = email.toLowerCase();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === target);
    if (hit) return hit.id;
    if (data.users.length < 200) break;
  }
  throw new Error(`No user with email ${email}. Sign up in the app first.`);
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--owner");
  const ownerIdx = args.indexOf("--owner");
  const owner = ownerIdx >= 0 ? args[ownerIdx + 1] : undefined;
  const validateOnly = args.includes("--validate");
  if (!file) usage("missing file");

  const parsed = parseCourseJson(readFileSync(file, "utf8"));
  if (!parsed.ok) {
    console.error(`✗ ${file} is not a valid course:`);
    parsed.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  const c = parsed.data;
  const items = c.units.reduce((s, u) => s + u.items.length, 0);
  console.log(`✓ ${file}: "${c.title}" — ${c.units.length} units, ${items} items`);
  if (validateOnly) return;

  if (!owner) usage("--owner <email> is required to import");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) usage("set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const ownerId = await findUserId(admin, owner);
  const { data, error } = await admin.rpc("import_course", { payload: c, p_owner: ownerId });
  if (error) throw error;
  console.log(`✓ Imported as course ${data}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
