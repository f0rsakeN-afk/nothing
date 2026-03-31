"use client";

import { memo, useState, useCallback } from "react";
import {
  Download,
  ExternalLink,
  X,
  Link2,
  Volume2,
  Video,
  AlertCircle,
} from "lucide-react";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { MediaItem } from "./media-context";

// ---------------------------------------------------------------------------
// Image view
// ---------------------------------------------------------------------------

const ImageView = memo(function ImageView({ item }: { item: MediaItem }) {
  const [error, setError] = useState(false);

  const handleDownload = useCallback(async () => {
    try {
      const res = await fetch(item.src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), {
        href: url,
        download: item.alt || "image",
      });
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // CORS fallback — open in new tab
      window.open(item.src, "_blank", "noopener,noreferrer");
    }
  }, [item.src, item.alt]);

  return (
    <div className="flex flex-col">
      {/* Image */}
      <div className="flex max-h-[70vh] items-center justify-center overflow-hidden bg-muted/30 p-4">
        {error ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground py-12">
            <AlertCircle className="h-8 w-8 opacity-40" />
            <p className="text-sm">Failed to load image</p>
          </div>
        ) : (
          <img
            src={item.src}
            alt={item.alt ?? ""}
            onError={() => setError(true)}
            className="max-h-[65vh] max-w-full rounded-lg object-contain"
          />
        )}
      </div>

      {/* Footer */}
      {item.alt && (
        <p className="px-5 py-2 text-center text-[12px] text-muted-foreground border-t border-border/50">
          {item.alt}
        </p>
      )}
      <div className="flex items-center justify-between gap-3 border-t border-border/50 px-5 py-3">
        <a
          href={item.src}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground  "
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open original
        </a>
        <Button
          size="sm"
          onClick={handleDownload}
          className="h-8 gap-1.5 text-[12px]"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </Button>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Video view
// ---------------------------------------------------------------------------

const VideoView = memo(function VideoView({ item }: { item: MediaItem }) {
  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center gap-2.5 border-b border-border/50 px-5 py-3">
        <Video className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="truncate text-[13px] font-medium text-foreground">
          {item.alt || item.src.split("/").pop() || "Video"}
        </p>
      </div>
      <div className="bg-black/5 p-4">
        <video
          src={item.src}
          controls
          autoPlay={false}
          className="w-full max-h-[60vh] rounded-lg"
        />
      </div>
      <div className="flex justify-end px-5 py-3 border-t border-border/50">
        <a href={item.src} target="_blank" rel="noopener noreferrer">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-[12px]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in new tab
          </Button>
        </a>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Audio view
// ---------------------------------------------------------------------------

const AudioView = memo(function AudioView({ item }: { item: MediaItem }) {
  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center gap-2.5 border-b border-border/50 px-5 py-3">
        <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="truncate text-[13px] font-medium text-foreground">
          {item.alt || item.src.split("/").pop() || "Audio"}
        </p>
      </div>
      <div className="flex flex-col items-center gap-4 px-5 py-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Volume2 className="h-7 w-7 text-primary" />
        </div>
        <audio src={item.src} controls className="w-full" />
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Link view
// ---------------------------------------------------------------------------

const LinkView = memo(function LinkView({ item }: { item: MediaItem }) {
  const hostname = (() => {
    try {
      return new URL(item.src).hostname;
    } catch {
      return item.src;
    }
  })();

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center gap-2.5 border-b border-border/50 px-5 py-3">
        <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="truncate text-[13px] font-medium text-foreground">
          {item.alt || hostname}
        </p>
      </div>
      <div className="px-5 py-5 space-y-3">
        <div className="rounded-lg bg-muted/40 px-3.5 py-2.5 border border-border/60">
          <p className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wide mb-1">
            URL
          </p>
          <p className="text-[12.5px] text-foreground/80 break-all font-mono leading-relaxed">
            {item.src}
          </p>
        </div>
      </div>
      <div className="flex justify-end px-5 pb-5">
        <a href={item.src} target="_blank" rel="noopener noreferrer">
          <Button size="sm" className="h-8 gap-1.5 text-[12px]">
            <ExternalLink className="h-3.5 w-3.5" />
            Open link
          </Button>
        </a>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// MediaModal — exported, dynamically importable
// ---------------------------------------------------------------------------

interface MediaModalProps {
  item: MediaItem | null;
  onClose: () => void;
}

export const MediaModal = memo(function MediaModal({
  item,
  onClose,
}: MediaModalProps) {
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose],
  );

  return (
    <Dialog open={!!item} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={
          item?.type === "image"
            ? "sm:max-w-3xl p-0 gap-0 overflow-hidden"
            : "sm:max-w-lg p-0 gap-0 overflow-hidden"
        }
      >
        {/* Close button */}
        <DialogClose
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 text-muted-foreground backdrop-blur-sm   hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </DialogClose>

        {item?.type === "image" && <ImageView item={item} />}
        {item?.type === "video" && <VideoView item={item} />}
        {item?.type === "audio" && <AudioView item={item} />}
        {item?.type === "link" && <LinkView item={item} />}
      </DialogContent>
    </Dialog>
  );
});
