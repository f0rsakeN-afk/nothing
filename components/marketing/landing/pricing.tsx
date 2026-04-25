import { PricingClient } from "@/components/marketing/pricing/pricing-client";

async function fetchPlansData() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/polar/plans`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error("Failed to fetch plans");
  return res.json();
}

export async function Pricing({ className }: { className?: string }) {
  const data = await fetchPlansData();
  return <PricingClient data={data} />;
}