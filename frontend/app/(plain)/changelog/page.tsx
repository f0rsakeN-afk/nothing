import Link from "next/link";
import { ChangelogList } from "@/components/plain/changelog/changelog-list";
import type { ChangelogEntry } from "@/types/changelog";

// ─── Static data ──────────────────────────────────────────────────────────────
// Replace with an async fetch() once the backend is ready.

const entries: ChangelogEntry[] = [
  {
    version: "1.3.0",
    date: "2025-03-20",
    title: "Performance & Polish",
    description:
      "A big round of performance improvements, a refined UI across key surfaces, and several long-requested fixes.",
    changes: [
      {
        type: "feature",
        text: "Added dark / light theme toggle with animated transition",
      },
      { type: "feature", text: "New changelog page with full release history" },
      {
        type: "improvement",
        text: "Reduced initial bundle size by 38% via code splitting",
      },
      {
        type: "improvement",
        text: "Smoother page transitions using Framer Motion",
      },
      {
        type: "fix",
        text: "Hydration mismatch on theme initialization resolved",
      },
      { type: "fix", text: "Footer links now correctly resolve on all routes" },
    ],
  },
  {
    version: "1.2.0",
    date: "2025-02-10",
    title: "Legal & Settings",
    description:
      "Shipped the Terms of Service and Privacy Policy pages, plus a first pass at user account settings.",
    changes: [
      {
        type: "feature",
        text: "Terms of Service page with scrollable table of contents",
      },
      {
        type: "feature",
        text: "Privacy Policy page — full GDPR-aligned content",
      },
      {
        type: "feature",
        text: "Active section highlighting in legal page sidebar",
      },
      {
        type: "improvement",
        text: "Inter font replacing Geist for improved readability",
      },
      {
        type: "fix",
        text: "Mobile padding inconsistencies on legal pages fixed",
      },
    ],
  },
  {
    version: "1.1.0",
    date: "2025-01-18",
    title: "Auth & Onboarding",
    description:
      "Introduced authentication flows — login, signup, email verification, and password reset.",
    changes: [
      {
        type: "feature",
        text: "Login and signup pages with Zod form validation",
      },
      { type: "feature", text: "Email verification flow" },
      { type: "feature", text: "Forgot password and reset password pages" },
      {
        type: "improvement",
        text: "Consistent error messaging across all auth forms",
      },
      {
        type: "fix",
        text: "Redirect loop after login on protected routes resolved",
      },
    ],
  },
  {
    version: "1.0.0",
    date: "2025-01-01",
    title: "Initial Release",
    description:
      "The first public version of Nothing. Core infrastructure, design system, and routing in place.",
    changes: [
      { type: "feature", text: "Next.js 15 App Router with Turbopack" },
      { type: "feature", text: "Tailwind CSS v4 with oklch color system" },
      { type: "feature", text: "shadcn/ui component library integrated" },
      { type: "feature", text: "Dark mode support via next-themes" },
      {
        type: "feature",
        text: "SEO-ready layout with OpenGraph and Twitter card metadata",
      },
    ],
  },
];

// ─── JSON-LD ──────────────────────────────────────────────────────────────────

function ChangelogJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Nothing Changelog",
    description: "Release history for Nothing",
    itemListElement: entries.map((entry, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `v${entry.version} — ${entry.title}`,
      description: entry.description,
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChangelogPage() {
  return (
    <>
      <ChangelogJsonLd />

      <div className="min-h-dvh bg-background text-foreground">
        <header className="border-b border-border bg-background/90 backdrop-blur-md sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center">
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              <div className="h-6 w-6 rounded-md bg-foreground transition-opacity duration-200 group-hover:opacity-70" />
              <span className="text-sm font-semibold text-foreground   duration-200 group-hover:text-muted-foreground">
                Nothing
              </span>
            </Link>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-6 py-12 lg:py-16">
          <div className="mb-12 lg:mb-16">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Changelog
            </h1>
            <p className="mt-3 text-base text-muted-foreground leading-relaxed max-w-xl">
              Every update, fix, and new feature — in one place. We ship
              continuously and keep this page up to date.
            </p>
          </div>

          <ChangelogList entries={entries} />
        </div>
      </div>
    </>
  );
}
