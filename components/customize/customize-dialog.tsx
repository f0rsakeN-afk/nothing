"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { toast } from "@/components/ui/sileo-toast";

interface CustomizeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

async function fetchCustomize(): Promise<CustomizeSchema> {
  const res = await fetch("/api/customize");
  if (!res.ok) throw new Error("Failed to fetch customize");
  return res.json();
}

async function updateCustomize(data: CustomizeSchema): Promise<CustomizeSchema> {
  const res = await fetch("/api/customize", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update customize");
  return res.json();
}

export function CustomizeDialog({
  isOpen,
  onOpenChange,
}: CustomizeDialogProps) {
  const t = useTranslations("customize");
  const [hasInitialized, setHasInitialized] = useState(false);
  const queryClient = useQueryClient();

  const { data: customizeData, isLoading } = useQuery({
    queryKey: ["customize"],
    queryFn: fetchCustomize,
    enabled: isOpen,
  });

  const mutation = useMutation({
    mutationFn: updateCustomize,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customize"] });
      toast.success(t("successMessage"));
      onOpenChange(false);
    },
    onError: () => {
      toast.error(t("errorMessage"));
    },
  });

  const TONES = [
    { id: "professional", label: t("professional"), desc: t("professionalDesc"), icon: User },
    { id: "witty", label: t("witty"), desc: t("wittyDesc"), icon: Zap },
    { id: "flirty", label: t("flirty"), desc: t("flirtyDesc"), icon: Heart },
    { id: "gen-z", label: t("genZ"), desc: t("genZDesc"), icon: Sparkles },
    { id: "sarcastic", label: t("sarcastic"), desc: t("sarcasticDesc"), icon: Ghost },
    { id: "supportive", label: t("supportive"), desc: t("supportiveDesc"), icon: MessageSquare },
    { id: "emoji-heavy", label: t("emojiHeavy"), desc: t("emojiHeavyDesc"), icon: Hash },
  ] as const;

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
      firstName: "",
      lastName: "",
      preferredName: "",
      responseTone: "professional",
      detailLevel: "balanced",
      interests: "",
    },
  });

  // Reset form when dialog opens and data is loaded
  useEffect(() => {
    if (isOpen && customizeData && !hasInitialized) {
      reset({
        firstName: customizeData.firstName || "",
        lastName: customizeData.lastName || "",
        preferredName: customizeData.preferredName || "",
        responseTone: customizeData.responseTone || "professional",
        detailLevel: customizeData.detailLevel || "balanced",
        interests: customizeData.interests || "",
      });
      setHasInitialized(true);
    }
  }, [isOpen, customizeData, reset, hasInitialized]);

  // Reset initialization state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setHasInitialized(false);
    }
  }, [isOpen]);

  const selectedTone = watch("responseTone");
  const selectedDetail = watch("detailLevel");

  const onSubmit = (data: CustomizeSchema) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            {t("title")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6 pt-4 max-h-[75dvh] sm:max-h-full overflow-scroll sm:overflow-auto hide-scrollbar"
        >
          <div className="space-y-5">
            {/* First Name and Last Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-xs font-medium">
                  {t("firstName")}
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    placeholder={t("firstName")}
                    className="pl-9 h-11 rounded-xl"
                    {...register("firstName")}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-xs font-medium">
                  {t("lastName")}
                </Label>
                <Input
                  id="lastName"
                  placeholder={t("lastName")}
                  className="h-11 rounded-xl"
                  {...register("lastName")}
                />
              </div>
            </div>

            {/* Preferred Name */}
            <div className="space-y-2">
              <Label htmlFor="preferredName" className="text-xs font-medium">
                {t("howShouldICall")}
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="preferredName"
                  placeholder={t("yourName")}
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
                {t("interests")}
                <span className="ml-2 text-[9px] text-muted-foreground font-normal">
                  {t("interestsHint")}
                </span>
              </Label>
              <Input
                id="interests"
                placeholder={t("interestsPlaceholder")}
                className={cn(
                  "h-11 rounded-xl text-sm",
                  errors.interests && "border-destructive ring-destructive",
                )}
                {...register("interests")}
              />
            </div>

            {/* Response Tone */}
            <div className="space-y-3">
              <Label className="text-xs font-medium">{t("responseTone")}</Label>
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
              <Label className="text-xs font-medium">{t("knowledgeDetail")}</Label>
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
                  {selectedDetail === "concise" && t("conciseDesc")}
                  {selectedDetail === "balanced" && t("balancedDesc")}
                  {selectedDetail === "detailed" && t("detailedDesc")}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
              className="rounded-xl h-11"
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-xl h-11 px-8 gap-2"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("saving")}
                </>
              ) : (
                t("applyChanges")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
