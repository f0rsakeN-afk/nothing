import { PrismaClient, PlanTier } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5433/mydb",
});

const prisma = new PrismaClient({ adapter });

// ─── Plans ─────────────────────────────────────────────────────────────────────

const plans = [
  {
    id: "free",
    tier: PlanTier.FREE,
    name: "Free",
    description: "Start for free. No credit card needed.",
    price: 0,
    credits: 50,
    maxChats: 100,
    maxProjects: 3,
    maxMessages: 100,
    maxMemoryItems: 5,
    maxBranchesPerChat: 0,
    maxFolders: 0,
    maxAttachmentsPerChat: 0,
    maxFileSizeMb: 0,
    canExport: false,
    canApiAccess: false,
    features: ["basic-chat", "basic-projects", "short-memory"],
    sortOrder: 0,
    isActive: true,
    isVisible: true,
    isDefault: true,
  },
  {
    id: "basic",
    tier: PlanTier.BASIC,
    name: "Basic",
    description: "For individuals who want more than free. Less than a coffee.",
    price: 299,
    credits: 200,
    maxChats: 1000,
    maxProjects: 10,
    maxMessages: 1000,
    maxMemoryItems: 20,
    maxBranchesPerChat: 3,
    maxFolders: 5,
    maxAttachmentsPerChat: 5,
    maxFileSizeMb: 5,
    canExport: false,
    canApiAccess: false,
    features: [
      "basic-chat",
      "basic-projects",
      "longer-memory",
      "attachments",
      "chat-folders",
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
    description:
      "For power users. Half the price of ChatGPT Plus, built for speed.",
    price: 999,
    credits: 2000,
    maxChats: -1,
    maxProjects: -1,
    maxMessages: -1,
    maxMemoryItems: 100,
    maxBranchesPerChat: 10,
    maxFolders: -1,
    maxAttachmentsPerChat: 20,
    maxFileSizeMb: 25,
    canExport: true,
    canApiAccess: false,
    features: [
      "basic-chat",
      "basic-projects",
      "longer-memory",
      "attachments",
      "advanced-customization",
      "chat-folders",
      "chat-branches",
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
    description:
      "For teams that need the best. API access and dedicated support.",
    price: 2999,
    credits: 10000,
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
      "longer-memory",
      "attachments",
      "advanced-customization",
      "chat-folders",
      "chat-branches",
      "export-chats",
      "team-collaboration",
      "api-access",
      "priority-support",
      "dedicated-support",
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
        credits: plan.credits,
        maxChats: plan.maxChats,
        maxProjects: plan.maxProjects,
        maxMessages: plan.maxMessages,
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
