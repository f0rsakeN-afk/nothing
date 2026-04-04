"use client";

import { useState } from "react";
import Link from "next/link";
import { ReportDialog } from "@/components/report/report-dialog";
import { FeedbackDialog } from "@/components/feedback/feedback-dialog";
import { CustomizeDialog } from "@/components/customize/customize-dialog";
import { AILoader } from "@/components/main/chat/ai-loader";
import { Button } from "@/components/ui/button";
import { Flag, MessageSquarePlus, Wand2, Rocket } from "lucide-react";

export default function Page() {
  const [reportOpen, setReportOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  return (
    <div className="h-dvh flex items-center justify-center bg-background p-6">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm w-full">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Component Testing
          </h1>
          <p className="text-sm text-muted-foreground">
            Use this page to test individual components in isolation.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Button
            onClick={() => setReportOpen(true)}
            variant="outline"
            className="gap-2 rounded-xl h-12"
          >
            <Flag className="w-4 h-4 text-primary" />
            Report Issue Modal
          </Button>

          <Button
            onClick={() => setFeedbackOpen(true)}
            variant="secondary"
            className="gap-2 rounded-xl h-12"
          >
            <MessageSquarePlus className="w-4 h-4" />
            Share Feedback Modal
          </Button>

          <Button
            onClick={() => setCustomizeOpen(true)}
            variant="outline"
            className="gap-2 rounded-xl h-12"
          >
            <Wand2 className="w-4 h-4" />
            Customize AI Modal
          </Button>

          <Link href="/onboarding" className="w-full">
            <Button
              variant="default"
              className="w-full gap-2 rounded-xl h-12 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
            >
              <Rocket className="w-4 h-4" />
              Launch Onboarding Page
            </Button>
          </Link>
        </div>

        <div className="w-full mt-6 p-6 border border-border/40 bg-card rounded-2xl flex flex-col items-center">
          <p className="text-xs text-muted-foreground mb-4">AI Streaming Loader State</p>
          <AILoader />
        </div>

        <ReportDialog isOpen={reportOpen} onOpenChange={setReportOpen} />
        <FeedbackDialog isOpen={feedbackOpen} onOpenChange={setFeedbackOpen} />
        <CustomizeDialog
          isOpen={customizeOpen}
          onOpenChange={setCustomizeOpen}
        />
      </div>
    </div>
  );
}
