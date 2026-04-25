import Image from "next/image";
import { cn } from "@/lib/utils";

const leftIntegrations = [
  { name: "Notion", logo: "/logos/notion.svg", position: "left-top" as const },
  { name: "Google Drive", logo: "/logos/drive.svg", position: "left-middle" as const },
  { name: "Asana", logo: "/logos/asana.svg", position: "left-bottom" as const },
];

const rightIntegrations = [
  { name: "Jira", logo: "/logos/jira.svg", position: "right-top" as const },
  { name: "Confluence", logo: "/logos/confluence.svg", position: "right-middle" as const },
  { name: "Monday", logo: "/logos/monday.svg", position: "right-bottom" as const },
];

export function IntegrationsSection() {
  return (
    <section className="px-2 xl:px-0 pb-28 lg:pb-32 mx-auto w-full">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">
            Integrate with your favorite tools
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Connect seamlessly with popular platforms and services to enhance your workflow.
          </p>
        </div>

        {/* Integrations Layout */}
        <div className="relative mx-auto flex max-w-md items-center justify-between">
          {/* Left Integrations */}
          <div className="space-y-6">
            {leftIntegrations.map((integration) => (
              <IntegrationCard key={integration.name} {...integration}>
                <Image src={integration.logo} alt={integration.name} width={24} height={24} />
              </IntegrationCard>
            ))}
          </div>

          {/* Center Eryx Logo */}
          <div className="mx-auto my-2 flex w-fit justify-center gap-2">
            <div className="bg-muted relative z-20 rounded-2xl border p-1">
              <IntegrationCard isCenter={true}>
                <Image src="/logo.png" alt="Eryx" width={32} height={32} className="dark:invert" />
              </IntegrationCard>
            </div>
          </div>

          {/* Right Integrations */}
          <div className="space-y-6">
            {rightIntegrations.map((integration) => (
              <IntegrationCard key={integration.name} {...integration}>
                <Image src={integration.logo} alt={integration.name} width={24} height={24} />
              </IntegrationCard>
            ))}
          </div>

          {/* Connecting Lines */}
          <div
            role="presentation"
            className="absolute inset-1/3 bg-[radial-gradient(var(--dots-color)_1px,transparent_1px)] opacity-50 [--dots-color:black] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] dark:[--dots-color:white]"
          />
        </div>
      </div>
    </section>
  );
}

const IntegrationCard = ({
  children,
  className,
  position,
  isCenter = false,
}: {
  children: React.ReactNode;
  className?: string;
  position?: "left-top" | "left-middle" | "left-bottom" | "right-top" | "right-middle" | "right-bottom";
  isCenter?: boolean;
}) => {
  return (
    <div className={cn("bg-background relative flex size-12 rounded-xl border dark:bg-transparent", className)}>
      <div className={cn("relative z-20 m-auto size-fit", isCenter && "text-foreground")}>{children}</div>
      {position && !isCenter && (
        <div
          className={cn(
            "bg-linear-to-r to-muted-foreground/25 absolute z-10 h-px",
            position === "left-top" && "left-full top-1/2 w-[130px] origin-left rotate-[25deg]",
            position === "left-middle" && "left-full top-1/2 w-[120px] origin-left",
            position === "left-bottom" && "left-full top-1/2 w-[130px] origin-left rotate-[-25deg]",
            position === "right-top" && "bg-linear-to-l right-full top-1/2 w-[130px] origin-right rotate-[-25deg]",
            position === "right-middle" && "bg-linear-to-l right-full top-1/2 w-[120px] origin-right",
            position === "right-bottom" && "bg-linear-to-l right-full top-1/2 w-[130px] origin-right rotate-[25deg]"
          )}
        />
      )}
    </div>
  );
};
