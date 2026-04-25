import { Metadata } from "next";
import Hero from "@/components/marketing/landing/hero";
import { Features } from "@/components/marketing/landing/features";
import { ResourceAllocation } from "@/components/marketing/landing/resource-allocation";
import { FAQ } from "@/components/marketing/landing/faq";
import { Pricing } from "@/components/marketing/landing/pricing";
import { IntegrationsSection } from "@/components/marketing/landing/integrations";

export const metadata: Metadata = {
  title: "About | Eryx",
  description:
    "Eryx combines intelligent technical chat, real-time web search with RAG, and interactive system design visualization into one developer-centric platform.",
  openGraph: {
    title: "About | Eryx",
    description: "Eryx combines intelligent technical chat, real-time web search with RAG, and interactive system design visualization.",
    url: "/about",
    siteName: "Eryx",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About | Eryx",
    description: "Eryx combines intelligent technical chat, real-time web search with RAG, and interactive system design visualization.",
    creator: "@eryxai",
  },
  alternates: { canonical: "/about" },
};

export default function MarketingPage() {
  return (
    <div className="text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      <div className="flex flex-col space-y-20">
        <Hero />
        <Features />
        <IntegrationsSection />
        <ResourceAllocation />
        <Pricing />
        <FAQ />
      </div>
    </div>
  );
}
