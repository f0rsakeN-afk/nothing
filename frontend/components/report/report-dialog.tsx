"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ImagePlus, X } from "lucide-react";
import Image from "next/image";
import { reportSchema, type ReportSchema } from "@/schemas/report.schema";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportDialog({ isOpen, onOpenChange }: ReportDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ReportSchema>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reason: "",
      description: "",
      email: "",
    },
  });

  const onSubmit = async (data: ReportSchema) => {
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log("Report submitted:", data);
      toast.success("Report submitted successfully");

      // Reset and close
      handleReset();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    reset();
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setValue("image", file, { shouldValidate: true });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setValue("image", null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const reasonValue = watch("reason");

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleReset();
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Report an Issue</DialogTitle>
          <DialogDescription className="text-xs">
            Let us know if you found a bug or inappropriate content. We review
            all reports carefully.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="reason"
                className={`text-xs ${errors.reason ? "text-destructive" : ""}`}
              >
                Reason
              </Label>
              <Select
                value={reasonValue}
                onValueChange={(val) => {
                  if (val) setValue("reason", val, { shouldValidate: true });
                }}
              >
                <SelectTrigger
                  id="reason"
                  className={`h-10 w-full ${
                    errors.reason ? "border-destructive ring-destructive" : ""
                  }`}
                >
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spam">Spam or Abuse</SelectItem>
                  <SelectItem value="bug">Technical Bug</SelectItem>
                  <SelectItem value="inappropriate">
                    Inappropriate Content
                  </SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="email"
                className={`text-xs ${errors.email ? "text-destructive" : ""}`}
              >
                Email (Optional)
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                className={`h-9 rounded-lg text-xs ${
                  errors.email ? "border-destructive ring-destructive" : ""
                }`}
                {...register("email")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="description"
              className={`text-xs ${
                errors.description ? "text-destructive" : ""
              }`}
            >
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Please provide details about the issue..."
              className={`min-h-[100px] resize-none rounded-lg text-sm ${
                errors.description ? "border-destructive ring-destructive" : ""
              }`}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-[10px] font-medium text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Attachment (Optional)</Label>
            <div className="flex items-center gap-3">
              {!imagePreview ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all w-full text-left"
                >
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                    <ImagePlus className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-foreground">
                      Upload Screenshot
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      Max 5MB • PNG, JPG, WEBP
                    </p>
                  </div>
                </button>
              ) : (
                <div className="relative group w-full">
                  <div className="flex items-center gap-3 p-2 rounded-lg border border-border bg-muted/30">
                    <div className="relative w-12 h-12 rounded overflow-hidden shadow-sm border border-border bg-background">
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium text-foreground truncate">
                        {watch("image")?.name || "screenshot.png"}
                      </p>
                      <p className="text-[9px] text-muted-foreground uppercase">
                        {Math.round((watch("image")?.size || 0) / 1024)} KB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={removeImage}
                      className="h-7 w-7 rounded-md hover:bg-destructive/10 hover:text-destructive  "
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={onImageChange}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl h-9 pr-6 pl-6"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
