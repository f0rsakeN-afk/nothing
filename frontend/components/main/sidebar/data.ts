import { MessageSquare, FolderOpenDot, Archive } from "lucide-react";

export const TABS = [
  { id: "chats", label: "Chats", icon: MessageSquare },
  { id: "projects", label: "Projects", icon: FolderOpenDot },
  { id: "archive", label: "Archive", icon: Archive },
] as const;

export type TabId = (typeof TABS)[number]["id"];

export type HistoryItem = {
  id: string;
  title: string;
};

export type HistoryGroup = {
  label: string;
  items: HistoryItem[];
};

export const HISTORY: HistoryGroup[] = [
  {
    label: "Today",
    items: [
      { id: "1", title: "Architecture Review" },
      { id: "2", title: "API Design Patterns" },
      { id: "3", title: "Fix memory leak in worker" },
    ],
  },
  {
    label: "Yesterday",
    items: [
      { id: "4", title: "Draft onboarding email" },
      { id: "5", title: "Refactor auth middleware" },
      { id: "6", title: "Postgres query optimisation" },
    ],
  },
  {
    label: "Last 7 Days",
    items: [
      { id: "7", title: "CI pipeline setup" },
      { id: "8", title: "Rate limiting strategy" },
      { id: "9", title: "Webhook retry logic" },
      { id: "10", title: "Stripe integration plan" },
    ],
  },
];
