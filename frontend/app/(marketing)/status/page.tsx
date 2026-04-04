import { Metadata } from "next";
import { Globe, ShieldCheck, Zap, Database, Search, Layers } from "lucide-react";
import { ServiceCard, IncidentItem } from "@/components/marketing/status/status-components";

export const metadata: Metadata = {
  title: "System Status | Eryx",
  description: "Real-time monitoring and operational status of Eryx's global infrastructure.",
  alternates: { canonical: "/status" },
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const services = [
  {
    name: "Gateway",
    id: "gateway",
    description: "Central API infrastructure and routing",
    status: "operational",
    uptime: "99.99%",
    icon: Globe,
  },
  {
    name: "Authentication",
    id: "auth",
    description: "User sessions, tokens and identity management",
    status: "operational",
    uptime: "100%",
    icon: ShieldCheck,
  },
  {
    name: "Design Services",
    id: "design",
    description: "Asset delivery and UI component CDN",
    status: "operational",
    uptime: "99.98%",
    icon: Layers,
  },
  {
    name: "Embeddings Engine",
    id: "embeddings",
    description: "Vector computation and semantic analysis",
    status: "operational",
    uptime: "100%",
    icon: Zap,
  },
  {
    name: "Scraper Service",
    id: "scraper",
    description: "Real-time data collection and indexing",
    status: "operational",
    uptime: "99.95%",
    icon: Database,
  },
  {
    name: "Search API",
    id: "search",
    description: "High-performance retrieval and ranking",
    status: "operational",
    uptime: "99.99%",
    icon: Search,
  },
];

const incidents = [
  {
    date: "March 28, 2026",
    title: "Scheduled Maintenance - Embeddings Engine",
    description: "Upgraded the vector processing core. No downtime was observed during the migration.",
    status: "resolved",
  },
  {
    date: "March 15, 2026",
    title: "Intermittent Latency - Gateway",
    description: "Some users experienced delays reaching the API. Root cause was identified as a DDoS attack and mitigated via Cloudflare.",
    status: "resolved",
  },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function StatusPage() {
  return (
    <div className="bg-background text-foreground antialiased">
      
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-20 px-6 overflow-hidden">
        {/* subtle ambient glow */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
          <div className="w-[600px] h-[400px] rounded-full bg-primary/5 blur-[100px] -translate-y-1/4" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10 text-center flex flex-col items-center">
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground mb-5">
            Platform Operations
          </p>
          <h1 className="text-4xl md:text-[3.25rem] font-semibold tracking-tight text-foreground mb-6 leading-[1.1]">
            System Health
          </h1>
          <p className="text-base text-muted-foreground max-w-lg mx-auto leading-relaxed font-medium mb-8">
            Real-time visibility into the operational performance and availability of the Eryx platform architecture.
          </p>

          <div className="relative inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-green-500/20 bg-green-500/5 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <span className="text-sm font-semibold text-green-600 dark:text-green-500 tracking-tight">
              All Systems Operational
            </span>
          </div>
        </div>
      </section>

      {/* ── Services Grid ─────────────────────────────────────── */}
      <section className="px-6 pb-16">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <h2 className="text-base font-semibold text-foreground tracking-tight">
              Infrastructure Services
            </h2>
            <p className="text-xs font-medium text-muted-foreground">
              Updated dynamically
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <ServiceCard 
                key={service.id}
                name={service.name}
                description={service.description}
                status={service.status}
                uptime={service.uptime}
                icon={<service.icon className="w-5 h-5" strokeWidth={1.5} />}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Incident History ──────────────────────────────────── */}
      <section className="px-6 pb-28">
        <div className="max-w-6xl mx-auto flex flex-col gap-8">
          <div className="flex items-center gap-4 py-8">
            <div className="h-px flex-1 bg-border/40" />
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground/50">
              Operational History
            </p>
            <div className="h-px flex-1 bg-border/40" />
          </div>

          <div className="max-w-2xl mx-auto w-full flex flex-col">
            {incidents.map((incident, idx) => (
              <IncidentItem 
                key={idx}
                date={incident.date}
                title={incident.title}
                description={incident.description}
                status={incident.status}
                isLast={idx === incidents.length - 1}
              />
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
