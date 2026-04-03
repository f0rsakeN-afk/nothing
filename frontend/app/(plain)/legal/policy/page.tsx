import { LegalHeader } from "@/components/plain/legal/legal-header";
import { LegalSection } from "@/components/plain/legal/legal-section";
import { LegalToc } from "@/components/plain/legal/legal-toc";

function PolicyJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Privacy Policy — Nothing",
    description:
      "Read the Privacy Policy for Nothing. Learn exactly what data we collect, how we use it, and the choices you have over your personal information.",
    url: "/legal/policy",
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "/" },
        {
          "@type": "ListItem",
          position: 2,
          name: "Legal",
          item: "/legal/policy",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Privacy Policy",
          item: "/legal/policy",
        },
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
  { id: "overview", title: "Overview" },
  { id: "collection", title: "Information We Collect" },
  { id: "use", title: "How We Use Your Information" },
  { id: "sharing", title: "Sharing & Disclosure" },
  { id: "cookies", title: "Cookies & Tracking" },
  { id: "retention", title: "Data Retention" },
  { id: "security", title: "Security" },
  { id: "rights", title: "Your Rights" },
  { id: "children", title: "Children's Privacy" },
  { id: "changes", title: "Changes to This Policy" },
  { id: "contact", title: "Contact" },
];

export default function PolicyPage() {
  return (
    <>
      <PolicyJsonLd />
      <div className="min-h-dvh bg-background text-foreground">
        <LegalHeader />

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
                  Privacy Policy
                </h1>
                <p className="mt-3 text-base text-muted-foreground leading-relaxed max-w-xl">
                  Your privacy matters to us. This policy explains what we
                  collect, how we use it, and the choices you have.
                </p>
                <p className="mt-4 text-xs text-muted-foreground/60">
                  Last updated January 1, 2025
                </p>
              </div>

              <div className="divide-y divide-border">
                <LegalSection id="overview" title="Overview">
                  <p>
                    This Privacy Policy describes how we collect, use, and share
                    information about you when you use our services. By using
                    our platform, you agree to the collection and use of
                    information as described in this policy.
                  </p>
                  <p>
                    We are committed to protecting your personal information and
                    your right to privacy. If you have any questions or
                    concerns, please contact us at the details provided at the
                    bottom of this page.
                  </p>
                </LegalSection>

                <LegalSection id="collection" title="Information We Collect">
                  <p>We collect the following types of information:</p>
                  <ul>
                    <li>
                      <strong className="text-foreground font-medium">
                        Account information
                      </strong>{" "}
                      — name, email address, and password when you register
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">
                        Usage data
                      </strong>{" "}
                      — pages visited, features used, time spent, and
                      interactions within the platform
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">
                        Device information
                      </strong>{" "}
                      — IP address, browser type, operating system, and device
                      identifiers
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">
                        Content you provide
                      </strong>{" "}
                      — any data, files, or information you upload or submit
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">
                        Communication data
                      </strong>{" "}
                      — messages you send us, including support requests and
                      feedback
                    </li>
                  </ul>
                </LegalSection>

                <LegalSection id="use" title="How We Use Your Information">
                  <p>We use the information we collect to:</p>
                  <ul>
                    <li>Provide, operate, and improve the service</li>
                    <li>Create and manage your account</li>
                    <li>
                      Send transactional emails such as confirmations and
                      security alerts
                    </li>
                    <li>
                      Respond to your questions and provide customer support
                    </li>
                    <li>Detect, prevent, and address fraud or abuse</li>
                    <li>
                      Analyze usage patterns to improve product features and
                      experience
                    </li>
                    <li>Comply with legal obligations</li>
                  </ul>
                  <p>
                    We do not sell your personal information to third parties.
                    We will not use your data for purposes beyond those
                    described here without your explicit consent.
                  </p>
                </LegalSection>

                <LegalSection id="sharing" title="Sharing & Disclosure">
                  <p>
                    We do not share your personal information except in the
                    following circumstances:
                  </p>
                  <ul>
                    <li>
                      <strong className="text-foreground font-medium">
                        Service providers
                      </strong>{" "}
                      — trusted vendors who assist in operating our platform,
                      bound by confidentiality agreements
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">
                        Legal requirements
                      </strong>{" "}
                      — when required by law, regulation, or valid legal process
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">
                        Business transfers
                      </strong>{" "}
                      — in the event of a merger, acquisition, or sale of assets
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">
                        With your consent
                      </strong>{" "}
                      — when you have explicitly authorized a specific
                      disclosure
                    </li>
                  </ul>
                </LegalSection>

                <LegalSection id="cookies" title="Cookies & Tracking">
                  <p>
                    We use cookies and similar tracking technologies to operate
                    the service and understand how you interact with it. Cookies
                    are small files stored on your device that help us recognize
                    you and remember your preferences.
                  </p>
                  <ul>
                    <li>
                      <strong className="text-foreground font-medium">
                        Essential cookies
                      </strong>{" "}
                      — required for the service to function, such as session
                      authentication
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">
                        Analytics cookies
                      </strong>{" "}
                      — help us understand usage patterns and improve the
                      service
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">
                        Preference cookies
                      </strong>{" "}
                      — remember your settings such as theme and language
                    </li>
                  </ul>
                  <p>
                    You can control or disable cookies through your browser
                    settings, though doing so may affect service functionality.
                  </p>
                </LegalSection>

                <LegalSection id="retention" title="Data Retention">
                  <p>
                    We retain your personal information for as long as your
                    account is active or as needed to provide the service. We
                    also retain data as necessary to comply with legal
                    obligations, resolve disputes, and enforce our agreements.
                  </p>
                  <p>
                    When you delete your account, we will delete or anonymize
                    your personal data within 30 days, except where retention is
                    required by law.
                  </p>
                </LegalSection>

                <LegalSection id="security" title="Security">
                  <p>
                    We take reasonable technical and organizational measures to
                    protect your information against unauthorized access,
                    alteration, disclosure, or destruction — including
                    encryption in transit and at rest, access controls, and
                    regular security reviews.
                  </p>
                  <p>
                    No method of transmission over the internet is 100% secure.
                    While we strive to protect your data, we cannot guarantee
                    absolute security. You are responsible for maintaining the
                    security of your account credentials.
                  </p>
                </LegalSection>

                <LegalSection id="rights" title="Your Rights">
                  <p>
                    Depending on your location, you may have the following
                    rights regarding your personal information:
                  </p>
                  <ul>
                    <li>
                      <strong className="text-foreground font-medium">
                        Access
                      </strong>{" "}
                      — request a copy of the data we hold about you
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">
                        Correction
                      </strong>{" "}
                      — request correction of inaccurate or incomplete data
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">
                        Deletion
                      </strong>{" "}
                      — request deletion of your personal data
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">
                        Portability
                      </strong>{" "}
                      — receive your data in a structured, machine-readable
                      format
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">
                        Objection
                      </strong>{" "}
                      — object to certain types of processing, including direct
                      marketing
                    </li>
                  </ul>
                  <p>
                    To exercise any of these rights, contact us at the email
                    below. We will respond within 30 days.
                  </p>
                </LegalSection>

                <LegalSection id="children" title="Children's Privacy">
                  <p>
                    Our service is not directed to individuals under the age of
                    13. We do not knowingly collect personal information from
                    children. If you believe we have inadvertently collected
                    information from a child, please contact us immediately and
                    we will delete such information.
                  </p>
                </LegalSection>

                <LegalSection id="changes" title="Changes to This Policy">
                  <p>
                    We may update this Privacy Policy from time to time. When we
                    make material changes, we will update the date at the top of
                    this page and, where required, notify you by email or
                    through a prominent notice in the service.
                  </p>
                  <p>
                    Your continued use of the service after any changes
                    constitutes acceptance of the updated policy.
                  </p>
                </LegalSection>

                <LegalSection id="contact" title="Contact">
                  <p>
                    If you have any questions or concerns about this Privacy
                    Policy, please contact us at{" "}
                    <a
                      href="mailto:privacy@example.com"
                      className="text-foreground underline underline-offset-4 hover:text-muted-foreground  "
                    >
                      privacy@example.com
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
