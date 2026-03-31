import { Globe, ShieldCheck, Zap, Database, Search, Layers } from "lucide-react";

export const services = [
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

export const incidents = [
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
