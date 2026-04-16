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
}
