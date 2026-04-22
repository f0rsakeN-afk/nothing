import Image from "next/image";

export default function Loading() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      {/* Logo */}
      <div className="relative w-10 h-10 mb-4">
        <Image
          src="/eryx-icon.png"
          alt="Eryx"
          width={40}
          height={40}
          className="object-contain dark:invert"
          priority
        />
      </div>

      {/* Wordmark */}
      <div className="flex items-center gap-1.5 mb-6">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          Eryx
        </span>
        <div className="h-3.5 w-px bg-border/60" />
        <span className="text-xs text-muted-foreground font-medium">
          AI Assistant
        </span>
      </div>
    </div>
  );
}
