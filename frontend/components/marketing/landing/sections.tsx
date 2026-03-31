"use client";

import React, { memo } from "react";
import {
  Zap,
  Sparkles,
  ShieldCheck,
  History,
  Terminal,
  Network,
  Brain,
  Blocks,
  CheckCircle,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { cn } from "@/lib/utils";

// ─── Hero ──────────────────────────────────────────────────

export const Hero = memo(function Hero() {
  return (
    <section className="relative pt-24 pb-32 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium tracking-widest uppercase mb-8">
          <Zap className="w-3.5 h-3.5" />
          Built for developers
        </div>
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tight text-foreground mb-8 leading-[1.05]">
          AI-powered system design
          <br />
          <span className="bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
            and search assistant
          </span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-muted-foreground mb-12 leading-relaxed font-medium">
          Ask complex technical questions, search the web with RAG, and generate
          interactive architecture diagrams instantly from a single workspace.
        </p>
        <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
          <InteractiveHoverButton>Start for Free</InteractiveHoverButton>
          <button className="px-8 py-2.5 rounded-full font-medium text-sm text-foreground hover:bg-muted   border border-transparent hover:border-border">
            View Demo
          </button>
        </div>
      </div>

      <div className="mt-24 max-w-6xl mx-auto relative rounded-2xl overflow-hidden shadow-2xl border border-border/50">
        <img
          alt="Starry desert landscape"
          className="w-full aspect-[21/9] object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBcTd8_nq30BArFGicwJz8P_ut3ZBVw13F3Yr2Os1ybRY74LSylSO6bvG_AlY6GmfDjmw598EPmCGmpE1gRNKZOK-VVaBJr1SmzmNRrXQeBce7dV-YXZV3FAqQWToK4t84slyFCXE4x54huInjjGXeVFalAgyGk2_Q6DGaSqLh6RlEZz_jciYUkGTNfjhVoZmYsFZMuFq8kIw6-EOuSdLOgn0nGCy9zKteymymUiF3PvUk6vA100FtIbIviaFsrWX7SA8IlvbwwBaE"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-xl p-1.5 rounded-2xl flex gap-1 shadow-2xl border border-border/50 overflow-x-auto max-w-[90%] sm:max-w-none">
          <button className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center gap-2 transition-all shrink-0">
            <Sparkles className="w-4 h-4" /> AI Chat Assistant
          </button>
          <button className="px-5 py-2.5 rounded-xl text-muted-foreground hover:bg-muted font-medium text-sm flex items-center gap-2 transition-all shrink-0">
            <ShieldCheck className="w-4 h-4" /> Real-time Web Search
          </button>
          <button className="px-5 py-2.5 rounded-xl text-muted-foreground hover:bg-muted font-medium text-sm flex items-center gap-2 transition-all shrink-0">
            <History className="w-4 h-4" /> Interactive Diagrams
          </button>
        </div>
      </div>
    </section>
  );
});

// ─── Trusted By ───────────────────────────────────────────

export const TrustedBy = memo(function TrustedBy() {
  return (
    <section className="py-12 px-6 border-y border-border/40">
      <div className="max-w-7xl mx-auto">
        <p className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground/60 mb-10 font-mono">
          Trusted by fast-growing startups
        </p>
        <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-50 grayscale hover:grayscale-0 transition-all duration-500 text-foreground">
          {["Vercel", "Stripe", "Linear", "Supabase", "Railway"].map((name) => (
            <span key={name} className="text-xl font-semibold tracking-tight">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
});

// ─── Features ─────────────────────────────────────────────

export const Features = memo(function Features() {
  return (
    <section className="py-32 px-6 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-8 leading-tight text-foreground">
              Visualize architecture effortlessly
            </h2>
            <p className="text-base text-muted-foreground mb-10 leading-relaxed font-medium">
              Eryx doesn&apos;t just respond with text; it transforms your
              architectural concepts into interactive React Flow diagrams.
              Learn, design, and export scalable systems.
            </p>
            <ul className="space-y-6">
              {[
                {
                  icon: Terminal,
                  title: "Structured JSON",
                  desc: "AI generates precise nodes and edges directly from your natural language prompts.",
                },
                {
                  icon: Network,
                  title: "Interactive Editor",
                  desc: "Drag, edit, and export your generated diagrams in real-time.",
                },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground mb-1">
                      {item.title}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                      {item.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative group">
            <div className="absolute -inset-4 bg-primary/5 blur-3xl rounded-full transition-opacity opacity-0 group-hover:opacity-100"></div>
            <div className="relative bg-card rounded-2xl overflow-hidden shadow-xl border border-border">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                  auth_service.ts
                </div>
              </div>
              <div className="p-8 font-mono text-sm leading-relaxed overflow-x-auto bg-card">
                <pre className="text-muted-foreground">
                  <code>
                    1 <span className="text-primary">async function</span>{" "}
                    <span className="text-blue-400">validateUser</span>(id:
                    string) {"{"}
                    {"\n"}2 <span className="text-primary">const</span> user ={" "}
                    <span className="text-primary">await</span> db.find(id);
                    {"\n"}3 <span className="text-red-400">if</span> (!user){" "}
                    <span className="text-red-400">throw</span>{" "}
                    <span className="text-blue-400">new</span> Error(&apos;No
                    User&apos;);{"\n"}4{"\n"}
                    <span className="bg-primary/20 border-l-2 border-primary px-2 text-primary animate-pulse w-full inline-block">
                      5 // AI Suggestion: Add session logging{"\n"}6 await
                      audit.log(user.id, &apos;login_attempt&apos;);
                    </span>
                    {"\n"}7 <span className="text-primary">return</span> user;
                    {"\n"}8 {"}"}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

// ─── FAQ ──────────────────────────────────────────────────

export const FAQ = memo(function FAQ() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-semibold tracking-tight text-center mb-12 text-foreground">
          Frequently Asked Questions
        </h2>
        <Accordion multiple={false} className="w-full space-y-3">
          {[
            {
              q: "Does Eryx support RAG (Retrieval-Augmented Generation)?",
              a: "Yes. Eryx scrapes and processes relevant content from trusted web sources in real-time to provide accurate, context-rich answers.",
            },
            {
              q: "Can I export the generated diagrams?",
              a: "Absolutely. Eryx uses React Flow, which allows you to interact with the diagrams and export them directly into your documentation.",
            },
            {
              q: "Is there caching for performance?",
              a: "Yes, Eryx utilizes optional Redis caching to ensure fast, responsive answers and minimize redundant computational work.",
            },
          ].map((item, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="bg-card border border-border rounded-xl px-6 data-[state=open]:border-primary/40  "
            >
              <AccordionTrigger className="text-sm font-medium hover:no-underline py-5 text-foreground text-left">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5 font-medium">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
});
