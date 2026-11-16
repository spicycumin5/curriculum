import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Nav } from "@/components/Nav";
import { TimeZoneCookie } from "@/components/TimeZoneCookie";
import "./globals.css";

const body = Inter({ variable: "--font-body", subsets: ["latin"] });
const display = Fraunces({ variable: "--font-display", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Curriculum",
  description: "Plan self-study like a school term: courses, units, resources and deadlines.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${body.variable} ${display.variable} min-h-screen antialiased`} suppressHydrationWarning>
        <TimeZoneCookie />
        <Nav />
        <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-16 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
