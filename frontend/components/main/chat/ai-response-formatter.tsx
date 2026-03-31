"use client";

import React, { memo, useState, useCallback, useContext, useMemo } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  vscDarkPlus,
  vs,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "next-themes";
import { Check, Copy, Volume2, ExternalLink, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { MediaContext, detectMediaType, type MediaItem } from "./media-context";

const MediaModal = dynamic(
  () => import("./media-modal").then((m) => ({ default: m.MediaModal })),
  { ssr: false },
);

const CodeCopyButton = memo(function CodeCopyButton({
  code,
}: {
  code: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? "Copied" : "Copy code"}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground/60   hover:bg-muted hover:text-muted-foreground"
    >
      {copied ? (
        <Check className="h-3 w-3 text-primary" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
});

// ---------------------------------------------------------------------------
// CodeBlock — memo'd, reads theme + shows copy button
// ---------------------------------------------------------------------------

interface CodeBlockProps {
  language: string;
  children: string;
}

const CodeBlock = memo(function CodeBlock({
  language,
  children,
}: CodeBlockProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="group mb-4 overflow-hidden rounded-xl border border-border bg-muted/20">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-2">
        <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
          {language}
        </span>
        <CodeCopyButton code={children} />
      </div>
      <SyntaxHighlighter
        language={language}
        style={isDark ? vscDarkPlus : vs}
        customStyle={{
          margin: 0,
          padding: "1rem",
          background: "",
          fontSize: "13px",
          lineHeight: "1.65",
        }}
        codeTagProps={{ style: { fontFamily: "var(--font-mono, monospace)" } }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
});

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

const ImageRenderer = memo(function ImageRenderer({
  src,
  alt,
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const { openMedia } = useContext(MediaContext);

  const handleClick = useCallback(() => {
    if (src) openMedia({ type: "image", src, alt });
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

  // Audio link card
  if (href && mediaType === "audio") {
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => e.key === "Enter" && handleClick(e as never)}
        className="my-3 flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3   hover:bg-muted/50"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Volume2 className="h-4 w-4 text-primary" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] font-medium text-foreground truncate">
            {String(children) || "Audio"}
          </span>
          <span className="text-[11px] text-muted-foreground">
            Click to listen
          </span>
        </span>
      </span>
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

  // Paragraph
  p: ({ children }) => (
    <p className="mb-4 leading-7 text-foreground/90 last:mb-0">{children}</p>
  ),

  // Lists
  ul: ({ children }) => (
    <ul className="mb-4 ml-6 list-disc space-y-1.5 text-foreground/90 marker:text-muted-foreground/60">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 ml-6 list-decimal space-y-1.5 text-foreground/90 marker:text-muted-foreground/60">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1 leading-7">{children}</li>,

  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="mb-4 border-l-[3px] border-primary/40 pl-4 italic text-muted-foreground">
      {children}
    </blockquote>
  ),

  // Code — handles both inline and fenced blocks
  code: function Code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className ?? "");
    const language = match?.[1];

    if (language) {
      return (
        <CodeBlock language={language}>
          {String(children).replace(/\n$/, "")}
        </CodeBlock>
      );
    }

    // Inline code
    return (
      <code
        className="rounded-md bg-muted px-[0.35em] py-[0.15em] font-mono text-[0.875em] font-medium text-foreground ring-1 ring-border/60"
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
    <div className="mb-4 w-full overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
  tbody: ({ children }) => (
    <tbody className="divide-y divide-border">{children}</tbody>
  ),
  tr: ({ children }) => <tr className="  hover:bg-muted/30">{children}</tr>,
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-left text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 text-[13.5px] text-foreground/85">{children}</td>
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
      <div className={cn("min-w-0", className)}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
          {content}
        </ReactMarkdown>
        {isStreaming && <StreamingCursor />}
      </div>

      {activeMedia && <MediaModal item={activeMedia} onClose={closeMedia} />}
    </MediaContext.Provider>
  );
});
