'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  MessageSquare,
  History,
  Settings,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Share2,
} from 'lucide-react';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutGroup {
  title: string;
  icon: React.ReactNode;
  shortcuts: {
    keys: string[];
    description: string;
    context?: string;
  }[];
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const t = useTranslations("shortcuts");
  const shortcutGroups: ShortcutGroup[] = [
    {
      title: t("navigation"),
      icon: <Search className="h-4 w-4" />,
      shortcuts: [
        {
          keys: ['⌘', 'K'],
          description: t("openCommandMenu"),
          context: t("global"),
        },
        {
          keys: ['Ctrl', 'Shift', 'N'],
          description: t("newChat"),
          context: t("global"),
        },
        {
          keys: ['⌘', 'B'],
          description: t("toggleSidebar"),
          context: t("global"),
        },
        {
          keys: ['?'],
          description: t("showShortcuts"),
          context: t("global"),
        },
      ],
    },
    {
      title: t("interface"),
      icon: <MessageSquare className="h-4 w-4" />,
      shortcuts: [
        {
          keys: ['↵'],
          description: t("sendMessage"),
          context: t("chatInput"),
        },
        {
          keys: ['Shift', '↵'],
          description: t("newLine"),
          context: t("chatInput"),
        },
        {
          keys: ['Esc'],
          description: t("cancelStreaming"),
          context: t("chatInput"),
        },
      ],
    },
    {
      title: t("chat"),
      icon: <History className="h-4 w-4" />,
      shortcuts: [
        {
          keys: ['⌘', 'N'],
          description: t("newChat"),
          context: t("sidebar"),
        },
        {
          keys: ['⌘', 'T'],
          description: t("renameChat"),
          context: t("sidebar"),
        },
        {
          keys: ['⌘', 'D'],
          description: t("deleteChat"),
          context: t("sidebar"),
        },
        {
          keys: ['⌘', 'S'],
          description: t("shareChat"),
          context: t("sidebar"),
        },
      ],
    },
    {
      title: t("navigation"),
      icon: <ArrowLeft className="h-4 w-4" />,
      shortcuts: [
        {
          keys: ['↑'],
          description: t("previousChat"),
          context: t("chatList"),
        },
        {
          keys: ['↓'],
          description: t("nextChat"),
          context: t("chatList"),
        },
        {
          keys: ['←'],
          description: t("collapseSidebar"),
          context: t("sidebar"),
        },
        {
          keys: ['→'],
          description: t("expandSidebar"),
          context: t("sidebar"),
        },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Kbd className="text-sm">?</Kbd>
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {shortcutGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-3">
                <div className="flex items-center gap-2">
                  {group.icon}
                  <h3 className="font-semibold text-sm">{group.title}</h3>
                </div>

                <div className="space-y-2">
                  {group.shortcuts.map((shortcut, shortcutIndex) => (
                    <div
                      key={shortcutIndex}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">{shortcut.description}</div>
                        {shortcut.context && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {shortcut.context}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <div key={keyIndex} className="flex items-center gap-1">
                            <Kbd className="text-xs font-mono">{key}</Kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="text-muted-foreground text-xs">+</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {groupIndex < shortcutGroups.length - 1 && <Separator className="my-4" />}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-center pt-4 border-t">
          <div className="text-xs text-muted-foreground text-center">
            {t("pressEscToClose")}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to show shortcuts dialog with '?' key
export function useKeyboardShortcuts() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.key === '?' && !e.shiftKey) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { shortcutsOpen, setShortcutsOpen, KeyboardShortcutsDialog };
}
