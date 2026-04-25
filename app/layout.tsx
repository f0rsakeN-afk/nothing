import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import "../styles/hide-scrollbar.css";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { Toaster } from "@/components/ui/sileo-toast";
import { StackProviderWrapper } from "@/components/providers/stack-provider-wrapper";
import { CookieConsentProvider } from "@/hooks/use-cookie-consent";
import { CookieConsentBanner } from "@/components/main/cookie-consent-banner";
import { UmamiScript } from "@/components/analytics/umami";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { cookies } from "next/headers";
import { Providers } from "./providers";
import { routing } from "@/routing";

// Force dynamic rendering so cookie is read on every request
export const dynamic = "force-dynamic";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: {
    default: "Eryx — AI Assistant",
    template: "%s | Eryx",
  },
  description:
    "Eryx is a powerful, intelligent AI chat assistant. Ask questions, get help with coding, and explore ideas seamlessly. Connect to GitHub, Notion, Slack, and 50+ apps.",
  keywords: [
    "AI assistant",
    "AI chat",
    "chatbot",
    "Claude alternative",
    "GPT alternative",
    "MCP",
    "Model Context Protocol",
    "AI tools",
    "productivity AI",
    "coding assistant",
    "GitHub integration",
    "Notion integration",
  ],
  authors: [{ name: "Eryx" }],
  creator: "@eryxai",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    siteName: "Eryx",
    title: "Eryx — AI Assistant",
    description:
      "Eryx is a powerful, intelligent AI chat assistant. Ask questions, get help with coding, and explore ideas seamlessly.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Eryx — AI Assistant",
    description:
      "Eryx is a powerful, intelligent AI chat assistant. Ask questions, get help with coding, and explore ideas seamlessly.",
    creator: "@eryxai",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get locale from cookie (for localePrefix: "never")
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("NEXT_LOCALE")?.value;
  const locale = routing.locales.includes(localeCookie as typeof routing.locales[number])
    ? localeCookie
    : routing.defaultLocale;

  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} ${sourceSerif.variable} [--font-code:var(--font-sans)] h-full antialiased scroll-smooth`}
    >
      <body className="min-h-dvh flex flex-col bg-background text-foreground">
        <CookieConsentProvider>
          <StackProviderWrapper>
            <ThemeProvider defaultTheme="dark" attribute="class">
              <NextIntlClientProvider locale={locale} messages={messages}>
                <Providers>
                  <Toaster position="top-center" />
                  {children}
                  <UmamiScript
                    websiteId={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID || ""}
                    src={
                      process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL ||
                      "https://analytics.eryx.ai/script.js"
                    }
                  />
                  <CookieConsentBanner />
                </Providers>
              </NextIntlClientProvider>
            </ThemeProvider>
          </StackProviderWrapper>
        </CookieConsentProvider>
      </body>
    </html>
  );
}
