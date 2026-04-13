/**
 * Polar Configuration
 * Merchant of Record for digital product sales
 * Handles tax compliance, payments, and automated benefit delivery
 *
 * Learn more: https://polar.sh/docs
 */

import { Polar } from "@polar-sh/sdk";

// Polar client instance
export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN || "",
  server: process.env.POLAR_MODE === "production" ? "production" : "sandbox",
});

// Webhook secret for signature verification
export const polarConfig = {
  // Authentication
  accessToken: process.env.POLAR_ACCESS_TOKEN || "",
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET || "",

  // Server mode: 'sandbox' | 'production'
  server: (process.env.POLAR_MODE || "sandbox") as "sandbox" | "production",

  // Credit pricing (in cents) - one-time packages
  // These map to Polar product IDs
  creditPackages: [
    { id: "credits_50", amount: 99, credits: 50, name: "Starter" },
    { id: "credits_200", amount: 299, credits: 200, name: "Basic" },
    { id: "credits_1000", amount: 999, credits: 1000, name: "Pro" },
    { id: "credits_5000", amount: 3999, credits: 5000, name: "Enterprise" },
  ] as const,

  // Credit costs per operation
  creditCosts: {
    "eryx-1": 1,
    "eryx-1-fast": 1,
    "eryx-1-pro": 5,
    "web-search": 3,
    "file-analysis": 5,
    "image-generation": 20,
  } as const,

  // Plan subscriptions (monthly) - map to Polar product IDs
  plans: {
    free: {
      name: "Free",
      price: 0,
      credits: 25,
      maxChats: 100,
      maxProjects: 2,
      description: "Try out the basics. Perfect for exploring what Eryx can do.",
      features: ["basic-chat", "basic-projects", "short-memory"],
      polarProductId: null, // No product for free tier
    },
    basic: {
      name: "Basic",
      price: 499, // $4.99/month
      credits: 200,
      maxChats: 500,
      maxProjects: 5,
      description: "For light users who want more capacity than the free tier.",
      features: ["basic-chat", "basic-projects", "longer-memory", "attachments"],
      polarProductId: process.env.POLAR_BASIC_PRODUCT_ID || "polar_basic_product_id",
    },
    pro: {
      name: "Pro",
      price: 1499, // $14.99/month
      credits: 1000,
      maxChats: -1, // unlimited
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
      polarProductId: process.env.POLAR_PRO_PRODUCT_ID || "polar_pro_product_id",
    },
    enterprise: {
      name: "Enterprise",
      price: 4999, // $49.99/month
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
      polarProductId: process.env.POLAR_ENTERPRISE_PRODUCT_ID || "polar_enterprise_product_id",
    },
  } as const,
} as const;

export type CreditPackage = typeof polarConfig.creditPackages[number];
export type PlanType = keyof typeof polarConfig.plans;

/**
 * Webhook event types from Polar
 * @see https://polar.sh/docs/events
 */
export type PolarWebhookEvent =
  | "checkout.created"
  | "checkout.updated"
  | "customer.created"
  | "customer.deleted"
  | "customer.state_changed"
  | "customer.updated"
  | "order.created"
  | "order.paid"
  | "order.refunded"
  | "order.updated"
  | "subscription.active"
  | "subscription.canceled"
  | "subscription.created"
  | "subscription.revoked"
  | "subscription.uncanceled"
  | "subscription.updated"
  | "benefit.created"
  | "benefit.updated"
  | "benefit_grant.created"
  | "benefit_grant.cycled"
  | "benefit_grant.revoked"
  | "benefit_grant.updated";

/**
 * Polar customer data from webhooks
 */
export interface PolarCustomer {
  id: string;
  email: string;
  stripeCustomerId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Polar order data from webhooks
 */
export interface PolarOrder {
  id: string;
  customerId: string;
  productId: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "refunded";
  createdAt: string;
}

/**
 * Polar subscription data from webhooks
 */
export interface PolarSubscription {
  id: string;
  customerId: string;
  productId: string;
  status: "active" | "canceled" | "past_due" | "trialing" | "unpaid";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
}