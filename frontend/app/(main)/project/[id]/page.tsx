"use client";

import { useState } from "react";
import { ChatInput } from "@/components/main/home/chat-input";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ProjectHeader } from "@/components/main/project/project-header";
import { ProjectInstructions } from "@/components/main/project/project-instructions";
import { ProjectFilesDropzone } from "@/components/main/project/project-files-dropzone";
import { ProjectChatList } from "@/components/main/project/project-chat-list";

const PROJECT_CHATS = [
  {
    id: "c1",
    title: "AI comprehension and societal implications assignment",
    time: "Last message 10 seconds ago",
  },
  {
    id: "c2",
    title: "React context scaling patterns",
    time: "Last message 2 hours ago",
  },
];

export default function ProjectWorkspacePage({
  params,
}: {
  params: { id: string };
}) {
  const [input, setInput] = useState("");

  const handleSubmit = (value: string) => {
    console.log("Submitting in project:", params.id, "value:", value);
    setInput("");
  };

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
            <ProjectHeader />

            {/* Chat Input Area */}
            <div className="w-full transition-colors">
              <ChatInput
                value={input}
                onChange={setInput}
                onSubmit={handleSubmit}
              />
            </div>

            <ProjectChatList chats={PROJECT_CHATS} />
          </div>

          {/* Right Column: Instructions & Files */}
          <div className="w-full lg:w-[380px] shrink-0 border border-border/60 rounded-2xl bg-card/10 overflow-hidden flex flex-col">
            <ProjectInstructions />
            <ProjectFilesDropzone />
          </div>
        </div>
      </div>
    </div>
  );
}
