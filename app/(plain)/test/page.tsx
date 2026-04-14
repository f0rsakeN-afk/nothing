"use client";

import { useState, useCallback } from "react";
import { AILoader } from "@/components/main/chat/ai-loader";
import { Button } from "@/components/ui/button";
import { Play, Square } from "lucide-react";
import { ChatMessage } from "@/components/main/chat/chat-message";
import type { Message } from "@/components/main/chat/chat-message";
import { toast } from "@/components/ui/sileo-toast";

const STATIC_SEARCH_RESULTS = [
  {
    title: "Docker: Accelerated Container Application Development",
    url: "https://www.docker.com/",
    description: "Docker is a platform designed to help developers build, share, and run container applications through containerization technology.",
    engine: "duckduckgo",
    publishedDate: undefined,
    thumbnail: "",
  },
  {
    title: "Docker Tutorial - GeeksforGeeks",
    url: "https://www.geeksforgeeks.org/devops/docker-tutorial/",
    description: "Docker is a tool that simplifies the process of developing, packaging, and deploying applications using containers.",
    engine: "google",
    publishedDate: "2024-01-15",
    thumbnail: "",
  },
  {
    title: "Docker for Beginners: Everything You Need to Know",
    url: "https://www.howtogeek.com/733522/docker-for-beginners-everything-you-need-to-know/",
    description: "Learn what Docker is, how it works, and why developers use it for containerization.",
    engine: "bing",
    publishedDate: undefined,
    thumbnail: "",
  },
  {
    title: "Docker (software) - Wikipedia",
    url: "https://en.wikipedia.org/wiki/Docker_(software)",
    description: "Docker is a set of platform as a service products that use OS-level virtualization to deliver software in packages called containers.",
    engine: "duckduckgo",
    publishedDate: undefined,
    thumbnail: "",
  },
  {
    title: "Difference between docker compose and docker-compose",
    url: "https://stackoverflow.com/questions/66514436/difference-between-docker-compose-and-docker-compose",
    description: "docker compose is the newer V2 implementation written in Go, while docker-compose is the legacy Python implementation.",
    engine: "bing",
    publishedDate: "2024-03-07",
    thumbnail: "",
  },
];

const STATIC_AI_RESPONSE = `Docker is an open-source platform that automates the deployment, scaling, and management of applications using containerization. Here's what you need to know:

## What is Docker?

Docker packages applications into **containers** - lightweight, standalone units that include everything needed to run the software:
- Code and runtime
- System tools and libraries
- Settings and dependencies

## Key Benefits

1. **Consistency** - "Works on my machine" becomes "works everywhere"
2. **Isolation** - Containers run independently without interfering with each other
3. **Efficiency** - Shares system resources, lighter than virtual machines
4. **Portability** - Build once, run on any Docker-compatible environment

## Common Commands

\`\`\`bash
# Build an image
docker build -t myapp .

# Run a container
docker run -d -p 3000:3000 myapp

# List running containers
docker ps

# Stop a container
docker stop <container_id>
\`\`\`

## Docker vs Virtual Machines

| Feature | Docker | VM |
|---------|--------|-----|
| Startup Time | Seconds | Minutes |
| Size | MBs | GBs |
| Isolation | Process-level | Full OS |
| Performance | Near-native | Slight overhead |

Would you like me to explain any specific Docker concept in more detail?`;

export default function Page() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<Message | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const startStream = useCallback(() => {
    setIsStreaming(true);

    const msgId = crypto.randomUUID();

    // Initial message state
    const initialMessage: Message = {
      id: msgId,
      role: "assistant",
      content: "",
      isStreaming: true,
      steps: [],
      searchResults: [],
    };
    setCurrentMessage(initialMessage);

    // Create abort controller
    const controller = new AbortController();
    setAbortController(controller);

    // Build events array matching real backend SSE format
    // Real backend sends step events with results embedded, not separate search_complete
    type StepEvent = { type: "step"; step: string; status: string; message: string; results?: typeof STATIC_SEARCH_RESULTS };
    type ChunkEvent = { type: "chunk"; content: string; delay: number };
    type DelayEvent = null;

    const events: (StepEvent | ChunkEvent | DelayEvent)[] = [
      // Step: Search start
      { type: "step", step: "search", status: "start", message: "Searching the web..." },
      // Delay
      null,
      // Step: Search complete with results embedded (matches real backend)
      { type: "step", step: "search", status: "complete", message: "Found 5 sources", results: STATIC_SEARCH_RESULTS },
      // Delay
      null,
      // Step: AI start
      { type: "step", step: "ai", status: "start", message: "Generating response..." },
      // Delay
      null,
      // AI response chunks - faster to simulate real streaming speed
      ...STATIC_AI_RESPONSE.split("").map((char, i): ChunkEvent => ({
        type: "chunk",
        content: char,
        delay: i < 50 ? 2 : i < 200 ? 4 : 8,
      })),
      // Step: AI complete
      { type: "step", step: "ai", status: "complete", message: "Response complete" },
      // Done
      null,
    ];

    let stepIndex = 0;

    const processEvent = () => {
      if (controller.signal.aborted) {
        setIsStreaming(false);
        return;
      }

      if (stepIndex >= events.length) {
        setIsStreaming(false);
        if (abortController === controller) setAbortController(null);
        return;
      }

      const event = events[stepIndex];
      stepIndex++;

      if (event === null) {
        // Delay between events
        setTimeout(processEvent, 300);
        return;
      }

      if (event.type === "step") {
        const e = event as StepEvent;
        setCurrentMessage((prev) => {
          if (!prev) return prev;
          const existingIdx = prev.steps?.findIndex((s) => s.step === e.step) ?? -1;
          const newSteps = existingIdx >= 0
            ? prev.steps?.map((s, i) => i === existingIdx ? { step: e.step, status: e.status, message: e.message } : s)
            : [...(prev.steps || []), { step: e.step, status: e.status, message: e.message }];
          // If search step completed with results, attach them (matches real backend behavior)
          const newSearchResults = e.step === "search" && e.status === "complete" && e.results
            ? e.results
            : prev.searchResults;
          return { ...prev, steps: newSteps, searchResults: newSearchResults };
        });
        setTimeout(processEvent, 100);
        return;
      }

      if (event.type === "chunk") {
        const e = event as ChunkEvent;
        setCurrentMessage((prev) => {
          if (!prev) return prev;
          return { ...prev, content: prev.content + e.content };
        });
        setTimeout(processEvent, e.delay);
        return;
      }
    };

    // Start processing
    setTimeout(processEvent, 500);
  }, [abortController]);

  const stopStream = useCallback(() => {
    if (abortController) {
      abortController.abort();
    }
    setIsStreaming(false);
  }, [abortController]);

  return (
    <div className=" flex items-center justify-center bg-background p-6">
      <div className="flex flex-col items-center gap-6 text-center max-w-4xl w-full">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            SSE Streaming Demo
          </h1>
          <p className="text-sm text-muted-foreground">
            Simulates web search + AI streaming with step progress
          </p>
        </div>

        {/* SSE Simulation */}
        <div className="w-full p-6 border border-border/40 bg-card rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-muted-foreground">Click Start to simulate SSE stream</p>
            {!isStreaming ? (
              <Button onClick={startStream} size="sm" variant="outline" className="gap-2">
                <Play className="w-4 h-4" />
                Start Stream
              </Button>
            ) : (
              <Button onClick={stopStream} size="sm" variant="destructive" className="gap-2">
                <Square className="w-4 h-4" />
                Stop
              </Button>
            )}
          </div>

          <div className="space-y-4 overflow-y-auto">
            {/* User message */}
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-[14px] leading-relaxed text-primary-foreground">
                What is Docker and why should I use it?
              </div>
            </div>

            {/* AI response with streaming */}
            {currentMessage && (
              <ChatMessage message={currentMessage} />
            )}
          </div>
        </div>

        {/* Toast Demo */}
        <div className="w-full p-6 border border-border/40 bg-card rounded-2xl">
          <p className="text-xs text-muted-foreground mb-4">Toast Notifications (Sileo Style)</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.success("Operation completed successfully!")}
            >
              Success
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.error("Something went wrong. Please try again.")}
            >
              Error
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.info("Here's some helpful information.")}
            >
              Info
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.loading("Processing your request...")}
            >
              Loading
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast("This is a default toast message", {
                description: "With an optional description",
              })}
            >
              Default
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast("With action", {
                action: {
                  label: "Undo",
                  onClick: () => toast.info("Action clicked!"),
                },
              })}
            >
              With Action
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
