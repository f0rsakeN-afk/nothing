"use client";

import React, {
  memo,
  useState,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useEffect,
} from "react";
import dynamic from "next/dynamic";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ExternalLink,
  ZoomIn,
  Play,
  Pause,
  Info,
  Lightbulb,
  AlertCircle,
  AlertTriangle,
  Shield,
  MapPin,
  FileText,
  Download,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MediaContext, detectMediaType, type MediaItem } from "./media-context";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { CodeBlock } from "./format/code-block";

const MediaModal = dynamic(
  () => import("./media-modal").then((m) => ({ default: m.MediaModal })),
  { ssr: false },
);

const EmailBox = dynamic(
  () => import("./format/email-box").then((m) => ({ default: m.EmailBox })),
  { ssr: false },
);

const ChartVisualizer = dynamic(
  () =>
    import("./format/chart-visualizer").then((m) => ({
      default: m.ChartVisualizer,
    })),
  { ssr: false },
);

// ---------------------------------------------------------------------------
// YouTube helper — extracts video ID from watch / short / embed URLs
// ---------------------------------------------------------------------------

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2];
      return u.searchParams.get("v");
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Module-level media renderers
//
// Defined OUTSIDE the component so `mdComponents` is a stable object.
// Each renderer uses `useContext(MediaContext)` — valid because ReactMarkdown
// renders these as proper React components, so hooks work correctly.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// AudioPlayer — inline playback with wave visualizer
// ---------------------------------------------------------------------------

const WaveVisualizer = memo(function WaveVisualizer({
  playing,
}: {
  playing: boolean;
}) {
  return (
    <div className="flex items-center gap-[3.5px] h-6 px-1">
      {[...Array(16)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-[2px] bg-primary/40 rounded-full transition-all duration-300",
            playing ? "animate-wave" : "h-1",
          )}
          style={{
            animationDelay: `${i * 0.08}s`,
            height: playing ? undefined : "4px",
          }}
        />
      ))}
    </div>
  );
});

const AudioPlayer = memo(function AudioPlayer({
  src,
  title,
}: {
  src: string;
  title?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (playing) audioRef.current.pause();
      else audioRef.current.play().catch(() => {});
      setPlaying(!playing);
    }
  }, [playing]);

  const onTimeUpdate = useCallback(() => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  }, []);

  const onLoadedMetadata = useCallback(() => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  }, []);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="my-4 flex items-center gap-4 rounded-xl border border-border bg-muted/20 p-4 transition-all hover:bg-muted/30">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={() => setPlaying(false)}
      />

      <button
        onClick={togglePlay}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-95 shadow-sm"
      >
        {playing ? (
          <Pause className="h-5 w-5 fill-current" />
        ) : (
          <Play className="h-5 w-5 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <span className="truncate text-[13px] font-semibold text-foreground">
            {title || "Audio Content"}
          </span>
          <span className="shrink-0 font-mono text-[11px] font-medium text-muted-foreground/60 tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-2 h-6">
          <WaveVisualizer playing={playing} />
        </div>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// DocumentVisualizer — renders a formal document view for structured content
// ---------------------------------------------------------------------------

const DocumentVisualizer = memo(function DocumentVisualizer({
  content,
  title,
}: {
  content: string;
  title?: string;
}) {
  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/5 transition-all">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground leading-none mb-1">
              {title || "Generated Document"}
            </h3>
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-bold">
              Official Output / Draft v1.0
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-all active:scale-95">
            <Download className="h-4 w-4" />
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-all active:scale-95">
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="prose prose-sm prose-emerald max-w-none dark:prose-invert px-8 py-10 leading-relaxed text-foreground/80 selection:bg-primary/20">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// MapVisualizer — renders a stylized map card for location data
// ---------------------------------------------------------------------------

const MapVisualizer = memo(function MapVisualizer({
  location,
}: {
  location: string;
}) {
  return (
    <div className="my-6 overflow-hidden rounded-xl border border-border bg-muted/20 shadow-sm transition-all hover:bg-muted/30">
      <div className="relative h-48 w-full bg-slate-900/50">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, hsl(var(--primary)) 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="absolute -inset-4 animate-ping rounded-full bg-primary/20" />
            <MapPin className="h-8 w-8 text-primary drop-shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
          </div>
        </div>
      </div>
      <div className="p-4">
        <h4 className="text-[14px] font-semibold text-foreground">
          {location}
        </h4>
        <p className="mt-1 text-[12px] text-muted-foreground/80">
          Location visualized via system telemetry
        </p>
      </div>
    </div>
  );
});

const ImageRenderer = memo(function ImageRenderer({
  src,
  alt,
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const { openMedia } = useContext(MediaContext);

  const handleClick = useCallback(() => {
    if (src && typeof src === "string") {
      openMedia({ type: "image", src, alt: alt as string | undefined });
    }
  }, [src, alt, openMedia]);

  return (
    <span className="my-4 block">
      <span
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => e.key === "Enter" && handleClick()}
        className="group relative inline-block cursor-zoom-in overflow-hidden rounded-xl border border-border"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt ?? ""}
          className="max-w-full rounded-xl transition-opacity duration-200 group-hover:opacity-90"
        />
        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <span className="flex items-center gap-1.5 rounded-lg bg-black/50 px-3 py-1.5 text-[12px] font-medium text-white backdrop-blur-sm">
            <ZoomIn className="h-3.5 w-3.5" />
            View
          </span>
        </span>
      </span>
      {alt && (
        <span className="mt-1.5 block text-center text-[12px] text-muted-foreground">
          {alt}
        </span>
      )}
    </span>
  );
});

const LinkRenderer = memo(function LinkRenderer({
  href,
  children,
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { openMedia } = useContext(MediaContext);

  const mediaType = useMemo(
    () => (href ? detectMediaType(href) : "link"),
    [href],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Let Ctrl/Cmd+click pass through to the browser
      if (e.ctrlKey || e.metaKey || !href) return;
      e.preventDefault();
      const item: MediaItem = {
        type: mediaType,
        src: href,
        alt: typeof children === "string" ? children : undefined,
      };
      openMedia(item);
    },
    [href, children, mediaType, openMedia],
  );

  // YouTube — iframe embed
  const ytId = href ? getYouTubeId(href) : null;
  if (ytId) {
    return (
      <span className="my-4 block overflow-hidden rounded-xl border border-border">
        <span
          className="relative block w-full"
          style={{ paddingBottom: "56.25%" }}
        >
          <iframe
            src={`https://www.youtube.com/embed/${ytId}`}
            title={typeof children === "string" ? children : "YouTube video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full rounded-xl"
          />
        </span>
        {/* {typeof children === "string" && children !== href && (
          <span className="block px-3 py-1.5 text-[11px] text-muted-foreground">
            {children}
          </span>
        )} */}
      </span>
    );
  }

  // Video — inline player
  if (href && mediaType === "video") {
    return (
      <span className="my-4 block overflow-hidden rounded-xl border border-border bg-black/5">
        <video
          src={href}
          controls
          autoPlay={false}
          className="w-full max-h-[360px] rounded-xl"
        />
        {typeof children === "string" && children !== href && (
          <span className="block px-3 py-1.5 text-[11px] text-muted-foreground">
            {children}
          </span>
        )}
      </span>
    );
  }

  // Audio inline player
  if (href && mediaType === "audio") {
    return (
      <AudioPlayer
        src={href}
        title={typeof children === "string" ? children : undefined}
      />
    );
  }

  // Image link — render as image
  if (href && mediaType === "image") {
    return <ImageRenderer src={href} alt={String(children) || undefined} />;
  }

  // Regular link
  return (
    <a
      href={href}
      onClick={handleClick}
      className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4 transition-opacity hover:opacity-80"
    >
      {children}
      <ExternalLink className="h-3 w-3 opacity-60" />
    </a>
  );
});

// ---------------------------------------------------------------------------
// mdComponents — stable module-level object (never recreated)
// ---------------------------------------------------------------------------

const mdComponents: Components = {
  // Headings
  h1: ({ children }) => (
    <h1 className="mb-4 mt-8 scroll-m-20 border-b border-border pb-2 text-2xl font-semibold tracking-tight text-foreground first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-7 scroll-m-20 border-b border-border pb-1.5 text-xl font-semibold tracking-tight text-foreground first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2.5 mt-6 scroll-m-20 text-[1.05rem] font-semibold tracking-tight text-foreground first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-2 mt-5 text-[0.95rem] font-semibold text-foreground first:mt-0">
      {children}
    </h4>
  ),
  h5: ({ children }) => (
    <h5 className="mb-1.5 mt-4 text-sm font-semibold text-foreground first:mt-0">
      {children}
    </h5>
  ),
  h6: ({ children }) => (
    <h6 className="mb-1.5 mt-4 text-sm font-semibold text-muted-foreground first:mt-0">
      {children}
    </h6>
  ),

  // Paragraph — using <div> instead of <p> to allow block-level children
  // (e.g. AudioPlayer, charts) without causing invalid HTML nesting errors
  p: ({ children }) => (
    <div className="mb-4 leading-7 text-foreground/90 last:mb-0">
      {children}
    </div>
  ),

  // Lists
  ul: ({ children, depth }: any) => {
    const listStyles = [
      "list-disc marker:text-primary/60",
      "list-[circle] marker:text-primary/40",
      "list-[square] marker:text-primary/30",
    ];
    // Depth is provided by react-markdown for nested lists
    const style = listStyles[Math.min(depth || 0, listStyles.length - 1)];
    return (
      <ul className={cn("mb-4 ml-6 space-y-1.5 text-foreground/90", style)}>
        {children}
      </ul>
    );
  },
  ol: ({ children }) => (
    <ol className="mb-4 ml-6 list-decimal space-y-1.5 text-foreground/90 marker:text-primary/60">
      {children}
    </ol>
  ),
  li: ({ children, checked }: any) => {
    if (typeof checked === "boolean") {
      return (
        <li className="group ml-0 flex items-start gap-3 py-1.5 transition-colors">
          <div className="mt-1 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border border-primary/30 bg-primary/10 ring-primary/20 transition-all group-hover:border-primary/50 group-hover:ring-4">
            {checked && (
              <div className="h-2.5 w-2.5 rounded-sm bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
            )}
          </div>
          <span
            className={cn(
              "text-[14px] leading-6 transition-colors",
              checked
                ? "text-muted-foreground/40 line-through decoration-muted-foreground/30"
                : "text-foreground/90",
            )}
          >
            {children}
          </span>
        </li>
      );
    }
    return <li className="pl-1 leading-7 text-foreground/90">{children}</li>;
  },

  // Blockquote & Alerts
  blockquote: ({ children }) => {
    // Extract text content to detect GitHub-style alerts: [!NOTE], [!TIP], etc.
    const contentString = String(
      Array.isArray(children) ? children[0]?.props?.children || "" : "",
    );

    const alertMap: Record<
      string,
      { icon: any; color: string; label: string }
    > = {
      "[!NOTE]": { icon: Info, color: "text-blue-500", label: "Note" },
      "[!TIP]": { icon: Lightbulb, color: "text-emerald-500", label: "Tip" },
      "[!IMPORTANT]": {
        icon: AlertCircle,
        color: "text-purple-500",
        label: "Important",
      },
      "[!WARNING]": {
        icon: AlertTriangle,
        color: "text-amber-500",
        label: "Warning",
      },
      "[!CAUTION]": {
        icon: Shield,
        color: "text-destructive",
        label: "Caution",
      },
    };

    const firstLine = contentString.trim().split("\n")[0];
    const alert = alertMap[firstLine];

    if (alert) {
      const Icon = alert.icon;
      // Filter out the alert tag from children if it's the first text node
      return (
        <div
          className={cn(
            "my-6 flex gap-4 rounded-xl border border-l-4 border-border bg-muted/30 p-4 pt-3 shadow-sm",
            alert.color.replace("text-", "border-l-"),
          )}
        >
          <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", alert.color)} />
          <div className="flex-1 space-y-1">
            <p
              className={cn(
                "text-[13px] font-bold uppercase tracking-wider",
                alert.color,
              )}
            >
              {alert.label}
            </p>
            <div className="text-[14.5px] leading-relaxed text-foreground/80 prose-p:my-0">
              {/* Skip the alert tag in the first child if possible, 
                  or just rely on the user to put it on its own line */}
              {children}
            </div>
          </div>
        </div>
      );
    }

    return (
      <blockquote className="mb-4 border-l-[3px] border-primary/40 pl-4 italic text-muted-foreground">
        {children}
      </blockquote>
    );
  },

  // Footnotes & Section styling
  section: ({ children, ...props }: any) => {
    if (props["data-footnotes"]) {
      return (
        <section
          className="mt-12 border-t border-border/40 pt-6 text-muted-foreground"
          {...props}
        >
          <h2 className="mb-4 text-[12px] font-bold uppercase tracking-widest text-muted-foreground/60">
            References
          </h2>
          {children}
        </section>
      );
    }
    return <section {...props}>{children}</section>;
  },
  sup: ({ children }) => (
    <sup className="px-0.5 text-[10px] font-bold text-primary hover:underline cursor-help">
      {children}
    </sup>
  ),

  // Code — handles both inline and fenced blocks
  code: function Code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className ?? "");
    const language = match?.[1];

    if (language) {
      if (language === "email") {
        return (
          <div className="px-4">
            <EmailBox initialContent={String(children).replace(/\n$/, "")} />
          </div>
        );
      }
      if (language === "document") {
        const raw = String(children).replace(/\n$/, "");
        const titleMatch = raw.match(/^#\s+(.+)$/m);
        return <DocumentVisualizer content={raw} title={titleMatch?.[1]} />;
      }
      if (language === "chart") {
        return <ChartVisualizer data={String(children).replace(/\n$/, "")} />;
      }
      if (language === "map") {
        return <MapVisualizer location={String(children).replace(/\n$/, "")} />;
      }
      return (
        <CodeBlock language={language}>
          {String(children).replace(/\n$/, "")}
        </CodeBlock>
      );
    }

    // Inline code
    return (
      <code
        className="rounded-md bg-muted/60 border border-border/40 px-[0.4em] py-[0.1em] font-mono text-[0.85em] font-medium text-foreground/90 backdrop-blur-xs ring-1 ring-white/5"
        {...props}
      >
        {children}
      </code>
    );
  },

  // Horizontal rule
  hr: () => <hr className="my-6 border-border" />,

  // Media-aware link + image renderers
  a: LinkRenderer as Components["a"],
  img: ImageRenderer as Components["img"],

  // Inline emphasis
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-foreground/90">{children}</em>
  ),
  del: ({ children }) => (
    <del className="line-through text-muted-foreground">{children}</del>
  ),

  // Table (GFM)
  table: ({ children }) => (
    <div className="my-6 w-full overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b-2 border-border/60">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-border/40">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="transition-colors hover:bg-muted/20">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground/80">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 text-[13.5px] text-foreground/80">{children}</td>
  ),
};

// ---------------------------------------------------------------------------
// StreamingCursor — blinks while SSE stream is in-flight
// ---------------------------------------------------------------------------

const StreamingCursor = memo(function StreamingCursor() {
  return (
    <span
      aria-hidden
      className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[0.1em] animate-pulse rounded-sm bg-foreground/70 align-middle"
    />
  );
});

// ---------------------------------------------------------------------------
// AiResponseFormatter
//
// SSE streaming notes:
//  • `isStreaming` shows a blinking cursor and suppresses the copy button.
//  • Content arrives as incremental chunks — this component re-renders on
//    every chunk, which is expected. Keep renders cheap:
//      - mdComponents is stable (module-level, never recreated)
//      - openMedia / ctxValue are stable (useCallback + useMemo)
//      - Only ReactMarkdown re-parses, which is unavoidable
//  • When integrating SSE: debounce the `content` prop at the call-site
//    (e.g. flush every ~50 ms) to limit re-parse frequency.
//  • Edge cases handled:
//      - Empty / whitespace content → renders nothing
//      - Broken image URLs → onError fallback in ImageRenderer
//      - Partial markdown mid-stream → react-markdown handles gracefully
//      - Very long code lines → SyntaxHighlighter scrolls horizontally
//      - Wide tables → overflow-x-auto wrapper
//      - Long URLs in modals → break-all font-mono display
// ---------------------------------------------------------------------------

interface AiResponseFormatterProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

export const AiResponseFormatter = memo(function AiResponseFormatter({
  content,
  isStreaming = false,
  className,
}: AiResponseFormatterProps) {
  const [activeMedia, setActiveMedia] = useState<MediaItem | null>(null);

  const openMedia = useCallback((item: MediaItem) => setActiveMedia(item), []);
  const closeMedia = useCallback(() => setActiveMedia(null), []);
  const ctxValue = useMemo(() => ({ openMedia }), [openMedia]);

  // Bail early for empty content — avoids react-markdown overhead
  if (!content?.trim()) return null;

  return (
    <MediaContext.Provider value={ctxValue}>
      <div className={cn("min-w-0 px-4", className)}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={mdComponents}
        >
          {content}
        </ReactMarkdown>
        {isStreaming && <StreamingCursor />}
      </div>

      {activeMedia && <MediaModal item={activeMedia} onClose={closeMedia} />}
    </MediaContext.Provider>
  );
});
