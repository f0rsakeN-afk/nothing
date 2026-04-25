import { Metadata } from "next";
import dynamic from "next/dynamic";

function StatusLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex justify-center">
        <div className="h-10 w-56 bg-muted rounded-full" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4">
            <div className="h-3 w-16 bg-muted rounded mb-3" />
            <div className="h-6 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

const StatusContent = dynamic(
  () => import("@/components/marketing/status/status-client").then((m) => m.StatusContent),
  { loading: StatusLoading },
);

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
