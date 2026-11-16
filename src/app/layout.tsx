import type { Metadata, Viewport } from "next";
import { Lexend, Zilla_Slab } from "next/font/google";
import { Nav } from "@/components/Nav";
import { TimeZoneCookie } from "@/components/TimeZoneCookie";
import "./globals.css";

const body = Lexend({ variable: "--font-body", subsets: ["latin"] });
const display = Zilla_Slab({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: "Curriculum",
  description: "Your own school: courses, class schedules, modules and deadlines for whatever you want to learn next.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1e2a4a" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1424" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${body.variable} ${display.variable} min-h-screen antialiased`} suppressHydrationWarning>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
          Skip to content
        </a>
        <TimeZoneCookie />
        <Nav />
        <div className="md:pl-[84px]">
          <main id="main" className="mx-auto w-full max-w-6xl px-4 pt-6 pb-24 sm:px-8 md:pb-16">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
