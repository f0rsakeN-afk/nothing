import { PrismaClient, PlanTier } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/mydb",
});

const prisma = new PrismaClient({ adapter });

const plans = [
  {
    id: "free",
    tier: PlanTier.FREE,
    name: "Free",
    description: "Start for free. No credit card needed.",
    price: 0,
    stripePriceId: null,
    stripeProductId: null,
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
    metadata: {},
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
    price: 299, // $2.99/month
    stripePriceId: null,
    stripeProductId: null,
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
    features: ["basic-chat", "basic-projects", "longer-memory", "attachments", "chat-folders"],
    metadata: {},
    sortOrder: 1,
    isActive: true,
    isVisible: true,
    isDefault: false,
  },
  {
    id: "pro",
    tier: PlanTier.PRO,
    name: "Pro",
    description: "For power users. Half the price of ChatGPT Plus, built for speed.",
    price: 999, // $9.99/month
    stripePriceId: null,
    stripeProductId: null,
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
    metadata: {},
    sortOrder: 2,
    isActive: true,
    isVisible: true,
    isDefault: false,
  },
  {
    id: "enterprise",
    tier: PlanTier.ENTERPRISE,
    name: "Enterprise",
    description: "For teams that need the best. API access and dedicated support.",
    price: 2999, // $29.99/month
    stripePriceId: null,
    stripeProductId: null,
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
    metadata: {},
    sortOrder: 3,
    isActive: true,
    isVisible: true,
    isDefault: false,
  },
];

async function main() {
  console.log("🌱 Seeding plans...");

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
    console.log(`  ✓ ${result.name} plan (${result.id})`);
  }

  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
