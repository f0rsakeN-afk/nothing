"use client";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

// ─── Data ─────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    value: "response-time",
    question: "How quickly will I hear back?",
    answer:
      "We aim to respond to every message within 24 hours on business days. For urgent issues, please mention it in your message and we'll prioritise accordingly.",
  },
  {
    value: "bug-report",
    question: "What's the best way to report a bug?",
    answer:
      "Use the Technical Support topic in the form above and describe what you expected vs what happened. Screenshots or reproduction steps are always appreciated — they help us fix things faster.",
  },
  {
    value: "feature-request",
    question: "Can I suggest a feature or improvement?",
    answer:
      "Absolutely. We read every suggestion and log them in our product roadmap. While we can't build everything, user feedback is how we decide what comes next.",
  },
  {
    value: "partnership",
    question: "How do partnerships or integrations work?",
    answer:
      "Select the Partnership topic and tell us about your product or use case. Our team will review it and get back to you with next steps — no forms or NDAs required upfront.",
  },
  {
    value: "data",
    question: "What happens to the data I submit in this form?",
    answer:
      "Your submission is used only to respond to your inquiry. We don't share it with third parties or use it for marketing. See our Privacy Policy for the full details.",
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function ContactFaq() {
  return (
    <section className="border-t border-border pt-14 pb-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 lg:gap-16 items-start">
        {/* Left — label */}
        <div className="lg:sticky lg:top-24">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            FAQ
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            Common questions
          </h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs">
            Can&apos;t find what you&apos;re looking for? Send us a message and
            we&apos;ll get back to you.
          </p>
        </div>

        {/* Right — accordion */}
        <Accordion>
          {FAQS.map((faq) => (
            <AccordionItem key={faq.value} value={faq.value}>
              <AccordionTrigger className="py-4 text-sm font-medium text-foreground hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
