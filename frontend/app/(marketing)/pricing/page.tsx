import { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Script from "next/script";
import { cn } from "@/lib/utils";
import { tiers, featureGroups } from "@/lib/data/pricing";
import {
  PricingCard,
  ComparisonRow,
} from "@/components/marketing/pricing/pricing-components";

export const metadata: Metadata = {
  title: "Pricing | Eryx",
  description:
    "Simple, transparent pricing for Eryx. Pay for what you use, nothing more.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
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
            <h1 className="text-4xl md:text-[3.25rem] font-semibold tracking-tight text-foreground mb-5 leading-[1.1]">
              Enterprise-grade AI, priced for scale.
              <br />
              <span className="text-muted-foreground/60">No hidden complexity.</span>
            </h1>
            <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed font-medium">
              Transparent pricing designed to scale with your architecture. Start
              building immediately with zero upfront commitment.
            </p>
          </div>
        </section>

        {/* ── Tier Cards ────────────────────────────────────────── */}
        <section className="pb-16">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-4 items-start">
            {tiers.map((tier) => (
              <PricingCard key={tier.id} tier={tier} />
            ))}
          </div>
        </section>

        {/* ── Feature Comparison ────────────────────────────────── */}
        <section className="pb-28">
          <div className="max-w-6xl mx-auto">
            {/* Section label */}
            <div className="flex items-center gap-4 py-8">
              <div className="h-px flex-1 bg-border/40" />
              <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground/50">
                Full comparison
              </p>
              <div className="h-px flex-1 bg-border/40" />
            </div>

            {/* Table Wrap for Mobile Scroll */}
            <div className="overflow-x-auto lg:overflow-x-visible -mx-6 px-6 lg:mx-0 lg:px-0">
              <div className="min-w-[700px] lg:min-w-0 rounded-2xl border border-border overflow-hidden">
                {/* Sticky header */}
                <div className="grid grid-cols-4 border-b border-border">
                  <div className="py-4 px-6 bg-muted/20">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                      Feature
                    </p>
                  </div>
                  {tiers.map((tier) => (
                    <div
                      key={tier.id}
                      className={cn(
                        "py-4 px-4 text-center",
                        tier.featured ? "bg-primary/5" : "bg-muted/20",
                      )}
                    >
                      <p
                        className={cn(
                          "text-xs font-semibold uppercase tracking-widest",
                          tier.featured
                            ? "text-primary"
                            : "text-muted-foreground",
                        )}
                      >
                        {tier.name}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Groups */}
                {featureGroups.map((group, gi) => (
                  <div key={group.group}>
                    <div className="grid grid-cols-4 bg-muted/10">
                      <div className="col-span-4 py-2.5 px-6 border-b border-border/40">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
                          {group.group}
                        </p>
                      </div>
                    </div>

                    {group.features.map((feature, fi) => (
                      <ComparisonRow
                        key={feature.label}
                        label={feature.label}
                        values={feature}
                        isLast={
                          gi === featureGroups.length - 1 &&
                          fi === group.features.length - 1
                        }
                      />
                    ))}
                  </div>
                ))}

                {/* CTA row */}
                <div className="grid grid-cols-4 border-t border-border bg-muted/10">
                  <div className="py-5 px-6" />
                  {tiers.map((tier) => (
                    <div
                      key={tier.id}
                      className={cn(
                        "py-5 px-4 flex justify-center",
                        tier.featured && "bg-primary/[0.04]",
                      )}
                    >
                      <button
                        className={cn(
                          "px-4 py-2 rounded-lg font-medium text-xs transition-all w-full max-w-[130px]",
                          tier.featured
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "border border-border text-foreground hover:bg-muted",
                        )}
                      >
                        {tier.cta}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Bottom CTA ────────────────────────────────────────── */}
        <section className="py-20 border-t border-border">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <p className="text-base font-semibold text-foreground mb-1.5">
                Ready to scale?
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm font-medium">
                Deploy with confidence. Transition seamlessly as your operational
                requirements expand.
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
