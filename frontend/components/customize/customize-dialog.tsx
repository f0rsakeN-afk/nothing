"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  User,
  Sparkles,
  MessageSquare,
  Check,
  Info,
  Loader2,
  Wand2,
  Heart,
  Ghost,
  Zap,
  Terminal,
  Hash,
} from "lucide-react";
import {
  customizeSchema,
  type CustomizeSchema,
} from "@/schemas/customize.schema";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CustomizeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const TONES = [
  {
    id: "professional",
    label: "Professional",
    desc: "Formal and direct.",
    icon: User,
  },
  { id: "witty", label: "Witty", desc: "Dry humor & sharp.", icon: Zap },
  { id: "flirty", label: "Flirty", desc: "Playful & warm.", icon: Heart },
  {
    id: "gen-z",
    label: "Gen-Z",
    desc: "No caps, high energy.",
    icon: Sparkles,
  },
  {
    id: "sarcastic",
    label: "Sarcastic",
    desc: "Totally useful. Not.",
    icon: Ghost,
  },
  {
    id: "supportive",
    label: "Supportive",
    desc: "Encouraging & kind.",
    icon: MessageSquare,
  },
  {
    id: "emoji-heavy",
    label: "Emoji-heavy",
    desc: "More stats, more 🚀.",
    icon: Hash,
  },
] as const;

export function CustomizeDialog({
  isOpen,
  onOpenChange,
}: CustomizeDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CustomizeSchema>({
    resolver: zodResolver(customizeSchema),
    defaultValues: {
      preferredName: "",
      responseTone: "professional",
      detailLevel: "balanced",
      interests: "",
    },
  });

  const selectedTone = watch("responseTone");
  const selectedDetail = watch("detailLevel");

  const onSubmit = async (data: CustomizeSchema) => {
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log("Personalization updated:", data);
      toast.success("Personalization updated successfully!");

      // Close
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update personalization");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            Customize your AI
          </DialogTitle>
          <DialogDescription className="text-xs">
            Shape how Eryx interacts with you by personalizing your profile.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6 pt-4 max-h-[75dvh] sm:max-h-full overflow-scroll sm:overflow-auto hide-scrollbar"
        >
          <div className="space-y-5">
            {/* Preferred Name */}
            <div className="space-y-2">
              <Label htmlFor="preferredName" className="text-xs font-medium">
                How should I call you?
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="preferredName"
                  placeholder="Your name"
                  className={cn(
                    "pl-9 h-11 rounded-xl",
                    errors.preferredName &&
                      "border-destructive ring-destructive",
                  )}
                  {...register("preferredName")}
                />
              </div>
              {errors.preferredName && (
                <p className="text-[10px] font-medium text-destructive">
                  {errors.preferredName.message}
                </p>
              )}
            </div>

            {/* Interests */}
            <div className="space-y-2">
              <Label htmlFor="interests" className="text-xs font-medium">
                Your Interests (Optional)
                <span className="ml-2 text-[9px] text-muted-foreground font-normal">
                  Helps with analogies
                </span>
              </Label>
              <Input
                id="interests"
                placeholder="Reading, Tech, Music..."
                className={cn(
                  "h-11 rounded-xl text-sm",
                  errors.interests && "border-destructive ring-destructive",
                )}
                {...register("interests")}
              />
            </div>

            {/* Response Tone */}
            <div className="space-y-3">
              <Label className="text-xs font-medium">Response Tone</Label>
              <div className="grid grid-cols-3 gap-2">
                {TONES.map((tone) => (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => setValue("responseTone", tone.id)}
                    className={cn(
                      "flex flex-col items-start p-2.5 rounded-xl border text-left transition-all relative overflow-hidden group min-h-[70px]",
                      selectedTone === tone.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-border/80 hover:bg-muted/50",
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className="flex items-center gap-1.5">
                        <tone.icon
                          className={cn(
                            "w-3 h-3",
                            selectedTone === tone.id
                              ? "text-primary"
                              : "text-muted-foreground",
                          )}
                        />
                        <span className="text-[10px] font-semibold text-foreground truncate">
                          {tone.label}
                        </span>
                      </div>
                      {selectedTone === tone.id && (
                        <Check className="w-3 h-3 text-primary shrink-0" />
                      )}
                    </div>
                    <span className="text-[9px] text-muted-foreground leading-tight line-clamp-2">
                      {tone.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Detail Level - Visual Demo */}
            <div className="space-y-3">
              <Label className="text-xs font-medium">Knowledge Detail</Label>
              <div className="grid grid-cols-3 gap-3">
                {(["concise", "balanced", "detailed"] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setValue("detailLevel", level)}
                    className={cn(
                      "flex flex-col items-center p-4 rounded-xl border transition-all gap-3",
                      selectedDetail === level
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-border/80 hover:bg-muted/10 font-medium",
                    )}
                  >
                    <div className="space-y-1.5 w-full">
                      <div
                        className={cn(
                          "h-1.5 rounded-full",
                          selectedDetail === level
                            ? "bg-primary"
                            : "bg-muted-foreground/30",
                        )}
                        style={{ width: "100%" }}
                      ></div>
                      {(level === "balanced" || level === "detailed") && (
                        <div
                          className={cn(
                            "h-1.5 rounded-full",
                            selectedDetail === level
                              ? "bg-primary/60"
                              : "bg-muted-foreground/20",
                          )}
                          style={{ width: "80%" }}
                        ></div>
                      )}
                      {level === "detailed" && (
                        <div
                          className={cn(
                            "h-1.5 rounded-full",
                            selectedDetail === level
                              ? "bg-primary/30"
                              : "bg-muted-foreground/10",
                          )}
                          style={{ width: "60%" }}
                        ></div>
                      )}
                      {level === "detailed" && (
                        <div className="flex gap-1 pt-1 opacity-40">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/40"></div>
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/40"></div>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] capitalize font-semibold tracking-wide">
                      {level}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/30 border border-border/50 transition-all duration-300">
                <Info className="w-3 h-3 text-muted-foreground shrink-0" />
                <p className="text-[9px] text-muted-foreground leading-tight">
                  {selectedDetail === "concise" &&
                    "Get straight to the point with brief answers."}
                  {selectedDetail === "balanced" &&
                    "The perfect mix of explanation and code."}
                  {selectedDetail === "detailed" &&
                    "Deep dives with full context and examples."}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl h-11"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl h-11 px-8 gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Apply Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
