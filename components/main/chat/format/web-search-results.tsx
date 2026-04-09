"use client";

import { memo, useMemo, useRef, useEffect, useState, useCallback } from "react";
import { ExternalLink, Globe, MessageCircle, GitBranch, FileText, Lightbulb, ChevronRight, Layers, X, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface SearchSource {
  id: string;
  title: string;
  url: string;
  snippet: string;
  content: string;
  image?: string;
  source: "stackoverflow" | "reddit" | "github" | "news" | "blog" | "other";
  score: number;
  savedAt: string;
}

interface SearchImage {
  url: string;
  description: string;
}

interface SuggestedQuestion {
  id: string;
  question: string;
  topic: string;
}

interface WebSearchData {
  sources: SearchSource[];
  images?: SearchImage[];
  suggestedQuestions?: SuggestedQuestion[];
  query: string;
  totalResults: number;
}

interface WebSearchResultsProps {
  data: string;
  onQuestionClick?: (question: string) => void;
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  stackoverflow: <MessageCircle className="h-4 w-4 text-orange-500" />,
  reddit: <Globe className="h-4 w-4 text-orange-600" />,
  github: <GitBranch className="h-4 w-4 text-foreground" />,
  news: <FileText className="h-4 w-4 text-blue-500" />,
  blog: <FileText className="h-4 w-4 text-green-500" />,
  other: <Globe className="h-4 w-4 text-muted-foreground" />,
};

const SOURCE_LABELS: Record<string, string> = {
  stackoverflow: "StackOverflow",
  reddit: "Reddit",
  github: "GitHub",
  news: "Hacker News",
  blog: "Blog",
  other: "Web",
};

const PREVIEW_IMAGE_COUNT = 5;

function getFaviconUrl(url: string): string | null {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
  } catch {
    return null;
  }
}

const SourceCard = memo(function SourceCard({ result, onClick }: { result: SearchSource; onClick?: () => void }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const faviconUrl = useMemo(() => getFaviconUrl(result.url), [result.url]);
  const hostname = useMemo(() => {
    try {
      return new URL(result.url).hostname.replace("www.", "");
    } catch {
      return result.url;
    }
  }, [result.url]);

  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex gap-3 rounded-xl border border-border bg-card p-4",
        "transition-all duration-200",
        "hover:border-primary/30 hover:shadow-sm hover:bg-accent/50",
        "active:scale-[0.99]",
        onClick && "cursor-pointer",
      )}
      onClick={onClick}
    >
      {/* Favicon */}
      <div className="relative w-3.5 h-3.5 flex items-center justify-center shrink-0 rounded-sm overflow-hidden">
        {faviconUrl ? (
          <img
            src={faviconUrl}
            alt=""
            width={14}
            height={14}
            className={cn('object-contain', !imageLoaded && 'opacity-0')}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              setImageLoaded(true);
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <Globe className="w-3 h-3 text-muted-foreground/50" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-medium text-foreground line-clamp-1 flex-1">{result.title}</h3>
          <ExternalLink className="w-2.5 h-2.5 shrink-0 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-muted-foreground/60 truncate">{hostname}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/50 line-clamp-1 mt-0.5 leading-relaxed">{result.snippet}</p>
      </div>
    </a>
  );
});

function SourcesSheet({
  sources,
  images,
  open,
  onOpenChange,
}: {
  sources: SearchSource[];
  images?: SearchImage[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const [selectedImage, setSelectedImage] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const SheetWrapper = isMobile ? Drawer : Sheet;
  const SheetContentWrapper = isMobile ? DrawerContent : SheetContent;

  const validImages = useMemo(() => (images || []).filter((img) => !failedImages.has(img.url)), [images, failedImages]);
  const displayImages = useMemo(() => validImages.slice(0, PREVIEW_IMAGE_COUNT), [validImages]);
  const hasMoreImages = validImages.length > PREVIEW_IMAGE_COUNT;

  const handleImageClick = useCallback((index: number) => {
    setSelectedImage(index);
    setIsViewerOpen(true);
  }, []);

  const handleImageError = useCallback((imageUrl: string) => {
    setFailedImages((prev) => new Set(prev).add(imageUrl));
  }, []);

  const currentImage = useMemo(() => validImages[selectedImage], [validImages, selectedImage]);

  const ImageViewer = isMobile ? Drawer : Sheet;
  const ImageViewerContent = isMobile ? DrawerContent : SheetContent;

  return (
    <>
      <SheetWrapper open={open} onOpenChange={onOpenChange}>
        <SheetContentWrapper className={cn(isMobile ? 'h-[85vh]' : 'w-[580px] sm:max-w-[580px]', 'p-0')}>
          <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border/40">
              <div className="flex items-center gap-2 mb-0.5">
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider">Sources</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {sources.length} results
              </p>
            </div>

            {/* Images Gallery - only show if we have images */}
            {validImages.length > 0 && (
              <div className="px-5 py-3 border-b border-border/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">Images</span>
                  <span className="text-[10px] text-muted-foreground/40">{validImages.length}</span>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {displayImages.map((image, index) => (
                    <button
                      key={`${image.url}-${index}`}
                      onClick={() => handleImageClick(index)}
                      className="relative rounded-lg overflow-hidden shrink-0 bg-muted/20 border border-border/30 transition-all duration-150 hover:border-border/60 cursor-pointer w-[100px] h-[56px]"
                    >
                      <img
                        src={image.url}
                        alt={image.description || ''}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={() => handleImageError(image.url)}
                      />
                      {index === displayImages.length - 1 && hasMoreImages && (
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center">
                          <span className="text-white text-xs font-medium">+{validImages.length - displayImages.length}</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sources List */}
            <div className="flex-1 overflow-y-auto">
              <div className="divide-y divide-border/20">
                {sources.map((source, index) => (
                  <SourceCard key={source.id || index} result={source} />
                ))}
              </div>
            </div>
          </div>
        </SheetContentWrapper>
      </SheetWrapper>

      {/* Image Viewer */}
      <ImageViewer open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <ImageViewerContent className={cn(!isMobile && 'w-full! max-w-4xl! h-[85vh]', 'p-0 overflow-hidden')}>
          <div className="relative w-full h-full bg-background flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={() => setIsViewerOpen(false)}
              className="absolute top-3 right-3 z-50 p-2 rounded-full bg-background/80 hover:bg-background border border-border/40 backdrop-blur-xl transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* Nav buttons */}
            {validImages.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedImage((prev) => (prev === 0 ? validImages.length - 1 : prev - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-50 p-2 rounded-full bg-background/80 hover:bg-background border border-border/40 backdrop-blur-xl transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => setSelectedImage((prev) => (prev === validImages.length - 1 ? 0 : prev + 1))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-50 p-2 rounded-full bg-background/80 hover:bg-background border border-border/40 backdrop-blur-xl transition-colors"
                >
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </>
            )}

            {/* Image */}
            {currentImage && (
              <img
                src={currentImage.url}
                alt={currentImage.description || ''}
                className="max-w-full max-h-full object-contain"
              />
            )}

            {/* Description */}
            {currentImage?.description && (
              <div className="absolute bottom-0 left-0 right-0 px-4 py-2.5 bg-background/95 backdrop-blur-sm border-t border-border/40">
                <span className="text-xs text-muted-foreground">{currentImage.description}</span>
              </div>
            )}
          </div>
        </ImageViewerContent>
      </ImageViewer>
    </>
  );
}

function SuggestedQuestionItem({
  question,
  onClick,
}: {
  question: SuggestedQuestion;
  onClick?: (question: string) => void;
}) {
  return (
    <button
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2",
        "text-left text-[12px] text-muted-foreground transition-all duration-200",
        "hover:border-primary/30 hover:bg-accent/50 hover:text-foreground",
        "active:scale-[0.98]"
      )}
      onClick={() => onClick?.(question.question)}
    >
      <Lightbulb className="h-3.5 w-3.5 shrink-0 text-amber-500/70" />
      <span className="line-clamp-1">{question.question}</span>
    </button>
  );
}

export const WebSearchResults = memo(function WebSearchResults({
  data,
  onQuestionClick,
}: WebSearchResultsProps) {
  const [sourcesSheetOpen, setSourcesSheetOpen] = useState(false);

  const parsed = useMemo<WebSearchData | null>(() => {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }, [data]);

  if (!parsed?.sources?.length) {
    return <CodeBlock language="json">{data}</CodeBlock>;
  }

  return (
    <div className="my-6 space-y-6">
      {/* Sources with "View All" button */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <h4 className="text-[14px] font-semibold text-foreground">Sources</h4>
            <span className="text-[11px] text-muted-foreground/50">{parsed.totalResults} results</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSourcesSheetOpen(true)}
            className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
          >
            <Layers className="h-3 w-3 mr-1" />
            View All
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {parsed.sources.slice(0, 6).map((source) => (
            <SourceCard key={source.id} result={source} />
          ))}
        </div>
      </div>

      {/* Images Gallery - if we have images */}
      {parsed.images && parsed.images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <h4 className="text-[14px] font-semibold text-foreground">Images</h4>
            <span className="text-[11px] text-muted-foreground/50">{parsed.images.length}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {parsed.images.slice(0, 8).map((image, index) => (
              <button
                key={`${image.url}-${index}`}
                className="relative rounded-lg overflow-hidden shrink-0 bg-muted/20 border border-border/30 transition-all duration-150 hover:border-border/60 cursor-pointer w-[120px] h-[68px]"
              >
                <img
                  src={image.url}
                  alt={image.description || ''}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Questions */}
      {parsed.suggestedQuestions && parsed.suggestedQuestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <h4 className="text-[14px] font-semibold text-foreground">Suggested Questions</h4>
          </div>

          <div className="flex flex-wrap gap-2">
            {parsed.suggestedQuestions.map((question) => (
              <SuggestedQuestionItem
                key={question.id}
                question={question}
                onClick={onQuestionClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sources Sheet */}
      <SourcesSheet
        sources={parsed.sources}
        images={parsed.images}
        open={sourcesSheetOpen}
        onOpenChange={setSourcesSheetOpen}
      />
    </div>
  );
});
