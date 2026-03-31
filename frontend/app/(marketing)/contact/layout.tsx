import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Have a question, idea, or just want to say hi? Reach out to the Nothing team — we read and reply to every message.",
  openGraph: {
    title: "Contact — Nothing",
    description:
      "Have a question, idea, or just want to say hi? Reach out to the Nothing team — we read and reply to every message.",
    type: "website",
    url: "/contact",
  },
  twitter: {
    card: "summary",
    title: "Contact — Nothing",
    description:
      "Have a question, idea, or just want to say hi? Reach out to the Nothing team — we read and reply to every message.",
  },
  alternates: {
    canonical: "/contact",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
