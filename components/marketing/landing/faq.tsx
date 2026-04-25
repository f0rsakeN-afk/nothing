import Link from "next/link";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const categories = [
  {
    title: "General",
    questions: [
      {
        question: "What makes Eryx different from ChatGPT or Claude?",
        answer:
          "Unlike generic AI assistants, Eryx maintains memory across your conversations and projects. It learns your codebase, your preferences, and your context — so every conversation picks up where you left off, not from scratch.",
      },
      {
        question: "How does the memory feature work?",
        answer:
          "Eryx stores conversation context and project details securely. When you return, it automatically retrieves relevant history so you never have to re-explain your work. You can also manually add notes and context to specific projects.",
      },
      {
        question: "Can I use Eryx for technical research?",
        answer:
          "Yes. Eryx supports real-time web search with cited sources, code analysis, GitHub integration, and more. Get answers backed by verifiable sources — not just confident hallucinations.",
      },
    ],
  },
  {
    title: "Account & Billing",
    questions: [
      {
        question: "Can I try Eryx for free?",
        answer:
          "Absolutely. The free plan includes unlimited chat with short-term memory, real-time search, and basic project organization. No credit card required.",
      },
      {
        question: "How do I upgrade or cancel my subscription?",
        answer:
          "Upgrade or cancel anytime from your account settings. Changes take effect immediately, and you'll be billed only for the current period.",
      },
      {
        question: "Is my data secure?",
        answer:
          "Your conversations and data are encrypted in transit and at rest. We never train our AI models on user data, and you can export or delete your information at any time.",
      },
    ],
  },
  {
    title: "Integrations",
    questions: [
      {
        question: "What apps does Eryx connect to?",
        answer:
          "Eryx integrates with GitHub, Slack, Notion, Linear, and more. Connect your tools to surface relevant information directly in your chats.",
      },
      {
        question: "Is there an API available?",
        answer:
          "Pro and Enterprise plans include API access, allowing you to build custom workflows and embed Eryx's capabilities into your own products.",
      },
    ],
  },
];

export const FAQ = ({
  headerTag = "h2",
  className,
  className2,
}: {
  headerTag?: "h1" | "h2";
  className?: string;
  className2?: string;
}) => {
  return (
    <section id="faq" className={cn("px-2 xl:px-0 py-28 lg:py-32 flex items-center justify-center w-full", className)}>
      <div className="container max-w-5xl ">
        <div className={cn("mx-auto grid gap-16 lg:grid-cols-2", className2)}>
          <div className="space-y-4">
            {headerTag === "h1" ? (
              <h1 className="text-2xl font-semibold font-display tracking-tight md:text-4xl lg:text-5xl">
                Got Questions?
              </h1>
            ) : (
              <h2 className="text-2xl font-semibold font-display tracking-tight md:text-4xl lg:text-5xl">
                Got Questions?
              </h2>
            )}
            <p className="text-muted-foreground max-w-md leading-snug lg:mx-auto">
              If you can&apos;t find what you&apos;re looking for,{" "}
              <Link href="/contact" className="underline underline-offset-4">
                get in touch
              </Link>
              .
            </p>
          </div>

          <div className="grid gap-6 text-start min-w-0">
            {categories.map((category, categoryIndex) => (
              <div key={category.title} className="">
                <h3 className="text-muted-foreground border-b py-4">
                  {category.title}
                </h3>
                <Accordion className="w-full">
                  {category.questions.map((item, i) => (
                    <AccordionItem key={i} value={`${categoryIndex}-${i}`}>
                      <AccordionTrigger className='font-semibold tracking-wide'>{item.question}</AccordionTrigger>
                      <AccordionContent className="">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
