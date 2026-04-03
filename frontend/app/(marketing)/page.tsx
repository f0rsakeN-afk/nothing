import { Metadata } from "next";
import Hero from "@/components/marketing/landing/hero";
import { Features } from "@/components/marketing/landing/features";
import { ResourceAllocation } from "@/components/marketing/landing/resource-allocation";
import { FAQ } from "@/components/marketing/landing/faq";
import { Pricing } from "@/components/marketing/landing/pricing";
// import { Background } from "@/components/marketing/landing/Background";

export const metadata: Metadata = {
  title: "Eryx | AI-powered system design and search assistant",
  description:
    "Eryx combines intelligent technical chat, real-time web search with RAG, and interactive system design visualization into one developer-centric platform.",
  alternates: { canonical: "/" },
};

export default function MarketingPage() {
  return (
    <div className="text-foreground antialiased selection:bg-primary/20 selection:text-primary ">
      {/* <Background className="via-muted to-muted/80 flex flex-col space-y-20">
        <Hero />
        <Features />
        <ResourceAllocation />
      </Background>
      <Background variant="bottom" className="">
        <Pricing />
        <FAQ />
      </Background> */}

      <div className=" flex flex-col space-y-20">
        <Hero />
        <Features />
        <ResourceAllocation />
        {/* <Background variant="bottom" className=""> */}

        <Pricing />
        <FAQ />
        {/* </Background> */}
      </div>
    </div>
  );
}
