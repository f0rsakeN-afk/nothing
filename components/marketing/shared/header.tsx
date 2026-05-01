"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeSwitch } from "@/src/components/unlumen-ui/theme-switch";
import Logo from "@/components/shared/Logo";
import { useUser } from "@stackframe/stack";
import dynamic from "next/dynamic";

const AuthDialog = dynamic(
  () =>
    import("@/components/main/sidebar/dialogs/auth/auth-dialog").then(
      (mod) => mod.AuthDialog,
    ),
  { ssr: false },
);

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
  const t = useTranslations("header");
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  const closeSheet = useCallback(() => setOpen(false), []);

  const user = useUser();

  const NAV_LINKS = [
    { label: "About", href: "/about" },
    { label: t("changelog"), href: "/changelog" },
    { label: t("status"), href: "/status" },
    { label: t("contact"), href: "/contact" },
  ] as const;

  const FEATURE_ITEMS = [
    {
      title: "Integrations",
      description: "Connect 50+ tools via MCP",
      href: "/integrations",
    },
    {
      title: "Web Search",
      description: "Real-time RAG-powered search with citations",
      href: "/features/web-search",
    },
    {
      title: "How It Works",
      description: "Understand the architecture behind Eryx",
      href: "/features/how-it-works",
    },
    {
      title: "Resumable Stream",
      description: "Never lose your place in conversations",
      href: "/features/resumable-stream",
    },
    {
      title: "Memory",
      description: "Long-term context across conversations",
      href: "/features/memory",
    },
    {
      title: "Chat Branches",
      description: "Explore multiple directions in one conversation",
      href: "/features/chat-branches",
    },
    {
      title: "Limits & Features",
      description: "See all plan limits and capabilities",
      href: "/limits",
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between gap-6">
          <Logo />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Features</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid grid-cols-2 gap-3 p-4 w-[420px]">
                      {FEATURE_ITEMS.map((item) => (
                        <NavigationMenuLink key={item.href} href={item.href}>
                          <div className="p-3 rounded-lg hover:bg-muted transition-colors">
                            <p className="text-sm font-medium text-foreground">
                              {item.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </NavigationMenuLink>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
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
            <ThemeSwitch />
            {user ? (
              <Button size={"lg"} onClick={() => router.push("/home")}>
                {t("goToHome")}
              </Button>
            ) : (
              <Button size={"lg"} onClick={() => setAuthDialogOpen(true)}>
                {t("signIn")}
              </Button>
            )}
          </div>

          {/* Mobile: theme toggle + sheet trigger */}
          <div className="flex md:hidden items-center gap-1">
            <ThemeSwitch />
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
                  {user ? (
                    <Button
                      className="w-full"
                      onClick={() => {
                        closeSheet();
                        router.push("/home");
                      }}
                    >
                      {t("goToHome")}
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          closeSheet();
                          setAuthDialogOpen(true);
                        }}
                      >
                        {t("signin")}
                      </Button>
                      <Button
                        className="w-full"
                        onClick={() => {
                          closeSheet();
                          setAuthDialogOpen(true);
                        }}
                      >
                        {t("getStarted")}
                      </Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </>
  );
}
