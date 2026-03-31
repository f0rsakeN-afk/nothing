"use client";

import { useState, useCallback, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Terminal, Database, Network, 
  ChevronRight, ChevronLeft, 
  Heart, Cpu, Boxes, Activity,
  MousePointer2
} from "lucide-react";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OnboardingModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = [
  {
    id: "welcome",
    title: "Welcome to Eryx",
    description: "The intelligent workspace for modern system design and context-aware research.",
    icon: Terminal,
    content: (
      <div className="relative group w-full max-w-[280px] mx-auto">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-primary/40 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
        <div className="relative bg-background border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-[13px] font-semibold">Ready to build?</p>
            <p className="text-[11px] text-muted-foreground whitespace-nowrap">Engineering-first insights.</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "search",
    title: "Deep RAG Retrieval",
    description: "Our retrieval-augmented generation engine pulls verified data from trusted technical documentation.",
    icon: Database,
    content: (
      <div className="space-y-4 w-full">
        <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30 max-w-[280px] mx-auto">
          <div className="w-8 h-8 rounded bg-primary/5 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="h-full w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent"
            />
          </div>
        </div>
        <p className="text-[10px] text-center text-muted-foreground italic">"Querying deep knowledge graphs..."</p>
      </div>
    )
  },
  {
    id: "design",
    title: "System Architecture",
    description: "Turn technical specifications into interactive diagrammatic abstractions instantly with React Flow.",
    icon: Network,
    content: (
      <div className="relative h-28 w-full max-w-[280px] mx-auto rounded-xl border border-border overflow-hidden bg-muted/20">
        <div className="absolute inset-0 grid grid-cols-5 grid-rows-3 gap-2 p-2">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-md border border-border bg-background flex items-center justify-center h-6"
            >
              <div className="w-1 h-1 rounded-full bg-primary/30"></div>
            </motion.div>
          ))}
          <motion.div 
            animate={{ 
              x: [0, 40, 20, 0],
              y: [0, 20, 10, 0]
            }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <MousePointer2 className="w-4 h-4 text-primary drop-shadow-xl" />
          </motion.div>
        </div>
      </div>
    )
  },
  {
    id: "finish",
    title: "Start Building",
    description: "Everything is set up. Begin your next technical deep-dive with Eryx today.",
    icon: Heart,
    content: (
      <div className="flex flex-col items-center justify-center py-2 h-full">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12 }}
          className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-4 border border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.05)]"
        >
          <Boxes className="w-8 h-8 text-primary" />
        </motion.div>
        <p className="text-[11px] font-medium text-muted-foreground">Engineering first, always.</p>
      </div>
    )
  }
];

export const OnboardingModal = memo(({ isOpen, onOpenChange }: OnboardingModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const resetAndClose = useCallback(() => {
    onOpenChange(false);
    // Slight delay before resetting step to allow exit animation to finish
    setTimeout(() => setCurrentStep(0), 300);
  }, [onOpenChange]);

  const nextStep = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      resetAndClose();
    }
  }, [currentStep, resetAndClose]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const step = STEPS[currentStep];

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) resetAndClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden bg-background border-border shadow-2xl">
        <div className="relative min-h-[480px] p-8 pt-12 flex flex-col justify-between text-center overflow-hidden">
          {/* Static Background Flare - Matches Theme */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-48 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pointer-events-none" />

          <div className="flex-1 flex flex-col justify-center gap-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="space-y-6 flex flex-col items-center"
              >
                {/* Technical Icons - Replaced 'AI Vibe' with Engineering icons */}
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-primary/10 shadow-sm border border-primary/20">
                  <step.icon className="w-7 h-7 text-primary" />
                </div>

                {/* Fixed Height Text Content to prevent jumping */}
                <div className="space-y-2 h-[80px] overflow-hidden">
                  <h3 className="text-xl font-bold tracking-tight">{step.title}</h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed max-w-[260px] mx-auto">
                    {step.description}
                  </p>
                </div>

                {/* Fixed Height Visual Demo Area */}
                <div className="h-[120px] w-full flex items-center justify-center overflow-hidden">
                  {step.content}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="pt-4 space-y-6">
            {/* Progress Pill */}
            <div className="flex justify-center gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    currentStep === i ? "w-6 bg-primary" : "w-1.5 bg-muted"
                  )}
                />
              ))}
            </div>

            {/* Stable Navigation Buttons */}
            <div className="flex items-center gap-3">
              {currentStep > 0 && (
                <Button
                  variant="ghost"
                  onClick={prevStep}
                  className="rounded-xl h-11 px-4 text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              )}
              <Button
                onClick={nextStep}
                className="rounded-xl h-11 flex-1 font-semibold text-sm transition-all shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {currentStep === STEPS.length - 1 ? "Start Designing" : "Continue"}
                {currentStep !== STEPS.length - 1 && <ChevronRight className="ml-2 w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

OnboardingModal.displayName = "OnboardingModal";
