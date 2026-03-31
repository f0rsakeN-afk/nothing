import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Read the Terms of Service for Nothing. Understand your rights, responsibilities, and the rules that govern your use of our platform.",
  openGraph: {
    title: "Terms of Service — Nothing",
    description:
      "Read the Terms of Service for Nothing. Understand your rights, responsibilities, and the rules that govern your use of our platform.",
    type: "website",
    url: "/legal/terms",
  },
  twitter: {
    card: "summary",
    title: "Terms of Service — Nothing",
    description:
      "Read the Terms of Service for Nothing. Understand your rights, responsibilities, and the rules that govern your use of our platform.",
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
