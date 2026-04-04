"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Terminal,
  Database,
  Network,
  Heart,
  Cpu,
  Boxes,
  Activity,
  Briefcase,
  Share2,
  Monitor,
  Palette,
  GraduationCap,
  Globe,
  Link2,
  Mail,
  Mic,
  BookOpen,
  Search,
} from "lucide-react";
import { ArchitectureDemo } from "@/components/onboarding/architecture-demo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    id: "welcome",
    title: "Welcome to Eryx",
    description:
      "The intelligent workspace for modern system design and context-aware research.",
    icon: Terminal,
    content: (
      <div className="relative group w-full max-w-[320px] mx-auto">
        <div className="relative bg-background border border-primary/20 rounded-2xl p-6 flex items-center gap-6 shadow-sm">
          <div className="w-14 h-14 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10">
            <Cpu className="w-7 h-7 text-primary" />
          </div>
          <div className="text-left space-y-1">
            <p className="text-lg font-bold tracking-tight">Ready to build?</p>
            <p className="text-[13px] text-muted-foreground whitespace-nowrap">
              Engineering-first insights.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "profession",
    title: "Tell us about yourself",
    description: "Personalize your workspace based on your primary workflow.",
    icon: Briefcase,
    type: "choice",
    field: "profession",
    options: [
      { id: "developer", label: "Software Engineer", icon: Terminal },
      { id: "lead", label: "Engineering Lead", icon: Cpu },
      { id: "pm", label: "Product Manager", icon: Briefcase },
      { id: "architect", label: "System Architect", icon: Network },
      { id: "researcher", label: "Researcher", icon: Activity },
      { id: "designer", label: "Designer", icon: Palette },
      { id: "student", label: "Student", icon: GraduationCap },
      { id: "founder", label: "Founder", icon: Monitor },
      { id: "devops", label: "DevOps", icon: Database },
      { id: "other", label: "Other", icon: Boxes },
    ],
  },
  {
    id: "source",
    title: "Help us grow",
    description: "How did you hear about Eryx?",
    icon: Share2,
    type: "choice",
    field: "source",
    options: [
      { id: "twitter", label: "Twitter", icon: Globe },
      { id: "linkedin", label: "LinkedIn", icon: Link2 },
      { id: "github", label: "GitHub", icon: Terminal },
      { id: "newsletter", label: "Newsletter", icon: Mail },
      { id: "reddit", label: "Reddit", icon: Share2 },
      { id: "search", label: "Web Search", icon: Search },
      { id: "podcast", label: "Podcast", icon: Mic },
      { id: "friend", label: "Friend", icon: Heart },
      { id: "blog", label: "Blog", icon: BookOpen },
      { id: "other", label: "Other", icon: Boxes },
    ],
  },
  {
    id: "search",
    title: "Technical Web Search",
    description:
      "Our RAG-powered engine indexes verified technical docs to provide high-precision engineering answers.",
    icon: Database,
    content: (
      <div className="relative w-full max-w-[320px] mx-auto p-4 rounded-2xl border border-border bg-muted/20 overflow-hidden group">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <Skeleton className="h-2 w-24" />
          <div className="ml-auto">
            <Badge
              variant="outline"
              className="text-[10px] uppercase tracking-widest font-bold py-0 h-5 border-primary/20 bg-primary/5 text-primary"
            >
              Verified
            </Badge>
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-2 w-full opacity-60" />
          <Skeleton className="h-2 w-[90%] opacity-40" />
          <Skeleton className="h-2 w-[70%] opacity-20" />
        </div>
        <div className="mt-4 flex items-center gap-2 pt-3 border-t border-border/50">
          <div className="w-4 h-4 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground italic">
            indexing developer docs...
          </span>
        </div>
      </div>
    ),
  },
  {
    id: "design",
    title: "System Architecture",
    description:
      "Instant diagrammatic abstractions of your complex technical specifications with React Flow integration.",
    icon: Network,
    content: (
      <div className="relative h-[240px] w-full max-w-[440px] mx-auto rounded-3xl border border-border bg-muted/10 overflow-hidden">
        <ArchitectureDemo />
      </div>
    ),
  },
  {
    id: "finish",
    title: "Welcome to Eryx",
    description: "Thank you for being part of the journey.",
    icon: Boxes,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    profession: "",
    source: "",
  });

  const nextStep = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      console.log("Onboarding Data:", formData);
      router.push("/home");
    }
  }, [currentStep, formData, router]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const step = STEPS[currentStep];

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6 py-12 overflow-y-auto">
      <div className="w-full max-w-2xl flex flex-col items-center gap-10">
        <div className="w-full flex flex-col items-center gap-6">
          {/* Text Content */}
          <div className="space-y-2 flex flex-col items-center justify-center text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {step.title}
            </h1>
            <p className="text-[14.5px] text-muted-foreground leading-relaxed max-w-[420px]">
              {step.description}
            </p>
          </div>

          {/* Visual Content Area */}
          <div className="min-h-[280px] w-full flex items-center justify-center mt-2">
            {step.type === "choice" ? (
              <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-[550px]">
                {step.options?.map((opt) => {
                  const Icon = opt.icon || Globe;
                  const isSelected =
                    formData[step.field as keyof typeof formData] === opt.id;
                  return (
                    <Button
                      key={opt.id}
                      variant={isSelected ? "default" : "outline"}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          [step.field!]: opt.id,
                        }))
                      }
                      className={cn(
                        "flex items-center gap-3 px-5 h-12 rounded-full text-[14.5px] border font-medium transition-all duration-200 justify-start",
                        isSelected
                          ? "shadow-lg shadow-primary/20"
                          : "bg-muted/5 border-border hover:border-primary/40 text-muted-foreground",
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          !isSelected && "text-muted-foreground",
                        )}
                      />
                      <span className="truncate">{opt.label}</span>
                    </Button>
                  );
                })}
              </div>
            ) : (
              step.content
            )}
          </div>
        </div>

        {/* Flat Navigation Controls */}
        <div className="w-full max-w-[500px] pt-4">
          <div className="flex flex-col items-center gap-4 w-full">
            <Button
              onClick={nextStep}
              disabled={
                step.type === "choice" &&
                !formData[step.field as keyof typeof formData]
              }
              className="rounded-full h-14 w-full font-bold text-lg transition-all shadow-xl bg-primary hover:bg-primary/95 text-primary-foreground disabled:opacity-30 disabled:grayscale"
            >
              {currentStep === STEPS.length - 1
                ? "Start Designing"
                : "Continue"}
            </Button>
            
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                className="text-[15px] text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                Back
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
