/**
 * Plan Service
 * Reads plan data from database - single source of truth for plan configuration
 */

import prisma from "@/lib/prisma";
import { PlanTier } from "@/src/generated/prisma/client";

export interface PlanData {
  id: string;
  tier: PlanTier;
  name: string;
  description: string;
  price: number;
  stripePriceId: string | null;
  stripeProductId: string | null;
  credits: number;
  maxChats: number;
  maxProjects: number;
  maxMessages: number;
  maxMemoryItems: number;
  maxBranchesPerChat: number;
  maxFolders: number;
  maxAttachmentsPerChat: number;
  maxFileSizeMb: number;
  canExport: boolean;
  canApiAccess: boolean;
  features: string[];
  isActive: boolean;
  isVisible: boolean;
}

export async function getPlan(planId: string): Promise<PlanData | null> {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
  });

  if (!plan || !plan.isActive) return null;

  return {
    id: plan.id,
    tier: plan.tier,
    name: plan.name,
    description: plan.description,
    price: plan.price,
    stripePriceId: plan.stripePriceId,
    stripeProductId: plan.stripeProductId,
    credits: plan.credits,
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
    isActive: plan.isActive,
    isVisible: plan.isVisible,
  };
}

export async function getAllActivePlans(): Promise<PlanData[]> {
  const plans = await prisma.plan.findMany({
    where: {
      isActive: true,
      isVisible: true,
    },
    orderBy: { sortOrder: "asc" },
  });

  return plans.map((plan) => ({
    id: plan.id,
    tier: plan.tier,
    name: plan.name,
    description: plan.description,
    price: plan.price,
    stripePriceId: plan.stripePriceId,
    stripeProductId: plan.stripeProductId,
    credits: plan.credits,
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
    isActive: plan.isActive,
    isVisible: plan.isVisible,
  }));
}

export async function getDefaultPlan(): Promise<PlanData | null> {
  const plan = await prisma.plan.findFirst({
    where: {
      isActive: true,
      isDefault: true,
    },
  });

  if (!plan) return null;

  return {
    id: plan.id,
    tier: plan.tier,
    name: plan.name,
    description: plan.description,
    price: plan.price,
    stripePriceId: plan.stripePriceId,
    stripeProductId: plan.stripeProductId,
    credits: plan.credits,
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
    isActive: plan.isActive,
    isVisible: plan.isVisible,
  };
}

export async function getPlanByTier(tier: PlanTier): Promise<PlanData | null> {
  const plan = await prisma.plan.findUnique({
    where: { tier },
  });

  if (!plan || !plan.isActive) return null;

  return {
    id: plan.id,
    tier: plan.tier,
    name: plan.name,
    description: plan.description,
    price: plan.price,
    stripePriceId: plan.stripePriceId,
    stripeProductId: plan.stripeProductId,
    credits: plan.credits,
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
    isActive: plan.isActive,
    isVisible: plan.isVisible,
  };
}
