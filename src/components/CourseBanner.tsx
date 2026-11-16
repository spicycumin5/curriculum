import { courseCode, readableOn } from "@/lib/course-style";

/** Ruled-notebook banner in the course colour, carrying the course code. */
export function CourseBanner({
  id,
  title,
  color,
  size = "card",
  children,
}: {
  id: string;
  title: string;
  color: string;
  size?: "card" | "page";
  children?: React.ReactNode;
}) {
  const ink = readableOn(color);
  return (
    <div
      className={`notebook relative ${size === "card" ? "h-24 rounded-t-[10px] px-4 pt-3 pl-11" : "rounded-[10px] px-5 pt-4 pb-5 pl-12 sm:px-8 sm:pl-14"}`}
      style={{ "--c": color, color: ink } as React.CSSProperties}
    >
      <p className={`font-serif font-bold tracking-wide ${size === "card" ? "text-lg" : "text-xl"}`}>{courseCode(title, id)}</p>
      {children}
    </div>
  );
}
