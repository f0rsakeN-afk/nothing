import { Metadata } from "next";
import { StatusContent } from "@/components/marketing/status/status-client";

export const metadata: Metadata = {
  title: "System Status | Eryx",
  description: "Real-time monitoring and operational status of the Eryx platform architecture.",
  alternates: { canonical: "/status" },
};

export default function StatusPageWrapper() {
  return (
    <div className="bg-background text-foreground antialiased">
      <section className="relative pt-28 pb-16 px-6 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
          <div className="w-[600px] h-[400px] rounded-full bg-primary/5 blur-[100px] -translate-y-1/4" />
        </div>

        <div className="max-w-4xl mx-auto relative z-10 text-center flex flex-col items-center">
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground mb-5">
            Platform Operations
          </p>
          <h1 className="text-4xl md:text-[3.25rem] font-display font-semibold tracking-tight text-foreground mb-6 leading-[1.1]">
            System Health
          </h1>

          <StatusContent />
        </div>
      </section>
    </div>
  );
}
