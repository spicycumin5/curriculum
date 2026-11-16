import Link from "next/link";
import { createCourse } from "@/app/actions/courses";
import { CourseForm } from "@/components/forms";

export default function NewCoursePage() {
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">New course</h1>
        <p className="mt-1 text-sm text-muted">
          Create the course, then add units and resources. Have a JSON curriculum from Claude instead?{" "}
          <Link href="/courses/import" className="text-accent hover:underline">Import it</Link>.
        </p>
      </div>
      <div className="card p-5">
        <CourseForm action={createCourse} submitLabel="Create course" />
      </div>
    </div>
  );
}
