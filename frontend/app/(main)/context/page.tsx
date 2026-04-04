import { FileText, Globe, Upload, BookOpen, Lock, Clock } from "lucide-react"

const PLACEHOLDER_ITEMS = [
  {
    icon: FileText,
    name: "System Architecture.pdf",
    type: "PDF",
    size: "2.4 MB",
    added: "Mar 28",
  },
  {
    icon: FileText,
    name: "API Reference v2.md",
    type: "Markdown",
    size: "48 KB",
    added: "Mar 22",
  },
  {
    icon: Globe,
    name: "docs.example.com/guide",
    type: "URL",
    size: "—",
    added: "Mar 15",
  },
]

const COMING_SOON = [
  {
    icon: Upload,
    title: "Upload Documents",
    description: "Attach PDFs, Markdown, Word files, or plain text to ground the AI in your own material.",
  },
  {
    icon: Globe,
    title: "Add URLs",
    description: "Point to any public webpage and the AI will pull it into context automatically.",
  },
  {
    icon: Lock,
    title: "Scoped per Chat",
    description: "Assign context sources to specific chats or make them global across all conversations.",
  },
]

export default function ContextPage() {
  return (
    <div className="flex flex-col min-h-full bg-background text-foreground">
      {/* ── Page header ───────────────────────────────────────── */}
      <div className="border-b border-border px-8 py-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <h1 className="text-[15px] font-semibold tracking-tight text-foreground">
                Context
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                <Clock className="h-2.5 w-2.5" />
                Coming soon
              </span>
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed max-w-lg">
              Upload documents, paste URLs, or write custom instructions to give the AI
              persistent knowledge across your conversations.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-8 py-8 space-y-10">
        {/* ── Upload zone (placeholder) ─────────────────────── */}
        <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 px-8 py-14 flex flex-col items-center justify-center text-center gap-4 opacity-50 cursor-not-allowed select-none">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <Upload className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-foreground mb-1">
              Drop files here or click to upload
            </p>
            <p className="text-[12px] text-muted-foreground">
              PDF, Markdown, TXT, DOCX — up to 25 MB each
            </p>
          </div>
        </div>

        {/* ── Placeholder context items ──────────────────────── */}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/50 mb-3">
            Example sources
          </p>
          <div className="rounded-xl border border-border overflow-hidden opacity-40 pointer-events-none select-none">
            {PLACEHOLDER_ITEMS.map((item, idx) => {
              const Icon = item.icon
              return (
                <div
                  key={idx}
                  className="flex items-center gap-4 px-5 py-3.5 border-b border-border last:border-0 bg-card"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground">{item.type} · {item.size}</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                    {item.added}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── What's coming ─────────────────────────────────── */}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/50 mb-4">
            What&apos;s coming
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COMING_SOON.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted mb-4">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-[13px] font-semibold text-foreground mb-1.5">{title}</p>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
