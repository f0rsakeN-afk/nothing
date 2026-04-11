"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileIcon } from "lucide-react";

interface FileAttachment {
  file: File;
  id: string;
  preview?: string;
}

interface FilePreviewsProps {
  files: FileAttachment[];
  onRemove: (id: string) => void;
}

export const FilePreviews = React.memo(({ files, onRemove }: FilePreviewsProps) => {
  return (
    <AnimatePresence mode="popLayout">
      {files.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-wrap gap-2 overflow-hidden"
        >
          {files.map((file) => (
            <motion.div
              key={file.id}
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.2 }}
              className="group relative flex items-center gap-2.5 rounded-xl bg-muted/70 border border-border px-3 py-2 pr-9"
            >
              {/* Thumbnail / icon */}
              <div className="h-9 w-9 rounded-lg overflow-hidden shrink-0 border border-border/60 shadow-sm">
                {file.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.preview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-muted flex items-center justify-center">
                    <FileIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Filename */}
              <span className="text-[12px] text-foreground/80 font-medium truncate max-w-[140px]">
                {file.file.name}
              </span>

              {/* Remove button */}
              <button
                onClick={() => onRemove(file.id)}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-all"
                aria-label="Remove attachment"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

FilePreviews.displayName = "FilePreviews";
