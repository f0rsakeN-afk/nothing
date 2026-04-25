import { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Script from "next/script";
import { cn } from "@/lib/utils";
import { PricingClient } from "@/components/marketing/pricing/pricing-client";

export const metadata: Metadata = {
  title: "Pricing | Eryx",
  description:
    "Simple, transparent pricing for Eryx. Pay for what you use, nothing more.",
  alternates: { canonical: "/pricing" },
};

async function fetchPlansData() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/polar/plans`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error("Failed to fetch plans");
  return res.json();
}

export default async function PricingPage() {
  const data = await fetchPlansData();
  return (
    <>
      <Script
        id="pricing-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Eryx Pricing",
            description: "Transparent pricing tiers for the Eryx AI platform.",
            url: "https://eryx.ai/pricing",
          }),
        }}
      />
      <Script
        id="product-pricing"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: "Eryx AI",
            description: "Agentic AI for system design and search.",
            brand: { "@type": "Brand", name: "Eryx" },
            offers: {
              "@type": "AggregateOffer",
              lowPrice: "0",
              highPrice: "12",
              priceCurrency: "USD",
              offerCount: "3",
            },
          }),
        }}
      />

      <div className="bg-background text-foreground antialiased pt-28 pb-24 px-6 overflow-hidden">
        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="relative pb-24 text-center">
          {/* subtle ambient glow */}
          <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
            <div className="w-[600px] h-[400px] rounded-full bg-primary/5 blur-[100px] -translate-y-1/4" />
          </div>

          <div className="max-w-6xl mx-auto relative z-10">
            <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground mb-5">
              Pricing
            </p>
            <h1 className="text-4xl font-display md:text-[3.25rem] font-semibold tracking-tight text-foreground mb-5 leading-[1.1]">
              Enterprise-grade AI, priced for scale.
              <br />
              <span className="text-muted-foreground/60">
                No hidden complexity.
              </span>
            </h1>
            <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed font-medium">
              Transparent pricing designed to scale with your architecture.
              Start building immediately with zero upfront commitment.
            </p>
          </div>
        </section>

        {/* ── Dynamic Pricing (Client Component) ───────────────── */}
        <section className="pb-16">
          <PricingClient data={data} />
        </section>

        {/* ── Bottom CTA ────────────────────────────────────────── */}
        <section className="py-20 border-t border-border">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <p className="text-base font-display font-semibold text-foreground mb-1.5">
                Ready to scale?
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm font-medium">
                Deploy with confidence. Transition seamlessly as your
                operational requirements expand.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <button className="px-5 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-2 group">
                Get started
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button className="px-5 py-2.5 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted transition-all">
                Contact Sales
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
