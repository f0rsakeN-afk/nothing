"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatedPlaceholder } from "@/components/ui/animated-placeholder";
import { PlusMenu } from "./plus-menu";
import { SendButton } from "./send-button";
import { FilePreviews } from "./file-previews";
import { VoiceButton } from "./voice-button";
import { useSpeechToText } from "./use-speech-to-text";

const PLACEHOLDERS = [
  "Ask anything…",
  "What are you building today?",
  "Explain this like I'm five…",
  "Why is my code crying at 2am?",
  "Debug this, please. I'm begging.",
  "Help me write something brilliant…",
  "What's the best way to do this?",
  "I swear this worked yesterday…",
  "Turn this chaos into something clean.",
  "Summarize, simplify, or just vibe with me.",
];

interface Attachment {
  file: File;
  id: string;
  preview?: string;
}

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  className,
}: ChatInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isComposing, setIsComposing] = React.useState(false);
  const [webSearch, setWebSearch] = React.useState(false);
  const [isMultiline, setIsMultiline] = React.useState(false);
  const [files, setFiles] = React.useState<Attachment[]>([]);

  const { isListening, interimText, toggleListening, isSupported } =
    useSpeechToText({
      onResult: (text) => {
        onChange(value ? `${value.trim()} ${text}` : text);
      },
    });

  const isEmpty = !value.trim() && files.length === 0 && !interimText;

  const syncHeight = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;

    if (!value && files.length === 0 && !interimText) {
      el.style.height = "auto";
      setIsMultiline(false);
      return;
    }

    el.style.height = "auto";
    const scHeight = el.scrollHeight;
    el.style.height = `${Math.min(scHeight, 200)}px`;
    setIsMultiline(scHeight > 38 || files.length > 0 || !!interimText);
  }, [value, files.length, interimText]);

  React.useLayoutEffect(() => {
    syncHeight();
  }, [syncHeight]);

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value),
    [onChange],
  );

  const handleFileClick = React.useCallback(
    () => fileInputRef.current?.click(),
    [],
  );

  const handleFileChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files || []);
      if (selected.length === 0) return;

      const newFiles = selected.map((file) => ({
        file,
        id: Math.random().toString(36).substring(7),
        preview: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined,
      }));

      setFiles((prev) => [...prev, ...newFiles]);
      if (e.target) e.target.value = "";
    },
    [],
  );

  const removeFile = React.useCallback((id: string) => {
    setFiles((prev) => {
      const filtered = prev.filter((f) => f.id !== id);
      const removed = prev.find((f) => f.id === id);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return filtered;
    });
  }, []);

  const handleSubmit = React.useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed && files.length === 0) return;
    onSubmit(trimmed);
  }, [value, onSubmit, files.length]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !isComposing) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit, isComposing],
  );

  return (
    <TooltipProvider delay={500}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
      />

      <motion.div
        layout
        initial={false}
        animate={{
          borderRadius: isMultiline ? 24 : 21,
          transition: { type: "spring", stiffness: 300, damping: 30 },
        }}
        className={cn(
          "relative flex w-full transition-colors duration-300",
          "bg-background border border-input shadow font-sans",
          "focus-within:border-primary/50 focus-within:ring-[3px] focus-within:ring-primary/10",
          isMultiline
            ? "flex-col p-2"
            : "flex-row items-center h-[42px] px-1.5 py-1",
          className,
        )}
      >
        <motion.div
          layout
          className={cn(
            "flex flex-1 items-center min-w-0 font-sans",
            isMultiline ? "flex-col items-stretch px-2 pt-1" : "flex-row px-1",
          )}
        >
          <div className="flex flex-1 items-center min-w-0">
            <AnimatePresence mode="popLayout" initial={false}>
              {!isMultiline && (
                <motion.div
                  layoutId="plus-wrapper"
                  initial={{ opacity: 0, scale: 0.8, x: -5 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: -5 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center shrink-0 pr-2"
                >
                  <PlusMenu
                    onFileSelect={handleFileClick}
                    webSearch={webSearch}
                    setWebSearch={setWebSearch}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative flex-1 min-w-0">
              <FilePreviews files={files} onRemove={removeFile} />

              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={value}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  rows={1}
                  autoFocus
                  className={cn(
                    "block w-full resize-none bg-transparent",
                    "py-1.5 text-sm leading-relaxed text-foreground",
                    "placeholder:text-transparent outline-none hide-scrollbar",
                    isListening && "text-transparent caret-foreground",
                  )}
                />

                {/* Ghost Text Overlay for Real-time Transcription */}
                {isListening && (
                  <div className="pointer-events-none absolute inset-0 py-1.5 text-sm leading-relaxed whitespace-pre-wrap break-words overflow-hidden">
                    <span className="text-foreground">{value}</span>
                    <span className="text-muted-foreground/40">
                      {interimText}
                    </span>
                  </div>
                )}
              </div>

              <motion.div
                layout
                className={cn(
                  "pointer-events-none absolute left-0 text-sm leading-relaxed text-muted-foreground/40 transition-colors duration-200",
                  "truncate whitespace-nowrap pr-14",
                  isMultiline ? "top-1.5" : "top-1/2 -translate-y-1/2",
                )}
              >
                <AnimatedPlaceholder
                  placeholders={PLACEHOLDERS}
                  active={isEmpty}
                  className="m-0"
                />
              </motion.div>
            </div>

            <AnimatePresence mode="popLayout" initial={false}>
              {!isMultiline && (
                <motion.div
                  layoutId="voice-wrapper"
                  initial={{ opacity: 0, scale: 0.8, x: 5 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 5 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center shrink-0 pl-2"
                >
                  <VoiceButton
                    isListening={isListening}
                    toggleListening={toggleListening}
                    isSupported={isSupported}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="popLayout" initial={false}>
              {!isMultiline && (
                <motion.div
                  layoutId="send-wrapper"
                  initial={{ opacity: 0, scale: 0.8, x: 5 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 5 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center shrink-0 pl-2"
                >
                  <SendButton onSubmit={handleSubmit} disabled={isEmpty} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <AnimatePresence mode="popLayout">
          {isMultiline && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 8, filter: "blur(4px)", transition: { duration: 0.15 } }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex items-center justify-between mt-1 px-1 pb-1"
            >
              <motion.div layoutId="plus-wrapper">
                <PlusMenu
                  onFileSelect={handleFileClick}
                  webSearch={webSearch}
                  setWebSearch={setWebSearch}
                />
              </motion.div>
              <div className="flex items-center gap-1">
                <motion.div layoutId="voice-wrapper">
                  <VoiceButton
                    isListening={isListening}
                    toggleListening={toggleListening}
                    isSupported={isSupported}
                  />
                </motion.div>
                <motion.div layoutId="send-wrapper">
                  <SendButton onSubmit={handleSubmit} disabled={isEmpty} />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </TooltipProvider>
  );
}
