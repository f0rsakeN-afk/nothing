import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { PageTransitionProvider } from "@/components/shared/page-transition-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
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
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-dvh flex flex-col bg-background text-foreground font-sans">
        <ThemeProvider defaultTheme="dark" attribute="class">
          <PageTransitionProvider>{children}</PageTransitionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
