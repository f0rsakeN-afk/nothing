"use client";

import { createContext, useContext } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MediaType = "image" | "video" | "audio" | "link";

export interface MediaItem {
  type: MediaType;
  src: string;
  alt?: string;   // image alt / display label
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface MediaContextValue {
  openMedia: (item: MediaItem) => void;
}

export const MediaContext = createContext<MediaContextValue>({
  openMedia: () => {},
});

export function useMediaContext() {
  return useContext(MediaContext);
}

// ---------------------------------------------------------------------------
// Helper — infer media type from a URL extension
// ---------------------------------------------------------------------------

const IMAGE_EXT  = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "svg"]);
const VIDEO_EXT  = new Set(["mp4", "webm", "mov", "ogv", "avi"]);
const AUDIO_EXT  = new Set(["mp3", "wav", "ogg", "m4a", "flac", "aac"]);

export function detectMediaType(url: string): MediaType {
  const clean = url.split("?")[0].split("#")[0];
  const ext   = clean.split(".").pop()?.toLowerCase() ?? "";
  if (IMAGE_EXT.has(ext))  return "image";
  if (VIDEO_EXT.has(ext))  return "video";
  if (AUDIO_EXT.has(ext))  return "audio";
  return "link";
}
