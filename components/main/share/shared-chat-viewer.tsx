'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Copy, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AiResponseFormatter } from '@/components/main/chat/ai-response-formatter';
import { forkChat } from '@/services/chat.service';

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
  isDemo?: boolean;
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
}

export function SharedChatViewer({
  chatId,
  chatTitle,
  shareUrl,
  messages,
  isSignedIn,
  sharedBy,
  isDemo = false,
}: SharedChatViewerProps) {
  const router = useRouter();
  const [copied, setCopied] = React.useState(false);
  const [isForking, setIsForking] = React.useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleFork = async () => {
    if (!chatId || isForking) return;
    setIsForking(true);
    try {
      const result = await forkChat(chatId);
      router.push(`/chat/${result.newChatId}`);
    } catch (error) {
      console.error('Failed to fork chat:', error);
      setIsForking(false);
    }
  };

  const handleSignIn = () => {
    router.push(`/sign-in?next=${encodeURIComponent(`/share/${chatId}`)}`);
  };

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex w-full max-w-3xl mx-auto items-center justify-between px-6 h-16">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            {/* Logo mark */}
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-primary">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-[15px] font-semibold text-foreground truncate">{chatTitle}</h1>
                {isDemo && (
                  <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    DEMO
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground/60">
                Shared by {sharedBy} · {formatTime(messages[0]?.createdAt || new Date())}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyLink}
              className="h-9 px-3 text-xs gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy link
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Messages - matching /chat/:id layout: AI on left, user on right */}
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pt-24 pb-32">
        <div className="w-full space-y-2">
          {messages.map((message) => {
            const isUser = message.role === 'user' || message.sender === 'user';
            return (
              <div
                key={message.id}
                className={cn(
                  "group/user-msg w-full py-1",
                  isUser ? "py-2" : "py-4"
                )}
              >
                {isUser ? (
                  /* User message - right aligned, matching chat-message.tsx UserMessage */
                  <div className="flex flex-col items-end gap-1.5 px-2">
                    <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-[14px] leading-relaxed text-primary-foreground shadow-xs">
                      {message.content}
                    </div>
                  </div>
                ) : (
                  /* AI message - left aligned, matching chat-message.tsx AssistantMessage */
                  <div className="group/assistant-msg min-w-0 sm:max-w-[97%] pl-2">
                    <div className="rounded-2xl rounded-tl-sm bg-muted/50 px-4 py-3">
                      <AiResponseFormatter
                        content={message.content}
                        className="text-sm leading-relaxed"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Floating CTA bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <div className="w-full max-w-3xl mx-auto px-6 pb-6">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-background/95 backdrop-blur-xl px-5 py-4 shadow-xl">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground leading-tight">
                {isSignedIn ? 'Continue this conversation' : 'Sign in to keep chatting'}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-0.5 leading-tight hidden sm:block">
                {isSignedIn
                  ? 'Add this chat to your account and continue where you left off'
                  : 'Create a free account to start chatting with AI'
                }
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={handleCopyLink} className="h-9 text-xs rounded-lg gap-1.5">
                <Copy className="h-3.5 w-3.5" />
              </Button>
              {isSignedIn ? (
                <Button size="sm" onClick={handleFork} disabled={isForking} className="h-9 text-xs rounded-lg gap-1.5 px-4">
                  {isForking ? "Forking..." : "Continue"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button size="sm" onClick={handleSignIn} className="h-9 text-xs rounded-lg gap-1.5 px-4">
                  Sign in free
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}