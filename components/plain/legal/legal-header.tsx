import Link from "next/link";
import Logo from "@/components/shared/Logo";

export function LegalHeader() {
  return (
    <header className="border-b border-border sticky top-0 z-10 bg-background/90 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center min-w-0">
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <Logo />
        </Link>
      </div>
    </header>
  );
}

export function MinimalHeader() {
  return (
    <header className="border-b border-border bg-background/90 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-6 h-12 flex items-center">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Eryx
        </Link>
      </div>
    </header>
  );
}
