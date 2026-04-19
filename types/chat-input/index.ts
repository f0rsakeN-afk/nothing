import type { ResponseStyle } from "@/components/main/home/chat-input/more-options-popover";

export interface Attachment {
  file: File;
  id: string;
  preview?: string;
}

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  className?: string;
  isLoading?: boolean;
  onOpenMemory?: () => void;
  onMemoriesSelect?: (memoryIds: string[]) => void;
  webSearchEnabled?: boolean;
  onWebSearchToggle?: (enabled: boolean) => void;
  projectId?: string | null;
  onProjectIdChange?: (projectId: string | null) => void;
  style?: ResponseStyle;
  onStyleChange?: (style: ResponseStyle) => void;
  currentModel?: string;
  onModelChange?: (model: string) => void;
}
