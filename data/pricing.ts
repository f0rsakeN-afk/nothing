export const tiers = [
  {
    name: "Free",
    id: "free",
    price: "$0",
    priceNote: "per month",
    description: "Essential AI chat for exploring and light use.",
    cta: "Get Started",
    featured: false,
  },
  {
    name: "Pro",
    id: "pro",
    price: "$14.99",
    priceNote: "per month",
    description: "For power users who need unlimited chats and advanced features.",
    cta: "Upgrade to Pro",
    featured: true,
  },
  {
    name: "Enterprise",
    id: "enterprise",
    price: "$49.99",
    priceNote: "per month",
    description: "Maximum capacity with team collaboration and priority support.",
    cta: "Upgrade to Enterprise",
    featured: false,
  },
];

export const featureGroups = [
  {
    group: "Limits",
    features: [
      { label: "Monthly credits", free: "25", pro: "1,000", enterprise: "5,000" },
      { label: "Chats", free: "100", pro: "Unlimited", enterprise: "Unlimited" },
      { label: "Projects", free: "2", pro: "Unlimited", enterprise: "Unlimited" },
    ],
  },
  {
    group: "Features",
    features: [
      { label: "Basic chat", free: true, pro: true, enterprise: true },
      { label: "File attachments", free: false, pro: true, enterprise: true },
      { label: "Longer memory", free: false, pro: true, enterprise: true },
      { label: "Advanced customization", free: false, pro: true, enterprise: true },
      { label: "Chat folders", free: false, pro: true, enterprise: true },
      { label: "Chat branches", free: false, pro: true, enterprise: true },
      { label: "Export chats", free: false, pro: true, enterprise: true },
    ],
  },
  {
    group: "Team & Support",
    features: [
      { label: "Team collaboration", free: false, pro: false, enterprise: true },
      { label: "API access", free: false, pro: false, enterprise: true },
      { label: "Priority support", free: false, pro: false, enterprise: true },
      { label: "Dedicated support", free: false, pro: false, enterprise: true },
    ],
  },
];

export const creditPackageLabels = [
  { id: "credits_50", credits: 50, price: "$0.99" },
  { id: "credits_200", credits: 200, price: "$2.99" },
  { id: "credits_1000", credits: 1000, price: "$9.99" },
  { id: "credits_5000", credits: 5000, price: "$39.99" },
];
