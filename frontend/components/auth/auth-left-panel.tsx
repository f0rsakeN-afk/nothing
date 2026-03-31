import Link from "next/link";
import { Zap, Lock, Layers, BarChart2 } from "lucide-react";

const FEATURES = [
  {
    Icon: Zap,
    label: "Fast by default",
    desc: "Sub-second performance, built into every layer.",
  },
  {
    Icon: Lock,
    label: "Secure by design",
    desc: "Enterprise-grade security, zero configuration.",
  },
  {
    Icon: Layers,
    label: "Refreshingly simple",
    desc: "No feature bloat. Just what moves the needle.",
  },
  {
    Icon: BarChart2,
    label: "Built to scale",
    desc: "From solo to Series A, Nothing grows with you.",
  },
] as const;

const TESTIMONIALS = [
  {
    initials: "JL",
    name: "Jordan Lee",
    role: "CTO, Acme Inc.",
    quote:
      "We replaced three tools with Nothing and never looked back. The simplicity is the feature.",
  },
  {
    initials: "SP",
    name: "Sara Patel",
    role: "Head of Product, Orbit",
    quote:
      "Our team onboarded in an afternoon. No training, no docs — it just makes sense.",
  },
  {
    initials: "MK",
    name: "Marcus Kim",
    role: "Founder, Driftwood",
    quote:
      "Nothing is the rare tool that gets out of your way. First thing we open every morning.",
  },
  {
    initials: "AL",
    name: "Aisha Lowe",
    role: "Engineer, Beacon",
    quote:
      "The attention to detail is unreal. You can tell it was built by people who actually use it.",
  },
  {
    initials: "RC",
    name: "Ryan Chen",
    role: "CEO, Stackform",
    quote:
      "Went from evaluation to company-wide rollout in a week. That says everything.",
  },
] as const;

const STATS = [
  { value: "10K+", label: "teams" },
  { value: "99.9%", label: "uptime" },
  { value: "4.9★", label: "rating" },
] as const;

const TESTIMONIALS_DOUBLED = [...TESTIMONIALS, ...TESTIMONIALS];

function TestimonialCard({
  initials,
  name,
  role,
  quote,
}: (typeof TESTIMONIALS)[number]) {
  return (
    <div className="w-[268px] shrink-0 rounded-xl border border-border bg-muted/40 px-4 py-3.5 flex flex-col gap-2.5">
      <p className="text-sm text-foreground leading-relaxed line-clamp-2">
        &ldquo;{quote}&rdquo;
      </p>
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 shrink-0 rounded-full border border-border bg-muted flex items-center justify-center">
          <span className="text-[9px] font-semibold text-muted-foreground">
            {initials}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          <span className="font-medium text-foreground">{name}</span> · {role}
        </p>
      </div>
    </div>
  );
}

export function AuthLeftPanel() {
  return (
    <div className="hidden lg:flex flex-col border-r border-border bg-background relative min-h-dvh overflow-hidden">
      {/* Dot grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, color-mix(in oklab, var(--color-foreground) 5%, transparent) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      {/* Vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 90% at 50% 50%, transparent 30%, var(--color-background) 100%)",
        }}
      />

      {/* Content — justify-between spaces logo / mid / stats across full height */}
      <div className="relative z-10 flex flex-col justify-between flex-1 px-14 py-12 gap-10">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group w-fit">
          <div className="h-6 w-6 rounded-md bg-foreground transition-opacity duration-200 group-hover:opacity-60" />
          <span className="text-sm font-semibold text-foreground   duration-200 group-hover:text-muted-foreground">
            Nothing
          </span>
        </Link>

        {/* Mid: headline + features + marquee */}
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="text-[2.5rem] font-semibold tracking-tight text-foreground leading-[1.15]">
              Everything you need.
              <br />
              <span className="text-muted-foreground">
                Nothing you don&apos;t.
              </span>
            </h1>
            <p className="mt-3.5 text-sm text-muted-foreground leading-relaxed max-w-[340px]">
              The modern workspace for teams who care about craft and speed.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            {FEATURES.map(({ Icon, label, desc }) => (
              <div key={label} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Icon
                    className="w-4 h-4 text-muted-foreground shrink-0"
                    strokeWidth={1.75}
                  />
                  <p className="text-sm font-medium text-foreground">{label}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                  {desc}
                </p>
              </div>
            ))}
          </div>

          {/*
           * Marquee: -mx-14 breaks out of px-14 padding to bleed edge-to-edge.
           * The outer overflow-hidden clips it — no layout inflation.
           */}
          <div className="relative -mx-14">
            <div
              className="pointer-events-none absolute left-0 top-0 bottom-0 w-14 z-10"
              style={{
                background:
                  "linear-gradient(to right, var(--color-background), transparent)",
              }}
            />
            <div
              className="pointer-events-none absolute right-0 top-0 bottom-0 w-14 z-10"
              style={{
                background:
                  "linear-gradient(to left, var(--color-background), transparent)",
              }}
            />
            <div
              className="flex gap-3"
              style={{
                width: "max-content",
                animation: "marquee 35s linear infinite",
              }}
            >
              {TESTIMONIALS_DOUBLED.map((t, i) => (
                <TestimonialCard key={i} {...t} />
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-8 border-t border-border pt-5">
          {STATS.map(({ value, label }) => (
            <div key={label}>
              <p className="text-sm font-semibold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
          <p className="ml-auto text-xs text-muted-foreground">
            Trusted worldwide
          </p>
        </div>
      </div>
    </div>
  );
}
