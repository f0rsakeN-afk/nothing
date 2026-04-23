import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Eryx AI platform. Learn exactly what data we collect, how we use it, and the choices you have over your personal information.",
  openGraph: {
    title: "Privacy Policy — Eryx",
    description:
      "Privacy Policy for Eryx AI platform. Learn exactly what data we collect, how we use it, and the choices you have over your personal information.",
    type: "website",
    url: "/legal/policy",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy — Eryx",
    description:
      "Privacy Policy for Eryx AI platform. Learn exactly what data we collect, how we use it, and the choices you have over your personal information.",
  },
  alternates: {
    canonical: "/legal/policy",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
