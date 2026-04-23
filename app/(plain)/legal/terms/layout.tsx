import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service governing your use of Eryx AI platform. Understand your rights, responsibilities, and the rules that govern your use of our service.",
  openGraph: {
    title: "Terms of Service — Eryx",
    description:
      "Terms of Service governing your use of Eryx AI platform. Understand your rights, responsibilities, and the rules that govern your use of our service.",
    type: "website",
    url: "/legal/terms",
  },
  twitter: {
    card: "summary",
    title: "Terms of Service — Eryx",
    description:
      "Terms of Service governing your use of Eryx AI platform. Understand your rights, responsibilities, and the rules that govern your use of our service.",
  },
  alternates: {
    canonical: "/legal/terms",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
