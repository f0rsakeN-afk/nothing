"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bug, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/sileo-toast";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

interface ReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const REPORT_REASONS = [
  { value: "bug", label: "Bug report" },
  { value: "feature", label: "Feature request" },
  { value: "content", label: "Inappropriate content" },
  { value: "performance", label: "Performance issue" },
  { value: "other", label: "Other" },
];

export function ReportDialog({ isOpen, onOpenChange }: ReportDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [reason, setReason] = React.useState<string>("");
  const handleReasonChange = (value: string | null) => {
    if (value !== null) setReason(value);
  };
  const [description, setDescription] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason || !description.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, description }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit report");
      }

      toast.success("Report submitted. Thank you!");
      handleClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit report",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-destructive" />
            Report an Issue
          </DialogTitle>
          <DialogDescription className="text-xs">
            Help us improve by reporting bugs, performance issues, or
            inappropriate content.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="report-reason" className="text-xs font-medium">
              Issue type <span className="text-destructive">*</span>
            </Label>
            <Select value={reason} onValueChange={handleReasonChange}>
              <SelectTrigger
                id="report-reason"
                className="h-10 rounded-lg text-sm w-full"
              >
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-description" className="text-xs font-medium">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="report-description"
              placeholder="Describe the issue in detail. Include steps to reproduce if applicable."
              className="min-h-[120px] resize-none rounded-lg text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-xl h-10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !reason || !description.trim()}
              className="rounded-xl h-10 px-8"
              variant="destructive"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Report"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
