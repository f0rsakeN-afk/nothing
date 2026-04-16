import type { Metadata } from "next";
//import { Inter, JetBrains_Mono } from "next/font/google";
// import { Plus_Jakarta_Sans } from "next/font/google";
import { Plus_Jakarta_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import "../styles/hide-scrollbar.css";
import { ThemeProvider } from "@/components/shared/theme-provider";
import MainLayout from "./mainLayout";
import { Toaster } from "@/components/ui/sileo-toast";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackServerApp } from "@/src/stack/server";
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
  title: "Eryx — AI Assistant",
  description:
    "Eryx is a powerful, intelligent AI chat assistant. Ask questions, get help with coding, and explore ideas seamlessly.",
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
        <StackProvider app={stackServerApp}>
          <StackTheme>
            <ThemeProvider defaultTheme="dark" attribute="class">
              <Toaster position="top-center" />
              <MainLayout>{children}</MainLayout>
            </ThemeProvider>
          </StackTheme>
        </StackProvider>
      </body>
    </html>
  );
}
