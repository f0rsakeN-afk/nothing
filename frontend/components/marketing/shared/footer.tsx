import Link from "next/link";
import { ThemeToggle } from "@/components/shared/ThemeToggler";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.23c-3.34.73-4.03-1.42-4.03-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.05.14 3.01.4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.19.69.8.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.4l-5.8-7.58-6.63 7.58H.49l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.47 3.24H4.28L17.61 20.65z" />
    </svg>
  );
}

const links = {
  product: [
    { label: "Pricing", href: "/pricing" },
    { label: "Status", href: "/status" },
    { label: "Changelog", href: "/changelog" },
  ],
  company: [{ label: "Contact", href: "/contact" }],
  legal: [
    { label: "Terms of Service", href: "/legal/terms" },
    { label: "Privacy Policy", href: "/legal/policy" },
  ],
} as const;

const social = [
  { label: "GitHub", href: "https://github.com", Icon: GitHubIcon },
  { label: "Twitter / X", href: "https://twitter.com", Icon: XIcon },
] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group relative inline-flex w-fit text-sm text-muted-foreground   duration-200 hover:text-foreground"
    >
      {label}
      <span className="absolute -bottom-px left-0 h-px w-0 bg-foreground transition-all duration-300 group-hover:w-full" />
    </Link>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-6xl mx-auto px-6 py-12 lg:py-16">
        {/* Top grid */}
        <div className="grid grid-cols-2 gap-10 lg:grid-cols-[1fr_auto_auto_auto] lg:gap-16">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              {/* Logo placeholder */}
              <div className="h-6 w-6 rounded-md bg-foreground" />
              <span className="text-sm font-semibold text-foreground tracking-tight">
                Nothing
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Simple, fast, and reliable. Built for people who care about the
              details.
            </p>
            <div className="flex items-center gap-4 mt-1">
              {social.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-muted-foreground hover:text-foreground   duration-200"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground">
              Product
            </p>
            <nav className="flex flex-col gap-3">
              {links.product.map((l) => (
                <FooterLink key={l.href} {...l} />
              ))}
            </nav>
          </div>

          {/* Company */}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground">
              Company
            </p>
            <nav className="flex flex-col gap-3">
              {links.company.map((l) => (
                <FooterLink key={l.href} {...l} />
              ))}
            </nav>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground">
              Legal
            </p>
            <nav className="flex flex-col gap-3">
              {links.legal.map((l) => (
                <FooterLink key={l.href} {...l} />
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-border flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Nothing. All rights reserved.
          </p>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
