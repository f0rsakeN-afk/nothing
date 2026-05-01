import { PricingClient } from "@/components/marketing/pricing/pricing-client";

async function fetchPlansData() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/plans`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error("Failed to fetch plans");
  const { plans, currentPlan } = await res.json();

  // Transform array to object keyed by tier
  const plansObj = plans.reduce((acc: Record<string, Plan>, plan: Plan) => {
    acc[plan.tier.toLowerCase()] = {
      tier: plan.tier,
      name: plan.name,
      price: plan.price,
      credits: 0,
      maxChats: plan.maxChats,
      maxProjects: plan.maxProjects,
      features: plan.features,
      description: plan.description,
    };
    return acc;
  }, {});

  return {
    plans: plansObj,
    creditPackages: [],
    creditCosts: {},
    currentPlan: currentPlan,
  };
}

interface Plan {
  tier: string;
  name: string;
  price: number;
  credits: number;
  maxChats: number;
  maxProjects: number;
  features: string[];
  description?: string;
}

export async function Pricing({ className }: { className?: string }) {
  const data = await fetchPlansData();
  return <PricingClient data={data} />;
}