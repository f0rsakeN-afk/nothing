"use client";

import Link from "next/link";
import { BookOpen, ArrowRight, FileText, Upload, Globe, Lock, Sparkles } from "lucide-react";

const FEATURES = [
  {
    icon: FileText,
    title: "Text Memories",
    description: "Add personal notes, facts, and context that the AI can use in conversations.",
  },
  {
    icon: Upload,
    title: "File Uploads",
    description: "Upload documents, PDFs, and markdown files for the AI to reference.",
  },
  {
    icon: Globe,
    title: "Web URLs",
    description: "Add URLs from any public webpage to include in context.",
  },
  {
    icon: Lock,
    title: "Per-Chat or Global",
    description: "Assign context to specific conversations or make it available everywhere.",
  },
];

export default function ContextPage() {
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-card/50">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Context</h1>
            <p className="text-sm text-muted-foreground">Ground your conversations in your own data</p>
          </div>
        </div>
        <Link
          href="/memory"
          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          Go to Memory
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6">
          {/* Coming Soon Notice */}
          <div className="mb-8 p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Context features are being developed</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Full file uploads, URL imports, and per-chat context are coming soon.
                In the meantime, use the Memory page to store personal context.
              </p>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="p-5 rounded-xl border bg-card hover:shadow-sm transition-shadow"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted mb-4">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1.5">{title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>

          {/* Quick Link */}
          <div className="mt-8 p-6 rounded-xl border border-dashed bg-muted/20 text-center">
            <p className="text-sm text-muted-foreground mb-3">Want to add personal context now?</p>
            <Link
              href="/memory"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Open Memory Page
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}