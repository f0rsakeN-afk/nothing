'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Copy, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SharedChatViewerProps {
  chatId: string;
  chatTitle: string;
  shareUrl: string;
  messages: Array<{
    id: string;
    role: string | null;
    sender: string;
    content: string;
    createdAt: Date;
  }>;
  isSignedIn: boolean;
  sharedBy: string;
}

function Avatar({ fallback, className }: { fallback: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center rounded-md bg-muted text-xs font-medium shrink-0", className)}>
      {fallback}
    </div>
  );
}

export function SharedChatViewer({
  chatId,
  chatTitle,
  shareUrl,
  messages,
  isSignedIn,
  sharedBy,
}: SharedChatViewerProps) {
  const router = useRouter();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleSignIn = () => {
    router.push(`/sign-in?next=${encodeURIComponent(`/share/${chatId}`)}`);
  };

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/40">
        <div className="flex w-full max-w-2xl mx-auto items-center justify-between px-4 h-12">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar fallback={sharedBy.charAt(0).toUpperCase()} className="size-7" />
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-semibold tracking-tight text-foreground truncate">{chatTitle}</h1>
              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">
                by {sharedBy}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="ghost" size="sm" onClick={handleCopyLink} className="h-7 w-7 p-0 rounded-lg" title="Copy link">
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 pb-28 pt-14">
        <div className="w-full space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.role === 'assistant' || message.sender === 'ai' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              <Avatar
                fallback={message.role === 'assistant' || message.sender === 'ai' ? 'AI' : 'U'}
                className="size-8"
              />
              <div className="flex-1 min-w-0">
                <div className="rounded-2xl bg-muted/50 px-4 py-3">
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Floating bar */}
        <div className="fixed bottom-0 left-0 right-0 z-20">
          <div className="w-full max-w-2xl mx-auto px-4 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-border/50 bg-background/90 backdrop-blur-xl px-4 py-3 shadow-lg shadow-black/5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground leading-tight">You&apos;re viewing a shared chat</p>
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5 hidden sm:block">
                    {isSignedIn ? 'Copy it to your account to keep the conversation going' : 'Sign in to continue this conversation'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button variant="ghost" size="sm" onClick={handleCopyLink} className="h-8 text-xs rounded-lg gap-1.5 px-2.5 text-muted-foreground hover:text-foreground">
                  <Copy className="h-3 w-3" />
                  Copy link
                </Button>
                {isSignedIn ? (
                  <Button size="sm" className="h-8 text-xs rounded-lg gap-1.5 px-3 flex-1 sm:flex-none">
                    Continue in my account
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleSignIn} className="h-8 text-xs rounded-lg gap-1.5 px-3 flex-1 sm:flex-none">
                    Sign in to continue
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
