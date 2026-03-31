"use client";

import * as React from "react";
import { Check } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FORMATS = [
  {
    id: "md",
    label: "Markdown",
    ext: ".md",
    description: "Best for developers",
  },
  {
    id: "pdf",
    label: "PDF",
    ext: ".pdf",
    description: "Ready to share or print",
  },
  {
    id: "docx",
    label: "Word",
    ext: ".docx",
    description: "Editable in Word / Docs",
  },
  {
    id: "txt",
    label: "Plain text",
    ext: ".txt",
    description: "Simple and universal",
  },
] as const;

type FormatId = (typeof FORMATS)[number]["id"];

interface DownloadChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
}

export function DownloadChatDialog({
  open,
  onOpenChange,
  title,
}: DownloadChatDialogProps) {
  const [selected, setSelected] = React.useState<FormatId>("md");

  const handleDownload = () => {
    // wire up to backend later
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Download conversation</DialogTitle>
          <DialogDescription>
            Choose a format to export &ldquo;{title}&rdquo;.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {FORMATS.map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => setSelected(fmt.id)}
              className={cn(
                "relative flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-all",
                selected === fmt.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:border-border/80 hover:bg-muted/40",
              )}
            >
              {selected === fmt.id && (
                <Check className="absolute top-2.5 right-2.5 h-3 w-3 text-primary" />
              )}
              <span className="text-[13px] font-semibold text-foreground">
                {fmt.label}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {fmt.ext}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                {fmt.description}
              </span>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="lg"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button size="lg" onClick={handleDownload}>
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
