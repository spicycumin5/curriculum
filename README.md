# Curriculum

A school-style planner for self-study. Make **courses** and split them into **units**. Fill each unit with things to **read / watch / do**, with **deadlines**. You can share a course with friends, and each person tracks their own progress.

- **Class schedule:** give each course weekly class days and times (e.g. Mon/Wed 6–7 PM). Take as many courses at once as you like.
- **Dashboard:** today's classes, each with the next things to do for that course. Below that are your courses with progress bars, plus what's overdue and what's due in the next 7 days.
- **Week:** a school-style weekly timetable of your classes and deadlines.
- **Calendar:** a month view of every deadline, which you can filter by course. An agenda list sits below it.
- **Course page:** a checklist of each unit's resources. **Edit** mode lets you add, edit, reorder and delete units and items.
- **Sharing:** invite links that make someone a *viewer* (follows along) or an *editor* (can change the content).
- **Import/Export:** courses as JSON. Claude can write these for you (see below).

Stack: Next.js 15 · Supabase (Postgres, Auth, Row-Level Security) · Tailwind CSS · zod · date-fns.

## Setup

1. **Create a Supabase project** at supabase.com (the free tier is fine).
2. **Environment:** copy `.env.example` to `.env.local`. Fill in the project URL and publishable (anon) key from *Project Settings → API*. For the CLI import and RLS check, also add the service-role key.
3. **Database:** apply the schema in one of two ways:
   - CLI: `npx supabase login`, then `npx supabase link --project-ref <ref>`, then `npm run db:push`
   - or paste each file in `supabase/migrations/` (in order) into the dashboard's SQL editor and run it.
4. **Auth URLs:** in *Authentication → URL Configuration*, set Site URL to `http://localhost:3000`. Add `http://localhost:3000/**` (and later your Vercel URL + `/**`) to the Redirect URLs.
5. Run `npm install`, then `npm run dev`, then open http://localhost:3000.

Optional check: `npm run rls-check` creates two temporary users and verifies the sharing and permission rules against your database (about 30 checks). It then deletes the users.

> **Running Supabase locally instead:** start Docker Desktop, run `npx supabase start`, and use the URL and keys it prints.

## Getting Claude to build a course

In Claude Code, from this folder, ask something like:

> Build me a 6-week intro to Rust starting Jan 5, about 4 hours a week. I already know Python.

Claude writes `curricula/<name>.json` and validates it. Then you import it from the **Import** page, or run `npm run import -- curricula/<name>.json --owner you@example.com`. After that, edit it freely in the app. The file format is described in [`docs/course-format.md`](docs/course-format.md). `curricula/example-linear-algebra.json` is a ready-made sample.

## Deploying (Vercel)

Import the repo in Vercel. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_SITE_URL`. **Don't** add the service-role key. Then add the Vercel URL to Supabase's redirect URLs.

## Development

```sh
npm test            # unit tests (schema, dates, progress)
npm run lint
npm run typecheck
npm run build
```

> This folder is inside OneDrive. Syncing `node_modules` and `.next` is slow. Consider excluding them, or moving the project outside OneDrive.
