# Curriculum planner

A Next.js 15 (App Router) + Supabase app for planning self-study in a school format: courses → units → items (read/watch/do/other), with deadlines, per-user progress and shared courses.

## Layout
- `supabase/migrations/`: schema, RLS policies and RPCs (`import_course`, `redeem_invite`, `invite_info`). Permissions are enforced here, not in the app.
- `src/app/actions/`: server actions (all mutations).
- `src/lib/queries.ts`: `getCourses()` loads courses + units + items + the current user's progress in one query.
- `src/lib/schema/course-json.ts`: zod schema for the course JSON format and the form field rules.
- `src/lib/dates.ts`, `src/lib/progress.ts`: pure logic, unit-tested in `src/lib/__tests__/`.

## Commands
`npm run dev` · `npm test` · `npm run lint` · `npm run typecheck` · `npm run build` · `npm run rls-check` (needs a Supabase project) · `npm run db:push`

## Generating a curriculum when the user asks for one
1. Ask for any missing basics: topic, current level, start date, weeks available, hours per week, preferred formats.
2. Write `curricula/<slug>.json` following `docs/course-format.md`. Use `curricula/example-linear-algebra.json` as a model.
   - Use 1 unit per week (or per milestone) with `start_date` and `due_date`. Space the dates evenly from the start date.
   - Make each unit a mix of kinds, with a realistic `est_minutes` for each item. Keep each week's total near the user's weekly hours.
   - Use only real, well-known resources with stable URLs, such as official docs, OCW/university courses, established YouTube channels and free books. Never invent URLs. If unsure about a URL, leave it out and name the resource in `title`/`notes`.
   - Include at least one "do" item per unit: exercises, a project step, or a self-explanation.
3. Run `npm run validate -- curricula/<slug>.json` and fix any errors.
4. Tell the user to import the file on the Import page, or run `npm run import -- curricula/<slug>.json --owner <their email>` if `.env.local` has the service role key.

To revise an existing course, ask the user for its exported JSON (Settings → Download JSON), edit it, then validate it.
