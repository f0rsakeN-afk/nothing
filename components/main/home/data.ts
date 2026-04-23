import type { ComponentType } from "react";
import { Workflow, Globe, Code2, Lightbulb } from "lucide-react";

export type ChipData = {
  readonly label: string;
  readonly icon: ComponentType<{ className?: string }>;
  readonly prompts: readonly string[];
};

export const CHIPS: readonly ChipData[] = [
  {
    label: "Design",
    icon: Workflow,
    prompts: [
      "Design a microservices architecture for an e-commerce platform",
      "System design for a real-time collaborative document editor",
      "Design a scalable database schema for a social network",
      "Plan a multi-tenant SaaS infrastructure on AWS",
      "Architecture for a high-traffic REST API with caching layers",
      "Design a CI/CD pipeline for a monorepo with multiple services",
    ],
  },
  {
    label: "Search",
    icon: Globe,
    prompts: [
      "What are the latest developments in AI agents in 2025?",
      "Compare the top JavaScript frameworks right now",
      "Latest research on large language model reasoning",
      "Best practices for API security this year",
      "What's new in React 19 and the ecosystem?",
      "Recent breakthroughs in quantum computing",
    ],
  },
  {
    label: "Code",
    icon: Code2,
    prompts: [
      "Write a rate limiter middleware in TypeScript",
      "Build a debounce and throttle hook in React",
      "Implement a binary search tree with full traversal methods",
      "Create a JWT authentication system in Node.js",
      "Write integration tests for a REST API with mocking",
      "Optimize a slow SQL query with proper indexing strategy",
    ],
  },
  {
    label: "Explain",
    icon: Lightbulb,
    prompts: [
      "Explain how WebSockets work vs long polling vs SSE",
      "How does the JavaScript event loop work under the hood?",
      "Explain CAP theorem with real-world examples",
      "What is memoization and when should I use it?",
      "How does React's reconciliation and Fiber architecture work?",
      "Explain OAuth 2.0 and the PKCE flow step by step",
    ],
  },
];

// Chip priority by profession - determines order shown on home page
const CHIP_PRIORITY_BY_PROFESSION: Record<string, string[]> = {
  developer: ["Code", "Explain", "Design", "Search"],
  lead: ["Design", "Code", "Explain", "Search"],
  pm: ["Design", "Search", "Explain", "Code"],
  architect: ["Design", "Code", "Explain", "Search"],
  researcher: ["Search", "Explain", "Design", "Code"],
  designer: ["Design", "Explain", "Search", "Code"],
  student: ["Explain", "Code", "Design", "Search"],
  founder: ["Design", "Search", "Code", "Explain"],
  devops: ["Code", "Design", "Explain", "Search"],
  other: ["Search", "Code", "Design", "Explain"],
};

/**
 * Get chips reordered based on user's profession
 * Falls back to default order if no profession provided
 */
export function getChipsByProfession(profession: string | null): readonly ChipData[] {
  if (!profession) return CHIPS;

  const priority = CHIP_PRIORITY_BY_PROFESSION[profession.toLowerCase()];
  if (!priority) return CHIPS;

  const chipMap = new Map(CHIPS.map((chip) => [chip.label, chip]));
  const reordered: ChipData[] = [];

  for (const label of priority) {
    const chip = chipMap.get(label);
    if (chip) reordered.push(chip);
  }

  // Add any chips not explicitly prioritized
  for (const chip of CHIPS) {
    if (!reordered.includes(chip)) {
      reordered.push(chip);
    }
  }

  return reordered;
}
