import Link from "next/link";

export function LegalHeader() {
  return (
    <header className="border-b border-border sticky top-0 z-10 bg-background/90 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center min-w-0">
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <div className="h-6 w-6 rounded-md bg-foreground transition-opacity duration-200 group-hover:opacity-70" />
          <span className="text-sm font-semibold text-foreground   duration-200 group-hover:text-muted-foreground">
            Nothing
          </span>
        </Link>
        {/* <span className="text-border/60 select-none text-base font-light mx-2.5 shrink-0">
          /
        </span>
        <span className="text-sm text-muted-foreground truncate">
          {currentPage === "terms" ? "Terms of Service" : "Privacy Policy"}
        </span> */}
      </div>
    </header>
  );
}
