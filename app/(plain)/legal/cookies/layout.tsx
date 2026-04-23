import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Cookie Policy for Eryx AI platform. Learn about the cookies we use and how to manage your cookie preferences.",
  openGraph: {
    title: "Cookie Policy — Eryx",
    description:
      "Cookie Policy for Eryx AI platform. Learn about the cookies we use and how to manage your cookie preferences.",
    type: "website",
    url: "/legal/cookies",
  },
  twitter: {
    card: "summary",
    title: "Cookie Policy — Eryx",
    description:
      "Cookie Policy for Eryx AI platform. Learn about the cookies we use and how to manage your cookie preferences.",
  },
  alternates: {
    canonical: "/legal/cookies",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function CookiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
