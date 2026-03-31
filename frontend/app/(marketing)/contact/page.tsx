import { ContactForm } from "@/components/marketing/contact/contact-form";
import { ContactInfo } from "@/components/marketing/contact/contact-info";
import { ContactFaq } from "@/components/marketing/contact/contact-faq";

function ContactJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact — Nothing",
    description:
      "Have a question, idea, or just want to say hi? Reach out to the Nothing team.",
    url: "/contact",
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "/" },
        { "@type": "ListItem", position: 2, name: "Contact", item: "/contact" },
      ],
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default function ContactPage() {
  return (
    <>
      <ContactJsonLd />

      <div className="min-h-dvh bg-background text-foreground">
        <div className="max-w-5xl mx-auto px-6 py-12 lg:py-16 space-y-14">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-12 lg:gap-16 items-start">
            {/* Left — info */}
            <ContactInfo />

            {/* Right — form */}
            <div className="border border-border rounded-xl p-6 lg:p-8 bg-card">
              <ContactForm />
            </div>
          </div>

          {/* FAQ — full width below the two-column grid */}
          <ContactFaq />
        </div>
      </div>
    </>
  );
}
