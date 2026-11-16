import { NextResponse } from "next/server";
import { getCourses } from "@/lib/queries";
import { toCourseJson } from "@/lib/schema/course-json";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { courses } = await getCourses(supabase, user.id, id);
  const course = courses[0];
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const slug = course.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "course";
  return new NextResponse(JSON.stringify(toCourseJson(course, course.units, course.meetings), null, 2) + "\n", {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.json"`,
    },
  });
}
