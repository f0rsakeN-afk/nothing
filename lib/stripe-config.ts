/**
 * Stripe Configuration
 * Pricing based on Groq llama-3.1-8b-instant costs
 * API cost: ~$0.00014/msg (2k input + 500 output tokens)
 * Target margin: ~10-15x API cost for sustainability
 */

export const stripeConfig = {
  // Test keys - replace with real keys in production
  secretKey: process.env.STRIPE_SECRET_KEY || "sk_test_placeholder",
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder",
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "whsec_placeholder",

  // Stripe Price IDs (from Stripe Dashboard)
  stripeBasicPriceId: process.env.STRIPE_BASIC_PRICE_ID || "price_basic_placeholder",
  stripeProPriceId: process.env.STRIPE_PRO_PRICE_ID || "price_pro_placeholder",

  // Credit pricing (in cents) - one-time packages
  creditPackages: [
    { id: "credits_50", amount: 99, credits: 50, name: "Starter" },
    { id: "credits_200", amount: 299, credits: 200, name: "Basic" },
    { id: "credits_1000", amount: 999, credits: 1000, name: "Pro" },
    { id: "credits_5000", amount: 3999, credits: 5000, name: "Enterprise" },
  ] as const,

  // Credit costs per operation (1 credit = 1 message)
  creditCosts: {
    // Chat completions (llama-3.1-8b-instant)
    "eryx-1": 1,
    "eryx-1-fast": 1,
    // Llama 3.3 70B (if added later)
    "eryx-1-pro": 5,
    // Web search
    "web-search": 3,
    // File analysis
    "file-analysis": 5,
    // Image generation (if added later)
    "image-generation": 20,
  } as const,

  // Plan subscriptions (monthly)
  plans: {
    free: {
      name: "Free",
      price: 0,
      credits: 25,
      maxChats: 100,
      maxProjects: 2,
      description: "Try out the basics. Perfect for exploring what Eryx can do.",
      features: [
        "basic-chat",
        "basic-projects",
        "short-memory",
      ],
    },
    basic: {
      name: "Basic",
      price: 499,  // $4.99/month
      credits: 200,
      maxChats: 500,
      maxProjects: 5,
      description: "For light users who want more capacity than the free tier.",
      features: [
        "basic-chat",
        "basic-projects",
        "longer-memory",
        "attachments",
      ],
    },
    pro: {
      name: "Pro",
      price: 1499,  // $14.99/month
      credits: 1000,
      maxChats: -1,  // unlimited
      maxProjects: -1,
      description: "For power users who chat frequently and need the best experience.",
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
    },
    enterprise: {
      name: "Enterprise",
      price: 4999,  // $49.99/month
      credits: 5000,
      maxChats: -1,
      maxProjects: -1,
      description: "For teams and heavy users who need maximum capacity and support.",
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
    },
  } as const,
} as const;

export type CreditPackage = typeof stripeConfig.creditPackages[number];
export type PlanType = keyof typeof stripeConfig.plans;
