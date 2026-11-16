# Course JSON format

Use this format to import courses (the **Import** page or `npm run import`) and to export them (course settings, **Download JSON**).
The validator in `src/lib/schema/course-json.ts` is the source of truth. Check a file with:

```sh
npm run validate -- curricula/my-course.json
```

## Shape

```jsonc
{
  "version": 1,                       // optional
  "title": "Linear Algebra",          // required, ≤ 200 chars
  "description": "Why and how",       // optional, ≤ 5000 chars
  "color": "#3d5a80",                 // optional, 6-digit hex
  "start_date": "2026-12-01",         // optional, YYYY-MM-DD
  "end_date": "2026-12-28",           // optional, must be ≥ start_date
  "schedule": [                       // optional weekly class days; ≤ 50 slots
    { "day": "tue", "start": "18:30", "end": "20:00" },   // day: mon…sun; times 24-hour HH:MM, optional
    { "day": "sat", "location": "Library" }              // location: optional text or https:// link
  ],
  "units": [                          // in order; ≤ 200
    {
      "title": "Vectors",             // required
      "description": "Goals…",        // optional
      "start_date": "2026-12-01",     // optional
      "due_date": "2026-12-07",       // optional, must be ≥ start_date
      "items": [                      // in order; ≤ 500 per unit
        {
          "title": "Essence of LA ch. 1",   // required, ≤ 300 chars
          "kind": "watch",                  // read | watch | do | other (default read)
          "url": "https://…",               // optional, http(s) only
          "notes": "Focus on span",         // optional
          "est_minutes": 15,                // optional integer ≥ 0
          "due_date": "2026-12-03"          // optional; blank = the unit's due date
        }
      ]
    }
  ]
}
```

## Semantics

- **Deadlines.** An item's deadline is its own `due_date`, or else its unit's `due_date`. The dashboard and calendar show item deadlines. Unit due dates also appear on the calendar.
- **Class schedule.** Each `schedule` entry is a weekly class slot. A course can meet on several days, at different times. Sessions appear between the course's `start_date` and `end_date`. If either date is missing, that side is open-ended. Sessions show on the dashboard (Today's classes), on the Week view and on the month calendar.
- **Progress** is tracked per user and per item. A unit or course is complete when all of its items are checked.
- **Importing creates a new course** owned by the importer. Importing never merges into an existing course. To revise a course: export it, edit the JSON, import it as a new course, then delete the old one. Progress does not carry over.
