import type { Metadata } from "next";
import { Footer } from "@/components/marketing/shared/footer";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "Stay up to date with every update, fix, and new feature shipped to Nothing. Full release history in one place.",
  openGraph: {
    title: "Changelog — Nothing",
    description:
      "Stay up to date with every update, fix, and new feature shipped to Nothing.",
    type: "website",
    url: "/changelog",
  },
  twitter: {
    card: "summary",
    title: "Changelog — Nothing",
    description:
      "Stay up to date with every update, fix, and new feature shipped to Nothing.",
  },
  alternates: {
    canonical: "/changelog",
  },
};

export default function ChangelogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Footer />
    </>
  );
}
