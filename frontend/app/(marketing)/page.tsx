import { Metadata } from "next";
import { MessageSquare, Search, Workflow, CheckCircle } from "lucide-react";
import {
  Hero,
  TrustedBy,
  Features,
  FAQ,
} from "@/components/marketing/landing/sections";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";

export const metadata: Metadata = {
  title: "Eryx | AI-powered system design and search assistant",
  description:
    "Eryx combines intelligent technical chat, real-time web search with RAG, and interactive system design visualization into one developer-centric platform.",
  alternates: { canonical: "/" },
};

export default function MarketingPage() {
  return (
    <div className="bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      <Hero />
      <TrustedBy />
      <Features />

      {/* Connect & Build Section */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto text-center mb-24">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-6 text-foreground">
            Chat. Search. Design Systems.
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium">
            Eryx integrates intelligent chat, real-time web search with RAG, and
            interactive system architecture diagrams in one unified platform.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {[
            {
              icon: MessageSquare,
              title: "Intelligent AI Chat",
              desc: "Ask anything about software design, databases, backend architecture, or coding patterns.",
            },
            {
              icon: Search,
              title: "Real-time Web Search",
              desc: "Pull up-to-date information from the web and trusted sources using Retrieval-Augmented Generation (RAG).",
            },
            {
              icon: Workflow,
              title: "System Design Generator",
              desc: "Transform complex architectural concepts into interactive React Flow diagrams effortlessly.",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-card p-8 rounded-2xl border border-border hover:shadow-md transition-all duration-300 group"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/20  ">
                <item.icon className="text-primary w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold mb-3 text-foreground">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-32 text-center">
          <p className="text-2xl md:text-4xl font-semibold text-foreground/30 tracking-tight">
            Stop reading legacy docs. Start designing visually.
          </p>
        </div>
      </section>

      {/* Global Scale Section */}
      <section className="py-32 px-6 bg-card text-card-foreground border border-border overflow-hidden rounded-[3rem] mx-6 mb-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="relative">
              <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 blur-[120px] rounded-full"></div>
              <img
                alt="Global map of nodes"
                className="rounded-3xl shadow-xl border border-border relative z-10"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCX3CG-69Zej1gTOVF9n_tyOop0JWt3JX3mP6RFzevrQ6I5gCCMXgMLFCMhbaovkrmjR62-oRDPlDl5u8VeaAXgM6IQSbcGT1IjQp6aNb4G7_ITXigHBA82ZsSiQmxlpIIaLKIMUJE7-AoEU0sQRiSMK5J8P4OjDJpjj0rIzCyOvzJj_WsSUa4axn0PEqtMnLh_GmJElwI_vjGOGlRbMFg8BeJ9o6OxKHUWVJ38s1vvgmGNsgKfMXsxyO7Dk-FUbyYCf52NHfyBJMQ"
              />
            </div>
            <div>
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-primary mb-6 block">
                Scalability First
              </span>
              <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-8">
                Built for teams scaling at warp speed
              </h2>
              <p className="text-base text-muted-foreground mb-12 leading-relaxed font-medium">
                Eryx isn&apos;t just for solo devs. Our infrastructure handles
                multi-region deployments and massive monorepos without breaking
                a sweat.
              </p>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-3xl font-mono font-semibold text-primary mb-1">
                    99.9%
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
                    Uptime SLA
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-mono font-semibold text-primary mb-1">
                    50ms
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
                    Agent Latency
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FAQ />

      {/* Final CTA Section */}
      <section className="py-44 px-6 text-center bg-muted/20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight mb-10 leading-[1.1] text-foreground">
            Design and architect
            <br />
            your next system with Eryx
          </h2>
          <div className="flex justify-center">
            <InteractiveHoverButton>
              Start your free trial today
            </InteractiveHoverButton>
          </div>
          <p className="mt-8 text-muted-foreground font-mono uppercase tracking-widest text-xs">
            No credit card required. Cancel anytime.
          </p>
        </div>
      </section>
    </div>
  );
}
