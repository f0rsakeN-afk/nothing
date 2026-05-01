import { Metadata } from "next";
import { Shield, Zap, Database, Clock, HardDrive, MessageSquare } from "lucide-react";

export const metadata: Metadata = {
  title: "Limits & Features | Eryx",
  description: "See what's included in each Eryx plan - rate limits, account limits, and feature access.",
  alternates: { canonical: "/limits" },
};

const rateLimits = [
  {
    action: "Default API",
    free: 60,
    basic: 90,
    pro: 150,
    enterprise: 180,
    icon: Zap,
  },
  {
    action: "Chat messages",
    free: 30,
    basic: 45,
    pro: 75,
    enterprise: 90,
    icon: MessageSquare,
  },
  {
    action: "Web searches",
    free: 15,
    basic: 23,
    pro: 38,
    enterprise: 45,
    icon: Zap,
  },
  {
    action: "File uploads",
    free: 3,
    basic: 5,
    pro: 8,
    enterprise: 10,
    icon: HardDrive,
    note: "Max 10/min even for Enterprise",
  },
  {
    action: "Chat exports",
    free: "2/hr",
    basic: "3/hr",
    pro: "5/hr",
    enterprise: "6/hr",
    icon: Clock,
  },
];

const accountLimits = [
  {
    resource: "Chats",
    free: "50",
    basic: "100",
    pro: "Unlimited",
    enterprise: "Unlimited",
    icon: MessageSquare,
  },
  {
    resource: "Projects",
    free: "2",
    basic: "5",
    pro: "Unlimited",
    enterprise: "Unlimited",
    icon: Database,
  },
  {
    resource: "Messages / month",
    free: "200",
    basic: "500",
    pro: "Unlimited",
    enterprise: "Unlimited",
    icon: Zap,
  },
  {
    resource: "Memory items",
    free: "10",
    basic: "20",
    pro: "Unlimited",
    enterprise: "Unlimited",
    icon: Database,
  },
  {
    resource: "Folders",
    free: "1",
    basic: "5",
    pro: "Unlimited",
    enterprise: "Unlimited",
    icon: Database,
  },
  {
    resource: "Branches / chat",
    free: "0",
    basic: "5",
    pro: "Unlimited",
    enterprise: "Unlimited",
    icon: Database,
  },
  {
    resource: "Attachments / chat",
    free: "2",
    basic: "5",
    pro: "20",
    enterprise: "Unlimited",
    icon: HardDrive,
  },
  {
    resource: "Max file size",
    free: "2 MB",
    basic: "10 MB",
    pro: "25 MB",
    enterprise: "100 MB",
    icon: HardDrive,
  },
];

const features = [
  { name: "Basic chat", free: true, basic: true, pro: true, enterprise: true },
  { name: "Basic projects", free: true, basic: true, pro: true, enterprise: true },
  { name: "File attachments", free: false, basic: true, pro: true, enterprise: true },
  { name: "Chat folders", free: false, basic: true, pro: true, enterprise: true },
  { name: "Longer memory", free: false, basic: true, pro: true, enterprise: true },
  { name: "Chat branches", free: false, basic: false, pro: true, enterprise: true },
  { name: "Advanced customization", free: false, basic: false, pro: true, enterprise: true },
  { name: "Export chats", free: false, basic: false, pro: true, enterprise: true },
  { name: "Team collaboration", free: false, basic: false, pro: false, enterprise: true },
  { name: "API access", free: false, basic: false, pro: true, enterprise: true },
  { name: "Priority support", free: false, basic: false, pro: false, enterprise: true },
];

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CrossIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function LimitsPage() {
  return (
    <div className="bg-background text-foreground antialiased">
      {/* Hero */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/3 via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/8 mb-8">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight mb-4 leading-[1.15]">
            Limits & Features
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Everything you need to know about what&apos;s included in each plan.
          </p>
        </div>
      </section>

      {/* Rate Limits */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-display font-semibold tracking-tight mb-8 text-center">
            Rate Limits (per minute)
          </h2>
          <div className="rounded-xl border border-border/40 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20">
                  <th className="text-left p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Action</th>
                  <th className="text-center p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Free</th>
                  <th className="text-center p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Basic</th>
                  <th className="text-center p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Pro</th>
                  <th className="text-center p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {rateLimits.map((row, i) => (
                  <tr key={i} className="border-b border-border/30 last:border-0">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <row.icon className="w-4 h-4 text-muted-foreground/60" />
                        <span className="text-sm font-medium">{row.action}</span>
                      </div>
                    </td>
                    <td className="text-center p-4 text-sm text-muted-foreground">{row.free}</td>
                    <td className="text-center p-4 text-sm text-muted-foreground">{row.basic}</td>
                    <td className="text-center p-4 text-sm text-muted-foreground">{row.pro}</td>
                    <td className="text-center p-4 text-sm text-muted-foreground">{row.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground/60 mt-4 text-center">
            Rate limits are per-minute sliding window. Enterprise capped at 10/min for uploads regardless of tier multiplier.
          </p>
        </div>
      </section>

      {/* Account Limits */}
      <section className="py-16 px-6 border-t border-border/40">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-display font-semibold tracking-tight mb-8 text-center">
            Account Limits
          </h2>
          <div className="rounded-xl border border-border/40 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20">
                  <th className="text-left p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Resource</th>
                  <th className="text-center p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Free</th>
                  <th className="text-center p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Basic</th>
                  <th className="text-center p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Pro</th>
                  <th className="text-center p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {accountLimits.map((row, i) => (
                  <tr key={i} className="border-b border-border/30 last:border-0">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <row.icon className="w-4 h-4 text-muted-foreground/60" />
                        <span className="text-sm font-medium">{row.resource}</span>
                      </div>
                    </td>
                    <td className="text-center p-4 text-sm text-muted-foreground">{row.free}</td>
                    <td className="text-center p-4 text-sm text-muted-foreground">{row.basic}</td>
                    <td className="text-center p-4 text-sm text-muted-foreground">{row.pro}</td>
                    <td className="text-center p-4 text-sm text-muted-foreground">{row.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground/60 mt-4 text-center">
            -1 or &quot;Unlimited&quot; means no hard cap. Usage may be subject to fair use policy.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 border-t border-border/40">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-display font-semibold tracking-tight mb-8 text-center">
            Feature Comparison
          </h2>
          <div className="rounded-xl border border-border/40 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20">
                  <th className="text-left p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Feature</th>
                  <th className="text-center p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Free</th>
                  <th className="text-center p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Basic</th>
                  <th className="text-center p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Pro</th>
                  <th className="text-center p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {features.map((row, i) => (
                  <tr key={i} className="border-b border-border/30 last:border-0">
                    <td className="p-4 text-sm font-medium">{row.name}</td>
                    <td className="text-center p-4">
                      {row.free ? (
                        <CheckIcon className="w-4 h-4 text-primary mx-auto" />
                      ) : (
                        <CrossIcon className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                      )}
                    </td>
                    <td className="text-center p-4">
                      {row.basic ? (
                        <CheckIcon className="w-4 h-4 text-primary mx-auto" />
                      ) : (
                        <CrossIcon className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                      )}
                    </td>
                    <td className="text-center p-4">
                      {row.pro ? (
                        <CheckIcon className="w-4 h-4 text-primary mx-auto" />
                      ) : (
                        <CrossIcon className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                      )}
                    </td>
                    <td className="text-center p-4">
                      {row.enterprise ? (
                        <CheckIcon className="w-4 h-4 text-primary mx-auto" />
                      ) : (
                        <CrossIcon className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Note */}
      <section className="py-16 px-6 border-t border-border/40">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            All limits are subject to fair use policy. Rate limits are implemented using a per-minute sliding window algorithm.
            Account limits are checked against actual usage in real-time.
          </p>
        </div>
      </section>
    </div>
  );
}