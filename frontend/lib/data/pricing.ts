export const tiers = [
  {
    name: "Free",
    id: "free",
    price: "$0",
    priceNote: "per month",
    description: "Essential infrastructure for early-stage development and proof-of-concept deployments.",
    cta: "Get Started",
    featured: false,
  },
  {
    name: "Pro",
    id: "pro",
    price: "$12",
    priceNote: "per user/mo",
    description: "Reliable, scalable infrastructure built to support production workloads and growing teams.",
    cta: "Upgrade to Pro",
    featured: true,
  },
  {
    name: "Enterprise",
    id: "enterprise",
    price: "Custom",
    priceNote: "contact us",
    description: "Advanced controls, SLAs, and dedicated priority support for scale.",
    cta: "Contact Sales",
    featured: false,
  },
];

export const featureGroups = [
  {
    group: "Performance",
    features: [
      { label: "Search speed", free: "Standard", pro: "Priority", enterprise: "Ultra-low" },
      { label: "Rate limits", free: "1k / day", pro: "50k / day", enterprise: "Unlimited" },
      { label: "Concurrent jobs", free: "1", pro: "5", enterprise: "Unlimited" },
    ],
  },
  {
    group: "Features",
    features: [
      { label: "System design nodes", free: "Up to 50", pro: "Unlimited", enterprise: "Unlimited" },
      { label: "Vector embeddings", free: "768-dim", pro: "Up to 3072-dim", enterprise: "Custom" },
      { label: "Scraper frequency", free: "Hourly", pro: "Every 5 mins", enterprise: "Real-time" },
      { label: "Analytics", free: true, pro: true, enterprise: true },
      { label: "Priority support", free: false, pro: "Email", enterprise: "24/7 Phone" },
    ],
  },
  {
    group: "Security",
    features: [
      { label: "Audit logs", free: false, pro: true, enterprise: true },
      { label: "Custom domains", free: false, pro: true, enterprise: true },
      { label: "SSO / SAML", free: false, pro: false, enterprise: true },
    ],
  },
];
