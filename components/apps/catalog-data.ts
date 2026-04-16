// ─── Catalog Types ─────────────────────────────────────────────────────────────

export type CatalogAuth = "oauth" | "apikey" | "open";
export type CategoryId =
  | "all"
  | "dev"
  | "productivity"
  | "design"
  | "crm"
  | "payments"
  | "database"
  | "search"
  | "data"
  | "travel"
  | "email"
  | "shopping"
  | "other";

export const AUTH_TO_API_AUTH: Record<CatalogAuth, "oauth" | "header" | "none"> = {
  oauth: "oauth",
  apikey: "header",
  open: "none",
};

export interface CatalogField {
  label: string;
  placeholder: string;
  headerName: string;
  hintText?: string;
  hintUrl?: string;
  steps?: Array<{ text: string; url?: string; urlLabel?: string }>;
}

export interface OAuthSetupField {
  label: string;
  placeholder: string;
  hintText?: string;
  hintUrl?: string;
  key: "oauthClientId" | "oauthClientSecret";
}

export interface CatalogItem {
  name: string;
  category: CategoryId;
  url: string;
  auth: CatalogAuth;
  maintainer: string;
  maintainerUrl: string;
  customIcon?: string;
  fields?: CatalogField[];
  oauthSetup?: OAuthSetupField[];
}

// ─── Categories ────────────────────────────────────────────────────────────────

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "dev", label: "Dev Tools" },
  { id: "productivity", label: "Productivity" },
  { id: "design", label: "Design" },
  { id: "crm", label: "CRM" },
  { id: "payments", label: "Payments" },
  { id: "database", label: "Database" },
  { id: "search", label: "Search" },
  { id: "data", label: "Data" },
  { id: "travel", label: "Travel" },
  { id: "email", label: "Email" },
  { id: "shopping", label: "Shopping" },
  { id: "other", label: "Other" },
];

// ─── Catalog Data ───────────────────────────────────────────────────────────────

export const CATALOG: CatalogItem[] = [
  {
    name: "Asana",
    category: "productivity",
    url: "https://mcp.asana.com/sse",
    auth: "oauth",
    maintainer: "Asana",
    maintainerUrl: "https://asana.com",
  },
  {
    name: "Autosend",
    category: "email",
    url: "https://mcp.autosend.com/",
    auth: "oauth",
    maintainer: "Autosend",
    maintainerUrl: "https://autosend.com",
  },
  {
    name: "Atlassian",
    category: "dev",
    url: "https://mcp.atlassian.com/v1/sse",
    auth: "oauth",
    maintainer: "Atlassian",
    maintainerUrl: "https://atlassian.com",
  },
  {
    name: "Attio",
    category: "crm",
    url: "https://mcp.attio.com/mcp",
    auth: "oauth",
    maintainer: "Attio",
    maintainerUrl: "https://attio.com",
  },
  {
    name: "Box",
    category: "productivity",
    url: "https://mcp.box.com",
    auth: "oauth",
    maintainer: "Box",
    maintainerUrl: "https://box.com",
  },
  {
    name: "Close CRM",
    category: "crm",
    url: "https://mcp.close.com/mcp",
    auth: "oauth",
    maintainer: "Close",
    maintainerUrl: "https://close.com",
  },
  {
    name: "Cloudflare",
    category: "dev",
    url: "https://mcp.cloudflare.com/mcp",
    auth: "oauth",
    maintainer: "Cloudflare",
    maintainerUrl: "https://cloudflare.com",
  },
  {
    name: "Cloudflare Workers",
    category: "dev",
    url: "https://bindings.mcp.cloudflare.com/sse",
    auth: "oauth",
    maintainer: "Cloudflare",
    maintainerUrl: "https://cloudflare.com",
  },
  {
    name: "Cloudinary",
    category: "design",
    url: "https://asset-management.mcp.cloudinary.com/sse",
    auth: "oauth",
    maintainer: "Cloudinary",
    maintainerUrl: "https://cloudinary.com",
  },
  {
    name: "GitHub",
    category: "dev",
    url: "https://api.githubcopilot.com/mcp",
    auth: "oauth",
    maintainer: "GitHub",
    maintainerUrl: "https://github.com",
  },
  {
    name: "Hugging Face",
    category: "dev",
    url: "https://huggingface.co/mcp?login",
    auth: "oauth",
    maintainer: "Hugging Face",
    maintainerUrl: "https://huggingface.co",
  },
  {
    name: "Intercom",
    category: "crm",
    url: "https://mcp.intercom.com/sse",
    auth: "oauth",
    maintainer: "Intercom",
    maintainerUrl: "https://intercom.com",
  },
  {
    name: "Linear",
    category: "productivity",
    url: "https://mcp.linear.app/mcp",
    auth: "oauth",
    maintainer: "Linear",
    maintainerUrl: "https://linear.app",
  },
  {
    name: "monday.com",
    category: "productivity",
    url: "https://mcp.monday.com/sse",
    auth: "oauth",
    maintainer: "monday.com",
    maintainerUrl: "https://monday.com",
  },
  {
    name: "Neon",
    category: "database",
    url: "https://mcp.neon.tech/mcp",
    auth: "oauth",
    maintainer: "Neon",
    maintainerUrl: "https://neon.tech",
  },
  {
    name: "Notion",
    category: "productivity",
    url: "https://mcp.notion.com/mcp",
    auth: "oauth",
    maintainer: "Notion",
    maintainerUrl: "https://notion.so",
  },
  {
    name: "PayPal",
    category: "payments",
    url: "https://mcp.paypal.com/sse",
    auth: "oauth",
    maintainer: "PayPal",
    maintainerUrl: "https://paypal.com",
  },
  {
    name: "Plaid",
    category: "payments",
    url: "https://api.dashboard.plaid.com/mcp/sse",
    auth: "oauth",
    maintainer: "Plaid",
    maintainerUrl: "https://plaid.com",
  },
  {
    name: "Ramp",
    category: "payments",
    url: "https://ramp-mcp-remote.ramp.com/mcp",
    auth: "oauth",
    maintainer: "Ramp",
    maintainerUrl: "https://ramp.com",
  },
  {
    name: "Sentry",
    category: "dev",
    url: "https://mcp.sentry.dev/sse",
    auth: "oauth",
    maintainer: "Sentry",
    maintainerUrl: "https://sentry.io",
  },
  {
    name: "Square",
    category: "payments",
    url: "https://mcp.squareup.com/sse",
    auth: "oauth",
    maintainer: "Square",
    maintainerUrl: "https://squareup.com",
  },
  {
    name: "Stripe",
    category: "payments",
    url: "https://mcp.stripe.com/",
    auth: "oauth",
    maintainer: "Stripe",
    maintainerUrl: "https://stripe.com",
  },
  {
    name: "Supabase",
    category: "database",
    url: "https://mcp.supabase.com/mcp",
    auth: "oauth",
    maintainer: "Supabase",
    maintainerUrl: "https://supabase.com",
  },
  {
    name: "Vercel",
    category: "dev",
    url: "https://mcp.vercel.com",
    auth: "oauth",
    maintainer: "Vercel",
    maintainerUrl: "https://vercel.com",
  },
  {
    name: "Webflow",
    category: "design",
    url: "https://mcp.webflow.com/sse",
    auth: "oauth",
    maintainer: "Webflow",
    maintainerUrl: "https://webflow.com",
  },
  {
    name: "Slack",
    category: "productivity",
    url: "https://mcp.slack.com/mcp",
    auth: "oauth",
    maintainer: "Slack",
    maintainerUrl: "https://slack.com",
  },
  {
    name: "Dropbox",
    category: "productivity",
    url: "https://mcp.dropbox.com/mcp",
    auth: "oauth",
    maintainer: "Dropbox",
    maintainerUrl: "https://dropbox.com",
  },
  {
    name: "Context7",
    category: "dev",
    url: "https://mcp.context7.com/mcp",
    auth: "open",
    maintainer: "Context7",
    maintainerUrl: "https://context7.com",
  },
  {
    name: "DeepWiki",
    category: "search",
    url: "https://mcp.deepwiki.com/mcp",
    auth: "open",
    maintainer: "Devin",
    maintainerUrl: "https://devin.ai",
  },
  {
    name: "Exa Search",
    category: "search",
    url: "https://mcp.exa.ai/mcp",
    auth: "open",
    maintainer: "Exa",
    maintainerUrl: "https://exa.ai",
  },
  {
    name: "Excalidraw",
    category: "design",
    url: "https://mcp.excalidraw.com/mcp",
    auth: "open",
    maintainer: "Excalidraw",
    maintainerUrl: "https://excalidraw.com",
  },
  {
    name: "GitMCP",
    category: "dev",
    url: "https://gitmcp.io/docs",
    auth: "open",
    maintainer: "GitMCP",
    maintainerUrl: "https://gitmcp.io",
  },
  {
    name: "Kiwi",
    category: "travel",
    url: "https://mcp.kiwi.com",
    auth: "open",
    maintainer: "Kiwi",
    maintainerUrl: "https://kiwi.com",
  },
  {
    name: "PubMed",
    category: "search",
    url: "https://pubmed.mcp.claude.com/mcp",
    auth: "open",
    maintainer: "Anthropic",
    maintainerUrl: "https://pubmed.ncbi.nlm.nih.gov",
  },
  {
    name: "HubSpot",
    category: "crm",
    url: "https://mcp.hubspot.com/",
    auth: "oauth",
    maintainer: "HubSpot",
    maintainerUrl: "https://hubspot.com",
  },
];

export const FEATURED_NAMES = [
  "Notion",
  "GitHub",
  "Exa Search",
  "Vercel",
  "Slack",
  "Linear",
  "Context7",
  "Stripe",
  "Supabase",
];

export const CATALOG_URLS = new Set(CATALOG.map((i) => i.url.replace(/\/$/, "")));

// ─── Helper Functions ──────────────────────────────────────────────────────────

export function getTransportType(url: string): "sse" | "http" {
  const lower = url.toLowerCase();
  return lower.endsWith("/sse") || lower.includes("/sse?") ? "sse" : "http";
}

// Second-level TLDs that need 3 parts kept
const SLD_TLDS = new Set([
  "gov.in", "co.in", "org.in", "net.in", "ac.in",
  "co.uk", "org.uk", "me.uk", "net.uk", "ac.uk",
  "co.jp", "co.nz", "co.za", "co.kr", "co.il",
  "com.au", "net.au", "org.au", "com.br", "net.br", "org.br",
  "nih.gov",
]);

export function rootDomain(serverUrl: string): string {
  try {
    const parts = new URL(serverUrl).hostname.split(".");
    if (parts.length <= 2) return parts.join(".");
    const last2 = parts.slice(-2).join(".");
    if (SLD_TLDS.has(last2)) return parts.slice(-3).join(".");
    return last2;
  } catch {
    return "";
  }
}

export function faviconUrl(serverUrl: string): string {
  const domain = rootDomain(serverUrl);
  if (!domain) return "";
  const google = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  return `/api/proxy-image?url=${encodeURIComponent(google)}`;
}

export const AUTH_LABELS: Record<CatalogAuth, string> = {
  oauth: "OAuth",
  apikey: "API Key",
  open: "Free",
};

export function isOauthWithClientSetup(item: CatalogItem) {
  return item.auth === "oauth" && Boolean(item.oauthSetup?.length);
}