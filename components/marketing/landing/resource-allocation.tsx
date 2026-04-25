import Image from "next/image";
import { DashedLine } from "@/components/ui/dashed-line";

import { cn } from "@/lib/utils";

const topItems = [
  {
    title: "Remembers everything.",
    description:
      "Eryx keeps context across all your chats — no need to re-explain your project every time.",
    images: [
      {
        src: "/resource-allocation/templates.webp",
        alt: "Memory interface",
        width: 495,
        height: 186,
      },
    ],
    className:
      "flex-1 [&>.title-container]:mb-5 md:[&>.title-container]:mb-8 xl:[&>.image-container]:translate-x-6 [&>.image-container]:translate-x-2",
    fade: [""],
  },
  {
    title: "Search the web, cited.",
    description:
      "Get real-time answers with sources — no more guessing if the AI made it up.",
    images: [
      { src: "/logos/jira.svg", alt: "Jira logo", width: 48, height: 48 },
      { src: "/logos/excel.svg", alt: "Excel logo", width: 48, height: 48 },
      {
        src: "/logos/notion.svg",
        alt: "Notion logo",
        width: 48,
        height: 48,
      },
      { src: "/logos/word.svg", alt: "Word logo", width: 48, height: 48 },
      {
        src: "/logos/monday.svg",
        alt: "Monday logo",
        width: 48,
        height: 48,
      },
      {
        src: "/logos/drive.svg",
        alt: "Google Drive logo",
        width: 48,
        height: 48,
      },
      {
        src: "/logos/jira.svg",
        alt: "Jira logo",
        width: 48,
        height: 48,
      },
      { src: "/logos/asana.svg", alt: "Asana logo", width: 48, height: 48 },
    ],
    className:
      "flex-1 [&>.title-container]:mb-5 md:[&>.title-container]:mb-8 md:[&>.title-container]:translate-x-2 xl:[&>.title-container]:translate-x-4 [&>.title-container]:translate-x-0",
    fade: [],
  },
];

const bottomItems = [
  {
    title: "Organize with projects.",
    description:
      "Group related chats together — keep your research, code reviews, and brainstorms separate.",
    images: [
      {
        src: "/resource-allocation/graveyard.webp",
        alt: "Project interface",
        width: 305,
        height: 280,
      },
    ],
    className:
      "[&>.title-container]:mb-5 md:[&>.title-container]:mb-8 xl:[&>.image-container]:translate-x-6 [&>.image-container]:translate-x-2",
    fade: ["bottom"],
  },
  {
    title: "Share or export anytime.",
    description:
      "Download your conversations, share a link, or embed insights anywhere.",
    images: [
      {
        src: "/resource-allocation/discussions.webp",
        alt: "Share interface",
        width: 320,
        height: 103,
      },
    ],
    className:
      "justify-normal [&>.title-container]:mb-5 md:[&>.title-container]:mb-0 [&>.image-container]:flex-1 md:[&>.image-container]:place-items-center md:[&>.image-container]:-translate-y-3",
    fade: [""],
  },
  {
    title: "Works where you work.",
    description:
      "Integrations with the tools you already use — GitHub, Slack, Notion, and more.",
    images: [
      {
        src: "/resource-allocation/notifications.webp",
        alt: "Integrations interface",
        width: 305,
        height: 280,
      },
    ],
    className:
      "[&>.title-container]:mb-5 md:[&>.title-container]:mb-8 xl:[&>.image-container]:translate-x-6 [&>.image-container]:translate-x-2",
    fade: ["bottom"],
  },
];

export const ResourceAllocation = () => {
  return (
    <section
      id="resource-allocation"
      className="px-2 xl:px-0 overflow-hidden pb-28 lg:pb-32 mx-auto w-full"
    >
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="font-display text-center text-3xl font-semibold tracking-tight text-balance sm:text-4xl md:text-5xl lg:text-6xl">
          From first message to finished project
        </h2>

        <div className="mt-8 md:mt-12 lg:mt-20 space-y-8 md:space-y-12">
          <DashedLine orientation="horizontal" />

          {/* Top Features Grid - 2 items */}
          <div className="relative flex max-md:flex-col gap-8">
            {topItems.map((item, i) => (
              <Item key={i} item={item} isLast={i === topItems.length - 1} />
            ))}
          </div>
          <DashedLine orientation="horizontal" />

          {/* Bottom Features Grid - 3 items */}
          <div className="relative grid md:grid-cols-3 gap-8">
            {bottomItems.map((item, i) => (
              <Item
                key={i}
                item={item}
                isLast={i === bottomItems.length - 1}
                className="md:pb-0"
              />
            ))}
          </div>
        </div>
        <DashedLine orientation="horizontal" />
      </div>
    </section>
  );
};

interface ItemProps {
  item: (typeof topItems)[number] | (typeof bottomItems)[number];
  isLast?: boolean;
  className?: string;
}

const Item = ({ item, isLast, className }: ItemProps) => {
  return (
    <div
      className={cn(
        "relative flex flex-col justify-between py-6 md:py-8",
        className,
      )}
    >
      <div className="title-container text-balance">
        <h3 className="inline font-semibold">{item.title} </h3>
        <span className="text-muted-foreground"> {item.description}</span>
      </div>

      {item.fade.includes("bottom") && (
        <div className="from-muted/80 absolute inset-0 z-10 bg-linear-to-t via-transparent to-transparent md:hidden" />
      )}
      {item.images.length > 4 ? (
        <div className="relative overflow-hidden">
          <div className="flex flex-col gap-5">
            {/* First row - right aligned */}
            <div className="flex translate-x-4 justify-end gap-5">
              {item.images.slice(0, 4).map((image, j) => (
                <div
                  key={j}
                  className="bg-background grid aspect-square size-16 place-items-center rounded-2xl p-2 lg:size-20"
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    width={image.width}
                    height={image.height}
                    className="object-contain object-top-left"
                  />
                  <div className="from-muted/80 absolute inset-y-0 right-0 z-10 w-16 bg-linear-to-l to-transparent" />
                </div>
              ))}
            </div>
            {/* Second row - left aligned */}
            <div className="flex -translate-x-4 gap-5">
              {item.images.slice(4).map((image, j) => (
                <div
                  key={j}
                  className="bg-background grid aspect-square size-16 place-items-center rounded-2xl lg:size-20"
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    width={image.width}
                    height={image.height}
                    className="object-contain object-top-left"
                  />
                  <div className="from-muted absolute inset-y-0 bottom-0 left-0 z-10 w-14 bg-linear-to-r to-transparent" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="image-container grid grid-cols-1 gap-4">
          {item.images.map((image, j) => (
            <Image
              key={j}
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              className="object-contain object-top-left"
            />
          ))}
        </div>
      )}

      {!isLast && (
        <>
          <DashedLine
            orientation="vertical"
            className="absolute top-0 right-0 max-md:hidden"
          />
          <DashedLine
            orientation="horizontal"
            className="absolute inset-x-0 bottom-0 md:hidden"
          />
        </>
      )}
    </div>
  );
};
