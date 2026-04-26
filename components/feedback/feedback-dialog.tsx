"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Star, Loader2, MessageSquare } from "lucide-react";
import { feedbackSchema, type FeedbackSchema } from "@/schemas/feedback.schema";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sileo-toast";
import { useHaptics } from "@/hooks/use-web-haptics";

interface FeedbackDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ isOpen, onOpenChange }: FeedbackDialogProps) {
  const t = useTranslations("feedback");
  const { trigger } = useHaptics();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FeedbackSchema>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      rating: 0,
      comment: "",
      email: "",
    },
  });

  const rating = watch("rating");

  const onSubmit = async (data: FeedbackSchema) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error("Failed to submit feedback");
      }

      trigger("success");
      toast.success(t("successMessage"));

      // Reset and close
      handleReset();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      trigger("error");
      toast.error(t("errorMessage"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    reset();
    setHoverRating(0);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleReset();
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            {t("title")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-xs font-medium text-center block">
                {t("rating")}
              </Label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="transition-transform active:scale-90"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() =>
                      setValue("rating", star, { shouldValidate: true })
                    }
                  >
                    <Star
                      className={cn(
                        "w-8 h-8  ",
                        (hoverRating || rating) >= star
                          ? "fill-primary text-primary"
                          : "fill-muted text-muted-foreground/30",
                      )}
                    />
                  </button>
                ))}
              </div>
              {errors.rating && (
                <p className="text-[10px] font-medium text-destructive text-center">
                  {errors.rating.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="comment"
                className={`text-xs ${errors.comment ? "text-destructive" : ""}`}
              >
                {t("comment")}
              </Label>
              <Textarea
                id="comment"
                placeholder={t("commentPlaceholder")}
                className={`min-h-[120px] resize-none rounded-lg text-sm ${
                  errors.comment ? "border-destructive ring-destructive" : ""
                }`}
                {...register("comment")}
              />
              {errors.comment && (
                <p className="text-[10px] font-medium text-destructive">
                  {errors.comment.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="feedback-email"
                className={`text-xs ${errors.email ? "text-destructive" : ""}`}
              >
                {t("email")}
              </Label>
              <Input
                id="feedback-email"
                type="email"
                placeholder={t("emailPlaceholder")}
                className={`h-10 rounded-lg text-sm ${
                  errors.email ? "border-destructive ring-destructive" : ""
                }`}
                {...register("email")}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl h-10"
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl h-10 px-8"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("sending")}
                </>
              ) : (
                t("send")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
