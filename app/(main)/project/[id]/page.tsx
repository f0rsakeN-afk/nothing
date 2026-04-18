"use client";

import { use, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProjectHeader } from "@/components/main/project/project-header";
import { ProjectInstructions } from "@/components/main/project/project-instructions";
import { ProjectFilesDropzone } from "@/components/main/project/project-files-dropzone";
import { ProjectChatList } from "@/components/main/project/project-chat-list";
import { ChatInput } from "@/components/main/home/chat-input";
import { useProject } from "@/hooks/use-projects";
import { useProjectChats } from "@/hooks/use-project-chats";
import { useCreateChat } from "@/hooks/use-create-chat";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { data: project, isLoading: isProjectLoading, error } = useProject(projectId);
  const { data: chatsData, isLoading: isChatsLoading } = useProjectChats(projectId);
  const [input, setInput] = useState("");

  const { createChat, isCreating } = useCreateChat({ projectId });

  const handleSubmit = useCallback(
    async (value: string) => {
      if (isCreating) return;
      await createChat(value);
    },
    [createChat, isCreating]
  );

  if (error) {
    return (
      <div className="flex flex-col h-full bg-background overflow-y-auto">
        <div className="w-full max-w-6xl mx-auto px-6 py-10 lg:py-16">
          <Link
            href="/project"
            className="inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" /> All projects
          </Link>
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <p className="text-destructive text-sm">Failed to load project</p>
            <p className="text-muted-foreground text-xs">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isProjectLoading) {
    return (
      <div className="flex flex-col h-full bg-background overflow-y-auto">
        <div className="w-full max-w-6xl mx-auto px-6 py-10 lg:py-16">
          <Link
            href="/project"
            className="inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" /> All projects
          </Link>
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">
            <div className="flex-1 space-y-10">
              <div className="space-y-4">
                <Skeleton className="h-12 w-64" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const chats = chatsData?.chats || [];

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="w-full max-w-6xl mx-auto px-6 py-10 lg:py-16">
        <Link
          href="/project"
          className="inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> All projects
        </Link>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">
          {/* Left Column: Header, Chat Input, Chat List */}
          <div className="flex-1 w-full space-y-10">
            <ProjectHeader project={project} />

            {/* Chat Input */}
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              isLoading={isCreating}
              placeholder="Ask about this project..."
            />

            {/* Chat List */}
            {isChatsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2 py-4 border-t border-border/40">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : (
              <ProjectChatList chats={chats} />
            )}
          </div>

          {/* Right Column: Instructions & Files */}
          <div className="w-full lg:w-[380px] shrink-0 border border-border/60 rounded-2xl bg-card/10 overflow-hidden flex flex-col">
            <ProjectInstructions
              projectId={projectId}
              instruction={project?.instruction || null}
            />
            <ProjectFilesDropzone projectId={projectId} />
          </div>
        </div>
      </div>
    </div>
  );
}
