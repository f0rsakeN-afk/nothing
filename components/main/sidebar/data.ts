import { MessageSquare, FolderOpenDot, Archive } from "lucide-react";

export const TABS = [
  { id: "chats", label: "Chats", icon: MessageSquare },
  { id: "projects", label: "Projects", icon: FolderOpenDot },
  { id: "archive", label: "Archive", icon: Archive },
] as const;

export type TabId = (typeof TABS)[number]["id"];

// Types for chat/project items
export type HistoryItem = {
  id: string;
  title: string;
};

export type HistoryGroup = {
  label: string;
  items: HistoryItem[];
};

// Note: HISTORY and PROJECTS static data removed
// Data is now fetched from API via React Query in SidebarHistory
