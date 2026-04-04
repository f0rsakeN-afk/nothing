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
          className="flex flex-wrap gap-2 mb-2 pt-1 overflow-hidden"
        >
          {files.map((file) => (
            <motion.div
              key={file.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group relative flex items-center shrink-0 rounded-xl bg-white/5 border border-white/10 overflow-visible"
            >
              <div className="h-10 w-10 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-sm transition-transform group-hover:scale-[1.02]">
                {file.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.preview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-white/10 flex items-center justify-center">
                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <button
                onClick={() => onRemove(file.id)}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-foreground text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-90 shadow-lg border border-background/20"
                aria-label="Remove attachment"
              >
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

FilePreviews.displayName = "FilePreviews";
