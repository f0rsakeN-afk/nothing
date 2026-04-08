"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/shared/ThemeToggler";
import Logo from "@/components/shared/Logo";
import { useStackApp, useUser } from "@stackframe/stack";

// ─── Constants ────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "Pricing", href: "/pricing" },
  { label: "Changelog", href: "/changelog" },
  { label: "Status", href: "/status" },
  { label: "Contact", href: "/contact" },
] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function NavLink({
  href,
  label,
  active,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`relative text-sm font-medium tracking-wide duration-200 group ${
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      {/* Underline indicator for active link */}
      <span
        className={`absolute -bottom-px left-0 h-px bg-foreground transition-all duration-200 ${
          active ? "w-full" : "w-0 group-hover:w-full"
        }`}
      />
    </Link>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MarketingHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const closeSheet = useCallback(() => setOpen(false), []);

  const user = useUser();
  const app = useStackApp();

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
        <Logo />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              active={pathname === item.href}
            />
          ))}
        </nav>

        {/* Desktop right actions */}
        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <Button>Go to Home</Button>
          ) : (
            <Button onClick={() => app.redirectToSignIn()}>Sign In</Button>
          )}
        </div>

        {/* Mobile: theme toggle + sheet trigger */}
        <div className="flex md:hidden items-center gap-1">
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Open menu" />
              }
            >
              <Menu className="w-5 h-5" />
            </SheetTrigger>

            <SheetContent side="right" className="w-72 px-0 py-0">
              <SheetHeader className="px-5 pt-5 pb-4">
                <SheetTitle>
                  <div onClick={closeSheet} className="cursor-pointer">
                    <Logo />
                  </div>
                </SheetTitle>
              </SheetHeader>

              <Separator />

              {/* Mobile nav links */}
              <nav className="flex flex-col px-3 py-4 gap-1">
                {NAV_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeSheet}
                    className={`flex items-center w-full px-3 py-2 rounded-md text-sm   duration-150 ${
                      pathname === item.href
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <Separator />

              {/* Mobile CTA */}
              <div className="flex flex-col gap-2 px-5 py-4">
                <Button variant="outline" className="w-full">
                  <Link href="/login" onClick={closeSheet}>
                    Sign in
                  </Link>
                </Button>
                <Button className="w-full">
                  <Link href="/home" onClick={closeSheet}>
                    Get started
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
