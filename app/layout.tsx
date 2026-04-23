import type { Metadata } from "next";
//import { Inter, JetBrains_Mono } from "next/font/google";
// import { Plus_Jakarta_Sans } from "next/font/google";
import { Plus_Jakarta_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import "../styles/hide-scrollbar.css";
import { ThemeProvider } from "@/components/shared/theme-provider";
import MainLayout from "./mainLayout";
import { Toaster } from "@/components/ui/sileo-toast";
import { StackProviderWrapper } from "@/components/providers/stack-provider-wrapper";
import { CookieConsentProvider } from "@/hooks/use-cookie-consent";
import { CookieConsentBanner } from "@/components/main/cookie-consent-banner";
import { UmamiScript } from "@/components/analytics/umami";
//import { PageTransitionProvider } from "@/components/shared/page-transition-provider";

// const inter = Inter({
//   variable: "--font-inter",
//   subsets: ["latin"],
//   display: "swap",
// });

// const jetbrainsMono = JetBrains_Mono({
//   variable: "--font-jetbrains",
//   subsets: ["latin"],
//   display: "swap",
// });

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} ${sourceSerif.variable} [--font-code:var(--font-sans)] h-full antialiased scroll-smooth`}
    >
      <body className="min-h-dvh flex flex-col bg-background text-foreground">
        <CookieConsentProvider>
          <StackProviderWrapper>
            <ThemeProvider defaultTheme="dark" attribute="class">
              <Toaster position="top-center" />
              <MainLayout>{children}</MainLayout>
              <UmamiScript
                websiteId={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID || ""}
                src={process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL || "https://analytics.eryx.ai/script.js"}
              />
              <CookieConsentBanner />
            </ThemeProvider>
          </StackProviderWrapper>
        </CookieConsentProvider>
      </body>
    </html>
  );
}
