import { LegalHeader } from "@/components/plain/legal/legal-header";
import { LegalSection } from "@/components/plain/legal/legal-section";
import { LegalToc } from "@/components/plain/legal/legal-toc";
import Link from "next/link";

function TermsJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Terms of Service — Nothing",
    description:
      "Read the Terms of Service for Nothing. Understand your rights, responsibilities, and the rules that govern your use of our platform.",
    url: "/legal/terms",
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "/" },
        { "@type": "ListItem", position: 2, name: "Legal", item: "/legal/terms" },
        { "@type": "ListItem", position: 3, name: "Terms of Service", item: "/legal/terms" },
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

const sections = [
  { id: "acceptance", title: "Acceptance of Terms" },
  { id: "use", title: "Use of the Service" },
  { id: "accounts", title: "Accounts & Registration" },
  { id: "prohibited", title: "Prohibited Conduct" },
  { id: "ip", title: "Intellectual Property" },
  { id: "termination", title: "Termination" },
  { id: "disclaimer", title: "Disclaimer of Warranties" },
  { id: "liability", title: "Limitation of Liability" },
  { id: "changes", title: "Changes to Terms" },
  { id: "contact", title: "Contact" },
];

export default function TermsPage() {
  return (
    <>
    <TermsJsonLd />
    <div className="min-h-dvh bg-background text-foreground">
      <LegalHeader currentPage="terms" />

      <div className="max-w-5xl mx-auto px-6 py-12 lg:py-16">
        <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-16">
          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4 px-2">
                Contents
              </p>
              <LegalToc items={sections} />
            </div>
          </aside>

          {/* Content */}
          <main className="min-w-0">
            <div className="mb-8 pb-8 border-b border-border">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Terms of Service
              </h1>
              <p className="mt-3 text-base text-muted-foreground leading-relaxed max-w-xl">
                By using our platform you agree to these terms. Please read them
                carefully before continuing.
              </p>
              <p className="mt-4 text-xs text-muted-foreground/60">
                Last updated January 1, 2025
              </p>
            </div>

            <div className="divide-y divide-border">
              <LegalSection id="acceptance" title="Acceptance of Terms">
                <p>
                  By creating an account or using our services in any way, you
                  acknowledge that you have read, understood, and agree to be
                  bound by these Terms of Service and our Privacy Policy. If you
                  do not agree to these terms, please do not use our services.
                </p>
                <p>
                  These terms constitute a legally binding agreement between you
                  and our company. Your continued use of the service following
                  any modifications constitutes your acceptance of the updated
                  terms.
                </p>
              </LegalSection>

              <LegalSection id="use" title="Use of the Service">
                <p>
                  Our service is intended for personal and commercial use in
                  accordance with these terms. You may use our platform to
                  access features and functionality we provide, subject to the
                  restrictions set forth herein.
                </p>
                <p>
                  We reserve the right to modify, suspend, or discontinue any
                  part of the service at any time with or without notice. We
                  will not be liable to you or any third party for any
                  modification, suspension, or discontinuation of the service.
                </p>
              </LegalSection>

              <LegalSection id="accounts" title="Accounts & Registration">
                <p>
                  To access certain features of the service, you must register
                  for an account. You agree to provide accurate, current, and
                  complete information during registration and to keep your
                  account information up to date.
                </p>
                <p>
                  You are responsible for maintaining the confidentiality of
                  your account credentials and for all activity that occurs
                  under your account. You agree to notify us immediately of any
                  unauthorized use of your account.
                </p>
                <p>
                  You may not share your account with others or create multiple
                  accounts for the purpose of circumventing our policies or
                  service limits.
                </p>
              </LegalSection>

              <LegalSection id="prohibited" title="Prohibited Conduct">
                <p>
                  You agree not to engage in any of the following activities:
                </p>
                <ul>
                  <li>
                    Violating any applicable laws, regulations, or third-party
                    rights
                  </li>
                  <li>
                    Transmitting harmful, offensive, or disruptive content
                  </li>
                  <li>
                    Attempting to gain unauthorized access to our systems or
                    other users&apos; accounts
                  </li>
                  <li>
                    Reverse engineering, decompiling, or disassembling any part
                    of the service
                  </li>
                  <li>
                    Using automated tools to scrape or extract data from the
                    platform without permission
                  </li>
                  <li>
                    Impersonating any person or entity, or misrepresenting your
                    affiliation
                  </li>
                  <li>
                    Interfering with or disrupting the integrity or performance
                    of the service
                  </li>
                </ul>
              </LegalSection>

              <LegalSection id="ip" title="Intellectual Property">
                <p>
                  All content, features, and functionality of the service —
                  including but not limited to text, graphics, logos, icons, and
                  software — are the exclusive property of our company and are
                  protected by intellectual property laws.
                </p>
                <p>
                  You retain ownership of any content you submit or upload to
                  the service. By submitting content, you grant us a worldwide,
                  non-exclusive, royalty-free license to use, store, display,
                  and distribute that content solely for the purpose of
                  providing the service.
                </p>
              </LegalSection>

              <LegalSection id="termination" title="Termination">
                <p>
                  We may suspend or terminate your access to the service at our
                  sole discretion, without notice, for conduct that we believe
                  violates these terms or is harmful to other users, us, or
                  third parties.
                </p>
                <p>
                  You may terminate your account at any time through your
                  account settings. Upon termination, your right to use the
                  service will immediately cease.
                </p>
              </LegalSection>

              <LegalSection id="disclaimer" title="Disclaimer of Warranties">
                <p>
                  The service is provided on an &quot;as is&quot; and &quot;as
                  available&quot; basis without warranties of any kind, either
                  express or implied. We do not warrant that the service will be
                  uninterrupted, error-free, or free of harmful components.
                </p>
                <p>
                  To the fullest extent permitted by law, we disclaim all
                  warranties, express or implied, including but not limited to
                  implied warranties of merchantability, fitness for a
                  particular purpose, and non-infringement.
                </p>
              </LegalSection>

              <LegalSection id="liability" title="Limitation of Liability">
                <p>
                  To the maximum extent permitted by applicable law, we shall
                  not be liable for any indirect, incidental, special,
                  consequential, or punitive damages — including loss of
                  profits, data, or goodwill — arising from your use of or
                  inability to use the service.
                </p>
                <p>
                  Our total liability to you for any claims arising from these
                  terms shall not exceed the greater of the amount you paid us
                  in the twelve months preceding the claim or one hundred
                  dollars ($100).
                </p>
              </LegalSection>

              <LegalSection id="changes" title="Changes to Terms">
                <p>
                  We may update these terms from time to time. When we make
                  material changes, we will update the date at the top of this
                  page and, where appropriate, notify you by email.
                </p>
                <p>
                  Your continued use of the service after any changes
                  constitutes your acceptance of the new terms. If you do not
                  agree to the updated terms, you must stop using the service.
                </p>
              </LegalSection>

              <LegalSection id="contact" title="Contact">
                <p>
                  If you have any questions about these Terms of Service, please
                  contact us at{" "}
                  <a
                    href="mailto:legal@example.com"
                    className="text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors"
                  >
                    legal@example.com
                  </a>
                  .
                </p>
              </LegalSection>
            </div>

          </main>
        </div>
      </div>
    </div>
    </>
  );
}
