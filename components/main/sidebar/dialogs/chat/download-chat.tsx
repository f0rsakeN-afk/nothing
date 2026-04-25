"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

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

interface Format {
  id: string;
  labelKey: string;
  ext: string;
  descKey: string;
}

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
  const t = useTranslations();
  const [selected, setSelected] = React.useState<string>("md");

  const FORMATS: Format[] = [
    { id: "md", labelKey: "download.formatMd", ext: ".md", descKey: "download.mdDesc" },
    { id: "pdf", labelKey: "download.formatPdf", ext: ".pdf", descKey: "download.pdfDesc" },
    { id: "docx", labelKey: "download.formatDocx", ext: ".docx", descKey: "download.docxDesc" },
    { id: "txt", labelKey: "download.formatTxt", ext: ".txt", descKey: "download.txtDesc" },
  ];

  const handleDownload = () => {
    // wire up to backend later
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("download.title")}</DialogTitle>
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
                {t(fmt.labelKey)}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {fmt.ext}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                {t(fmt.descKey)}
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
            {t("common.cancel")}
          </Button>
          <Button size="lg" onClick={handleDownload}>
            {t("common.download")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
