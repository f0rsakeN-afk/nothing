import { PrismaClient, PlanTier } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import redis from "../lib/redis";

const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5433/mydb",
});

const prisma = new PrismaClient({ adapter });

const PLANS_CACHE_KEY = "plans:all";

// ─── Plans ─────────────────────────────────────────────────────────────────────

const plans = [
  {
    id: "free",
    tier: PlanTier.FREE,
    name: "Free",
    description: "Start for free. No credit card needed.",
    price: 0,
    maxChats: 10,
    maxProjects: 1,
    maxMessages: 50,
    maxMemoryItems: 3,
    maxBranchesPerChat: 0,
    maxFolders: 0,
    maxAttachmentsPerChat: 0,
    maxFileSizeMb: 0,
    canExport: false,
    canApiAccess: false,
    features: ["basic-chat", "basic-projects"],
    sortOrder: 0,
    isActive: true,
    isVisible: true,
    isDefault: true,
  },
  {
    id: "basic",
    tier: PlanTier.BASIC,
    name: "Basic",
    description: "For individuals who want more than free.",
    price: 299, // NPR ~$2.25/month
    maxChats: 30,
    maxProjects: 3,
    maxMessages: 500,
    maxMemoryItems: 20,
    maxBranchesPerChat: 3,
    maxFolders: 3,
    maxAttachmentsPerChat: 3,
    maxFileSizeMb: 5,
    canExport: false,
    canApiAccess: false,
    features: [
      "basic-chat",
      "basic-projects",
      "attachments",
      "chat-folders",
      "longer-memory",
    ],
    sortOrder: 1,
    isActive: true,
    isVisible: true,
    isDefault: false,
  },
  {
    id: "pro",
    tier: PlanTier.PRO,
    name: "Pro",
    description: "For power users. Everything you need.",
    price: 999, // NPR ~$7.50/month
    maxChats: -1,
    maxProjects: -1,
    maxMessages: 3000,
    maxMemoryItems: -1,
    maxBranchesPerChat: -1,
    maxFolders: -1,
    maxAttachmentsPerChat: 20,
    maxFileSizeMb: 25,
    canExport: true,
    canApiAccess: true,
    features: [
      "basic-chat",
      "basic-projects",
      "attachments",
      "chat-folders",
      "chat-branches",
      "longer-memory",
      "advanced-customization",
      "export-chats",
    ],
    sortOrder: 2,
    isActive: true,
    isVisible: true,
    isDefault: false,
  },
  {
    id: "enterprise",
    tier: PlanTier.ENTERPRISE,
    name: "Enterprise",
    description: "For teams. API access and dedicated support.",
    price: 2999, // NPR ~$22.50/month
    maxChats: -1,
    maxProjects: -1,
    maxMessages: -1,
    maxMemoryItems: -1,
    maxBranchesPerChat: -1,
    maxFolders: -1,
    maxAttachmentsPerChat: -1,
    maxFileSizeMb: 100,
    canExport: true,
    canApiAccess: true,
    features: [
      "basic-chat",
      "basic-projects",
      "attachments",
      "chat-folders",
      "chat-branches",
      "longer-memory",
      "advanced-customization",
      "export-chats",
      "team-collaboration",
      "api-access",
      "priority-support",
    ],
    sortOrder: 3,
    isActive: true,
    isVisible: true,
    isDefault: false,
  },
];

// ─── MCP Catalog Items ─────────────────────────────────────────────────────────

const catalogItems = [
  // Dev Tools
  {
    name: "GitHub",
    category: "dev",
    url: "https://api.githubcopilot.com/mcp",
    authType: "oauth",
    maintainer: "GitHub",
    maintainerUrl: "https://github.com",
    isFeatured: true,
  },
  {
    name: "Atlassian",
    category: "dev",
    url: "https://mcp.atlassian.com/v1/sse",
    authType: "oauth",
    maintainer: "Atlassian",
    maintainerUrl: "https://atlassian.com",
    isFeatured: false,
  },
  {
    name: "Cloudflare",
    category: "dev",
    url: "https://mcp.cloudflare.com/mcp",
    authType: "oauth",
    maintainer: "Cloudflare",
    maintainerUrl: "https://cloudflare.com",
    isFeatured: false,
  },
  {
    name: "Cloudflare Workers",
    category: "dev",
    url: "https://bindings.mcp.cloudflare.com/sse",
    authType: "oauth",
    maintainer: "Cloudflare",
    maintainerUrl: "https://cloudflare.com",
    isFeatured: false,
  },
  {
    name: "Hugging Face",
    category: "dev",
    url: "https://huggingface.co/mcp?login",
    authType: "oauth",
    maintainer: "Hugging Face",
    maintainerUrl: "https://huggingface.co",
    isFeatured: false,
  },
  {
    name: "Sentry",
    category: "dev",
    url: "https://mcp.sentry.dev/sse",
    authType: "oauth",
    maintainer: "Sentry",
    maintainerUrl: "https://sentry.io",
    isFeatured: false,
  },
  {
    name: "Vercel",
    category: "dev",
    url: "https://mcp.vercel.com",
    authType: "oauth",
    maintainer: "Vercel",
    maintainerUrl: "https://vercel.com",
    isFeatured: true,
  },
  {
    name: "Context7",
    category: "dev",
    url: "https://mcp.context7.com/mcp",
    authType: "open",
    maintainer: "Context7",
    maintainerUrl: "https://context7.com",
    isFeatured: true,
  },
  {
    name: "GitMCP",
    category: "dev",
    url: "https://gitmcp.io/docs",
    authType: "open",
    maintainer: "GitMCP",
    maintainerUrl: "https://gitmcp.io",
    isFeatured: false,
  },

  // Productivity
  {
    name: "Asana",
    category: "productivity",
    url: "https://mcp.asana.com/sse",
    authType: "oauth",
    maintainer: "Asana",
    maintainerUrl: "https://asana.com",
    isFeatured: false,
  },
  {
    name: "Linear",
    category: "productivity",
    url: "https://mcp.linear.app/mcp",
    authType: "oauth",
    maintainer: "Linear",
    maintainerUrl: "https://linear.app",
    isFeatured: true,
  },
  {
    name: "monday.com",
    category: "productivity",
    url: "https://mcp.monday.com/sse",
    authType: "oauth",
    maintainer: "monday.com",
    maintainerUrl: "https://monday.com",
    isFeatured: false,
  },
  {
    name: "Notion",
    category: "productivity",
    url: "https://mcp.notion.com/mcp",
    authType: "oauth",
    maintainer: "Notion",
    maintainerUrl: "https://notion.so",
    isFeatured: true,
  },
  {
    name: "Slack",
    category: "productivity",
    url: "https://mcp.slack.com/mcp",
    authType: "oauth",
    maintainer: "Slack",
    maintainerUrl: "https://slack.com",
    isFeatured: true,
  },
  {
    name: "Dropbox",
    category: "productivity",
    url: "https://mcp.dropbox.com/mcp",
    authType: "oauth",
    maintainer: "Dropbox",
    maintainerUrl: "https://dropbox.com",
    isFeatured: false,
  },
  {
    name: "Box",
    category: "productivity",
    url: "https://mcp.box.com",
    authType: "oauth",
    maintainer: "Box",
    maintainerUrl: "https://box.com",
    isFeatured: false,
  },

  // Design
  {
    name: "Cloudinary",
    category: "design",
    url: "https://asset-management.mcp.cloudinary.com/sse",
    authType: "oauth",
    maintainer: "Cloudinary",
    maintainerUrl: "https://cloudinary.com",
    isFeatured: false,
  },
  {
    name: "Webflow",
    category: "design",
    url: "https://mcp.webflow.com/sse",
    authType: "oauth",
    maintainer: "Webflow",
    maintainerUrl: "https://webflow.com",
    isFeatured: false,
  },
  {
    name: "Excalidraw",
    category: "design",
    url: "https://mcp.excalidraw.com/mcp",
    authType: "open",
    maintainer: "Excalidraw",
    maintainerUrl: "https://excalidraw.com",
    isFeatured: false,
  },

  // CRM
  {
    name: "Attio",
    category: "crm",
    url: "https://mcp.attio.com/mcp",
    authType: "oauth",
    maintainer: "Attio",
    maintainerUrl: "https://attio.com",
    isFeatured: false,
  },
  {
    name: "Close CRM",
    category: "crm",
    url: "https://mcp.close.com/mcp",
    authType: "oauth",
    maintainer: "Close",
    maintainerUrl: "https://close.com",
    isFeatured: false,
  },
  {
    name: "HubSpot",
    category: "crm",
    url: "https://mcp.hubspot.com/",
    authType: "oauth",
    maintainer: "HubSpot",
    maintainerUrl: "https://hubspot.com",
    isFeatured: false,
  },
  {
    name: "Intercom",
    category: "crm",
    url: "https://mcp.intercom.com/sse",
    authType: "oauth",
    maintainer: "Intercom",
    maintainerUrl: "https://intercom.com",
    isFeatured: false,
  },

  // Payments
  {
    name: "PayPal",
    category: "payments",
    url: "https://mcp.paypal.com/sse",
    authType: "oauth",
    maintainer: "PayPal",
    maintainerUrl: "https://paypal.com",
    isFeatured: false,
  },
  {
    name: "Plaid",
    category: "payments",
    url: "https://api.dashboard.plaid.com/mcp/sse",
    authType: "oauth",
    maintainer: "Plaid",
    maintainerUrl: "https://plaid.com",
    isFeatured: false,
  },
  {
    name: "Ramp",
    category: "payments",
    url: "https://ramp-mcp-remote.ramp.com/mcp",
    authType: "oauth",
    maintainer: "Ramp",
    maintainerUrl: "https://ramp.com",
    isFeatured: false,
  },
  {
    name: "Square",
    category: "payments",
    url: "https://mcp.squareup.com/sse",
    authType: "oauth",
    maintainer: "Square",
    maintainerUrl: "https://squareup.com",
    isFeatured: false,
  },
  {
    name: "Stripe",
    category: "payments",
    url: "https://mcp.stripe.com/",
    authType: "oauth",
    maintainer: "Stripe",
    maintainerUrl: "https://stripe.com",
    isFeatured: true,
  },

  // Database
  {
    name: "Neon",
    category: "database",
    url: "https://mcp.neon.tech/mcp",
    authType: "oauth",
    maintainer: "Neon",
    maintainerUrl: "https://neon.tech",
    isFeatured: false,
  },
  {
    name: "Supabase",
    category: "database",
    url: "https://mcp.supabase.com/mcp",
    authType: "oauth",
    maintainer: "Supabase",
    maintainerUrl: "https://supabase.com",
    isFeatured: true,
  },

  // Search
  {
    name: "DeepWiki",
    category: "search",
    url: "https://mcp.deepwiki.com/mcp",
    authType: "open",
    maintainer: "Devin",
    maintainerUrl: "https://devin.ai",
    isFeatured: false,
  },
  {
    name: "Exa Search",
    category: "search",
    url: "https://mcp.exa.ai/mcp",
    authType: "open",
    maintainer: "Exa",
    maintainerUrl: "https://exa.ai",
    isFeatured: true,
  },
  {
    name: "PubMed",
    category: "search",
    url: "https://pubmed.mcp.claude.com/mcp",
    authType: "open",
    maintainer: "Anthropic",
    maintainerUrl: "https://pubmed.ncbi.nlm.nih.gov",
    isFeatured: false,
  },

  // Travel
  {
    name: "Kiwi",
    category: "travel",
    url: "https://mcp.kiwi.com",
    authType: "open",
    maintainer: "Kiwi",
    maintainerUrl: "https://kiwi.com",
    isFeatured: false,
  },

  // Email
  {
    name: "Autosend",
    category: "email",
    url: "https://mcp.autosend.com/",
    authType: "oauth",
    maintainer: "Autosend",
    maintainerUrl: "https://autosend.com",
    isFeatured: false,
  },

  // Data
  {
    name: "Google BigQuery",
    category: "data",
    url: "https://bigquery.googleapis.com/mcp",
    authType: "apikey",
    maintainer: "Google",
    maintainerUrl: "https://cloud.google.com/bigquery",
    isFeatured: false,
  },
  {
    name: "Kensho Finance",
    category: "data",
    url: "https://kfinance.kensho.com/integrations/mcp",
    authType: "open",
    maintainer: "Kensho",
    maintainerUrl: "https://kensho.com",
    isFeatured: false,
  },
  {
    name: "Morningstar",
    category: "data",
    url: "https://mcp.morningstar.com/mcp",
    authType: "oauth",
    maintainer: "Morningstar",
    maintainerUrl: "https://morningstar.com",
    isFeatured: false,
  },

  // Other
  // {
  //   name: "Google Workspace",
  //   category: "productivity",
  //   url: "https://google-mcp.scira.app/mcp",
  //   authType: "apikey",
  //   maintainer: "Google",
  //   maintainerUrl: "https://google.com",
  //   isFeatured: false,
  // },
  {
    name: "Google Maps",
    category: "other",
    url: "https://mapstools.googleapis.com/mcp",
    authType: "apikey",
    maintainer: "Google",
    maintainerUrl: "https://developers.google.com/maps",
    isFeatured: false,
  },
  {
    name: "Zapier",
    category: "productivity",
    url: "https://mcp.zapier.com/api/mcp/mcp",
    authType: "apikey",
    maintainer: "Zapier",
    maintainerUrl: "https://zapier.com",
    isFeatured: false,
  },
  {
    name: "Render",
    category: "dev",
    url: "https://mcp.render.com/mcp",
    authType: "apikey",
    maintainer: "Render",
    maintainerUrl: "https://render.com",
    isFeatured: false,
  },
  {
    name: "Indeed",
    category: "other",
    url: "https://mcp.indeed.com/claude/mcp",
    authType: "oauth",
    maintainer: "Indeed",
    maintainerUrl: "https://indeed.com",
    isFeatured: false,
  },
  {
    name: "Lastminute",
    category: "travel",
    url: "https://mcp.lastminute.com/mcp",
    authType: "open",
    maintainer: "lastminute.com",
    maintainerUrl: "https://lastminute.com",
    isFeatured: false,
  },
  {
    name: "Trivago",
    category: "travel",
    url: "https://mcp.trivago.com/mcp",
    authType: "open",
    maintainer: "Trivago",
    maintainerUrl: "https://trivago.com",
    isFeatured: false,
  },
  {
    name: "Orshot",
    category: "design",
    url: "https://mcp.orshot.com/mcp",
    authType: "oauth",
    maintainer: "Orshot",
    maintainerUrl: "https://orshot.com",
    isFeatured: false,
  },
  {
    name: "Parallel Task",
    category: "search",
    url: "https://task-mcp.parallel.ai/mcp",
    authType: "oauth",
    maintainer: "Parallel AI",
    maintainerUrl: "https://parallel.ai",
    isFeatured: false,
  },
  {
    name: "Parallel Search",
    category: "search",
    url: "https://search-mcp.parallel.ai/mcp",
    authType: "oauth",
    maintainer: "Parallel AI",
    maintainerUrl: "https://parallel.ai",
    isFeatured: false,
  },
  {
    name: "Jam",
    category: "dev",
    url: "https://mcp.jam.dev/mcp",
    authType: "oauth",
    maintainer: "Jam.dev",
    maintainerUrl: "https://jam.dev",
    isFeatured: false,
  },
  {
    name: "Netlify",
    category: "dev",
    url: "https://netlify-mcp.netlify.app/mcp",
    authType: "oauth",
    maintainer: "Netlify",
    maintainerUrl: "https://netlify.com",
    isFeatured: false,
  },
  {
    name: "Port IO",
    category: "dev",
    url: "https://mcp.port.io/v1",
    authType: "oauth",
    maintainer: "Port IO",
    maintainerUrl: "https://port.io",
    isFeatured: false,
  },
  {
    name: "Prisma Postgres",
    category: "database",
    url: "https://mcp.prisma.io/mcp",
    authType: "oauth",
    maintainer: "Prisma",
    maintainerUrl: "https://prisma.io",
    isFeatured: false,
  },
  {
    name: "Simplescraper",
    category: "search",
    url: "https://mcp.simplescraper.io/mcp",
    authType: "oauth",
    maintainer: "Simplescraper",
    maintainerUrl: "https://simplescraper.io",
    isFeatured: false,
  },
  {
    name: "Stack Overflow",
    category: "dev",
    url: "https://mcp.stackoverflow.com",
    authType: "oauth",
    maintainer: "Stack Overflow",
    maintainerUrl: "https://stackoverflow.com",
    isFeatured: false,
  },
  {
    name: "Wix",
    category: "design",
    url: "https://mcp.wix.com/sse",
    authType: "oauth",
    maintainer: "Wix",
    maintainerUrl: "https://wix.com",
    isFeatured: false,
  },
  {
    name: "InVideo",
    category: "other",
    url: "https://mcp.invideo.io/sse",
    authType: "oauth",
    maintainer: "InVideo",
    maintainerUrl: "https://invideo.io",
    isFeatured: false,
  },
  {
    name: "Scorecard",
    category: "other",
    url: "https://scorecard-mcp.dare-d5b.workers.dev/sse",
    authType: "oauth",
    maintainer: "Scorecard",
    maintainerUrl: "https://scorecard.io",
    isFeatured: false,
  },
  {
    name: "Rube",
    category: "other",
    url: "https://rube.app/mcp",
    authType: "oauth",
    maintainer: "Composio",
    maintainerUrl: "https://rube.app",
    isFeatured: false,
  },
  {
    name: "Knock",
    category: "crm",
    url: "https://mcp.knock.app/mcp",
    authType: "oauth",
    maintainer: "Knock",
    maintainerUrl: "https://knock.app",
    isFeatured: false,
  },
  {
    name: "Meta Ads",
    category: "other",
    url: "https://mcp.pipeboard.co/meta-ads-mcp",
    authType: "oauth",
    maintainer: "Pipeboard",
    maintainerUrl: "https://pipeboard.co",
    isFeatured: false,
  },
  {
    name: "Cloudflare Observability",
    category: "dev",
    url: "https://observability.mcp.cloudflare.com/sse",
    authType: "oauth",
    maintainer: "Cloudflare",
    maintainerUrl: "https://cloudflare.com",
    isFeatured: false,
  },
  {
    name: "Instant",
    category: "dev",
    url: "https://mcp.instantdb.com/mcp",
    authType: "oauth",
    maintainer: "Instant",
    maintainerUrl: "https://instantdb.com",
    isFeatured: false,
  },
];

// ─── Seeding ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding database...\n");

  // Seed plans
  console.log("Seeding plans...");
  for (const plan of plans) {
    const result = await prisma.plan.upsert({
      where: { id: plan.id },
      update: {
        tier: plan.tier,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        maxChats: plan.maxChats,
        maxProjects: plan.maxProjects,
        maxMessages: plan.maxMessages,
        maxMemoryItems: plan.maxMemoryItems,
        maxBranchesPerChat: plan.maxBranchesPerChat,
        maxFolders: plan.maxFolders,
        maxAttachmentsPerChat: plan.maxAttachmentsPerChat,
        maxFileSizeMb: plan.maxFileSizeMb,
        canExport: plan.canExport,
        canApiAccess: plan.canApiAccess,
        features: plan.features,
        sortOrder: plan.sortOrder,
        isActive: plan.isActive,
        isVisible: plan.isVisible,
        isDefault: plan.isDefault,
      },
      create: plan,
    });
    console.log(`  ✓ ${result.name} plan`);
  }

  // Invalidate plans cache
  try {
    await redis.del(PLANS_CACHE_KEY);
    console.log("  ✓ Plans cache invalidated");
  } catch (e) {
    console.log("  ! Could not invalidate cache:", e);
  }

  // Seed MCP catalog items
  console.log("\n🔌 Seeding MCP catalog...");
  for (let i = 0; i < catalogItems.length; i++) {
    const item = catalogItems[i];
    const result = await prisma.mcpCatalogItem.upsert({
      where: { url: item.url },
      update: {
        name: item.name,
        category: item.category,
        authType: item.authType,
        maintainer: item.maintainer,
        maintainerUrl: item.maintainerUrl,
        isFeatured: item.isFeatured,
        sortOrder: i,
      },
      create: {
        ...item,
        sortOrder: i,
        isActive: true,
      },
    });
    console.log(`  ✓ ${result.name}`);
  }

  console.log("\nSeeding complete!");
  console.log(`   - ${plans.length} plans`);
  console.log(`   - ${catalogItems.length} catalog items`);
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
