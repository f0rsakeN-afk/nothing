'use client';

import { useState, useEffect } from 'react';
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
  const shortcutGroups: ShortcutGroup[] = [
    {
      title: 'Global Navigation',
      icon: <Search className="h-4 w-4" />,
      shortcuts: [
        {
          keys: ['⌘', 'K'],
          description: 'Open command menu',
          context: 'Global',
        },
        {
          keys: ['Ctrl', 'Shift', 'N'],
          description: 'New chat',
          context: 'Global',
        },
        {
          keys: ['⌘', 'B'],
          description: 'Toggle sidebar',
          context: 'Global',
        },
        {
          keys: ['?'],
          description: 'Show keyboard shortcuts',
          context: 'Global',
        },
      ],
    },
    {
      title: 'Chat Interface',
      icon: <MessageSquare className="h-4 w-4" />,
      shortcuts: [
        {
          keys: ['↵'],
          description: 'Send message',
          context: 'Chat Input',
        },
        {
          keys: ['Shift', '↵'],
          description: 'New line in message',
          context: 'Chat Input',
        },
        {
          keys: ['Esc'],
          description: 'Cancel streaming / Close dialog',
          context: 'Chat Input',
        },
      ],
    },
    {
      title: 'Chat Actions',
      icon: <History className="h-4 w-4" />,
      shortcuts: [
        {
          keys: ['⌘', 'N'],
          description: 'New chat',
          context: 'Sidebar',
        },
        {
          keys: ['⌘', 'T'],
          description: 'Rename chat',
          context: 'Sidebar',
        },
        {
          keys: ['⌘', 'D'],
          description: 'Delete chat',
          context: 'Sidebar',
        },
        {
          keys: ['⌘', 'S'],
          description: 'Share chat',
          context: 'Sidebar',
        },
      ],
    },
    {
      title: 'Navigation',
      icon: <ArrowLeft className="h-4 w-4" />,
      shortcuts: [
        {
          keys: ['↑'],
          description: 'Previous chat in history',
          context: 'Chat List',
        },
        {
          keys: ['↓'],
          description: 'Next chat in history',
          context: 'Chat List',
        },
        {
          keys: ['←'],
          description: 'Collapse sidebar',
          context: 'Sidebar',
        },
        {
          keys: ['→'],
          description: 'Expand sidebar',
          context: 'Sidebar',
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
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>All available keyboard shortcuts in Eryx</DialogDescription>
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
            Press <Kbd className="text-xs">Esc</Kbd> to close this dialog
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
