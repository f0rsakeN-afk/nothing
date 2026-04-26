"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
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
  ArrowRight,
  Loader2,
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
    title: "How did you find us?",
    description: "Help us understand how to reach more people like you.",
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
    title: "You're all set",
    description: "Your workspace is ready. Start exploring.",
    icon: Boxes,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    profession: "",
    source: "",
  });

  const step = STEPS[currentStep];

  const isChoiceStep = step.type === "choice";
  const canProceed = !isChoiceStep || !!formData[step.field as keyof typeof formData];
  const isLastStep = currentStep === STEPS.length - 1;

  const handleComplete = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Invalidate auth status cache so home page sees updated seenOnboarding
        await queryClient.invalidateQueries({ queryKey: ["auth-status"] });
        // Force immediate refetch
        await queryClient.refetchQueries({ queryKey: ["auth-status"] });
        // Save profession to cookie for persistence (localStorage can be cleared)
        if (formData.profession) {
          document.cookie = `eryx_profession=${formData.profession}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
          localStorage.setItem("eryx_profession", formData.profession);
        }
        router.push("/home");
      } else {
        const text = await response.text();
        console.error("Onboarding failed:", response.status, text);
        router.push("/home");
      }
    } catch (error) {
      console.error("Onboarding error:", error);
      router.push("/home");
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, router]);

  const nextStep = useCallback(() => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep, handleComplete]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6 py-12 overflow-y-auto">
      <div className="w-full max-w-2xl flex flex-col items-center gap-10">
        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                idx === currentStep
                  ? "w-8 bg-primary"
                  : idx < currentStep
                  ? "w-1.5 bg-primary/50"
                  : "w-1.5 bg-muted"
              )}
            />
          ))}
        </div>

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
            {isChoiceStep ? (
              <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-[550px]">
                {step.options?.map((opt) => {
                  const Icon = opt.icon || Globe;
                  const isSelected =
                    formData[step.field as keyof typeof formData] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          [step.field!]: opt.id,
                        }))
                      }
                      className={cn(
                        "flex items-center gap-3 px-5 h-12 rounded-full text-[14.5px] border font-medium transition-all duration-200 justify-start bg-background",
                        isSelected
                          ? "border-primary bg-primary/5 text-primary shadow-lg shadow-primary/10"
                          : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          isSelected ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      <span className="truncate">{opt.label}</span>
                    </button>
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
              disabled={!canProceed || isSubmitting}
              className="rounded-full h-14 w-full font-bold text-lg transition-all shadow-xl bg-primary hover:bg-primary/95 text-primary-foreground disabled:opacity-30 disabled:grayscale gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Setting up...
                </>
              ) : isLastStep ? (
                <>
                  Launch workspace
                  <ArrowRight className="w-5 h-5" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>

            {currentStep > 0 && !isSubmitting && (
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