import { LegalSection } from "@/components/plain/legal/legal-section";
import { LegalToc } from "@/components/plain/legal/legal-toc";

function PolicyJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Privacy Policy — Eryx",
    description:
      "Privacy Policy for Eryx AI platform. Learn exactly what data we collect, how we use it, and the choices you have over your personal information.",
    url: "/legal/policy",
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://eryx.ai" },
        {
          "@type": "ListItem",
          position: 2,
          name: "Legal",
          item: "https://eryx.ai/legal/policy",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Privacy Policy",
          item: "https://eryx.ai/legal/policy",
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
  { id: "overview", title: "1. Overview" },
  { id: "collection", title: "2. Information We Collect" },
  { id: "use", title: "3. How We Use Your Information" },
  { id: "legal-basis", title: "4. Legal Basis for Processing (GDPR)" },
  { id: "sharing", title: "5. Sharing & Disclosure" },
  { id: "international", title: "6. International Transfers" },
  { id: "cookies", title: "7. Cookies & Tracking" },
  { id: "retention", title: "8. Data Retention" },
  { id: "security", title: "9. Security" },
  { id: "rights", title: "10. Your Rights" },
  { id: "complaints", title: "11. Complaints" },
  { id: "children", title: "12. Children's Privacy" },
  { id: "data-breach", title: "13. Data Breach Notification" },
  { id: "changes", title: "14. Changes to This Policy" },
  { id: "contact", title: "15. Contact" },
];

export default function PolicyPage() {
  return (
    <>
      <PolicyJsonLd />
      <div className="min-h-dvh bg-background text-foreground">

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
                  Your privacy matters to us. This policy explains what data we
                  collect, how we use it, and the choices you have.
                </p>
                <p className="mt-4 text-xs text-muted-foreground/60">
                  Last updated April 23, 2026
                </p>
              </div>

              <details className="mb-8 p-4 rounded-lg border border-border bg-muted/30">
                <summary className="font-medium text-sm cursor-pointer select-none">
                  Quick Summary — What You Need to Know
                </summary>
                <div className="mt-3 text-sm text-muted-foreground space-y-2">
                  <p>
                    <strong className="text-foreground">We collect:</strong> Account info, usage data, device info, AI messages, and payment info.
                  </p>
                  <p>
                    <strong className="text-foreground">We do not sell your data.</strong> We share only with service providers and when legally required.
                  </p>
                  <p>
                    <strong className="text-foreground">Cookies:</strong> Essential (required), analytics (optional), and preference cookies only. No marketing cookies.
                  </p>
                  <p>
                    <strong className="text-foreground">Your rights:</strong> Access, correction, deletion, portability, and objection to processing.
                  </p>
                  <p>
                    <strong className="text-foreground">Data retention:</strong> Account data deleted 30 days after deletion. Usage logs kept 90 days. Financial records kept 7 years.
                  </p>
                  <p>
                    <strong className="text-foreground">AI conversations:</strong> Used to provide the service. Anonymized data may improve AI models.
                  </p>
                  <p>
                    <strong className="text-foreground">Breach notification:</strong> We will notify you within 72 hours if a breach affects your data.
                  </p>
                  <p>
                    <strong className="text-foreground">Contact:</strong> privacy@eryx.ai for all privacy matters.
                  </p>
                </div>
              </details>

              <div className="divide-y divide-border tracking-wide">
                <LegalSection id="overview" title="1. Overview">
                  <p>
                    Eryx (&quot;we,&quot; &quot;us,&quot; or &quot;Eryx&quot;) is committed to
                    protecting your personal information and your right to privacy.
                    This Privacy Policy describes how we collect, use, and share
                    information about you when you use our services.
                  </p>
                  <p>
                    By using Eryx, you agree to the collection and use of
                    information as described in this policy. If you do not agree
                    with our practices, please do not use our services.
                  </p>
                  <p>
                    <strong className="text-foreground font-medium">Controller:</strong> Eryx is the
                    data controller for the personal information we collect and
                    process. Our registered address is available upon request.
                  </p>
                </LegalSection>

                <LegalSection id="collection" title="2. Information We Collect">
                  <p>We collect the following types of information:</p>
                  <ul>
                    <li>
                      <strong className="text-foreground font-medium">Account information:</strong> Name,
                      email address, and password when you register
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Profile information:</strong>
                      Preferences, display name, and profile data you provide
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Usage data:</strong> Pages
                      visited, features used, time spent, interactions, and session
                      duration
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Device information:</strong> IP
                      address, browser type, operating system, device identifiers,
                      and browser settings
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Content you provide:</strong>
                      Messages, files, documents, and data you upload or submit
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Communication data:</strong>
                      Messages you send us, including support requests and feedback
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Payment information:</strong>
                      Billing address and payment details processed by our payment
                      providers (we do not store full credit card numbers)
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">AI input/output:</strong>
                      Messages you send to the service and AI responses generated
                    </li>
                  </ul>
                </LegalSection>

                <LegalSection id="use" title="3. How We Use Your Information">
                  <p>We use the information we collect to:</p>
                  <ul>
                    <li>Provide, operate, and improve the service</li>
                    <li>Create and manage your account</li>
                    <li>Process transactions and send related communications</li>
                    <li>
                      Send transactional emails (confirmations, security alerts,
                      password resets)
                    </li>
                    <li>
                      Respond to your questions and provide customer support
                    </li>
                    <li>Detect, prevent, and address fraud, abuse, and security risks</li>
                    <li>
                      Analyze usage patterns to improve product features and user
                      experience
                    </li>
                    <li>
                      Comply with legal obligations and respond to lawful requests
                    </li>
                  </ul>
                  <p>
                    We do not sell your personal information to third parties. We will
                    not use your data for purposes beyond those described here without
                    your explicit consent.
                  </p>
                  <p>
                    <strong className="text-foreground font-medium">AI Conversations:</strong> Your
                    messages and AI responses are used to provide the service. We may
                    use anonymized or aggregated data derived from AI conversations
                    to improve our AI models and services, subject to your settings.
                  </p>
                </LegalSection>

                <LegalSection id="legal-basis" title="4. Legal Basis for Processing (GDPR)">
                  <p>
                    If you are located in the European Economic Area (EEA), we
                    process your personal information only where we have a valid
                    legal basis. Our legal bases for processing are:
                  </p>
                  <ul>
                    <li>
                      <strong className="text-foreground font-medium">Contract:</strong> Processing
                      necessary to perform our contract with you (providing the
                      service)
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Consent:</strong> Where you
                      have given clear consent for specific processing purposes
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Legitimate interests:</strong>
                      Processing that supports our legitimate business interests,
                      provided it does not override your rights
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Legal obligation:</strong>
                      Processing required to comply with applicable laws
                    </li>
                  </ul>
                </LegalSection>

                <LegalSection id="sharing" title="5. Sharing & Disclosure">
                  <p>
                    We do not share your personal information except in the following
                    circumstances:
                  </p>
                  <ul>
                    <li>
                      <strong className="text-foreground font-medium">Service providers:</strong>
                      Trusted vendors who assist in operating our platform (hosting,
                      analytics, AI providers, payment processing), bound by
                      confidentiality agreements
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">AI providers:</strong>
                      Your conversations may be processed by third-party AI
                      providers (OpenAI, Anthropic, xAI) to deliver AI capabilities.
                      Their use of your data is governed by their privacy policies.
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Legal requirements:</strong>
                      When required by law, regulation, court order, or valid legal
                      process
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Protection of rights:</strong>
                      When necessary to protect our rights, investigate violations,
                      or enforce our terms
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Business transfers:</strong>
                      In the event of a merger, acquisition, or sale of assets, your
                      data may be transferred to the acquiring entity
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">With your consent:</strong>
                      When you have explicitly authorized a specific disclosure
                    </li>
                  </ul>
                  <p>
                    Any third parties who receive your data are contractually required
                    to protect it in accordance with this policy.
                  </p>
                </LegalSection>

                <LegalSection id="international" title="6. International Transfers">
                  <p>
                    Your information may be transferred to and processed in countries
                    other than Nepal, including the United States and other countries
                    where our service providers operate.
                  </p>
                  <p>
                    When we transfer personal information outside of your jurisdiction,
                    we ensure appropriate safeguards are in place, such as:
                  </p>
                  <ul>
                    <li>Standard Contractual Clauses (SCCs) approved by relevant authorities</li>
                    <li>Binding Corporate Rules for intra-group transfers</li>
                    <li>
                      Transfers to countries with adequate data protection laws
                    </li>
                  </ul>
                  <p>
                    You may request details of the safeguards we have in place for
                    international transfers by contacting us.
                  </p>
                </LegalSection>

                <LegalSection id="cookies" title="7. Cookies & Tracking">
                  <p>
                    We use cookies and similar tracking technologies to operate the
                    service and understand how you interact with it. Cookies are small
                    files stored on your device.
                  </p>
                  <ul>
                    <li>
                      <strong className="text-foreground font-medium">Essential cookies:</strong>
                      Required for the service to function (authentication, security,
                      session management). Cannot be disabled.
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Analytics cookies:</strong>
                      Help us understand usage patterns and improve the service. You
                      can consent to or reject these.
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Preference cookies:</strong>
                      Remember your settings such as theme and language preferences.
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Marketing cookies:</strong>
                      We do not use marketing or advertising cookies.
                    </li>
                  </ul>
                  <p>
                    You can control or disable cookies through your browser settings,
                    though doing so may affect service functionality. Essential
                    cookies cannot be disabled as they are required for the service
                    to function.
                  </p>
                  <p>
                    For more details on our cookie usage, see our{" "}
                    <a
                      href="/legal/cookies"
                      className="text-foreground underline underline-offset-4 hover:text-muted-foreground"
                    >
                      Cookie Policy
                    </a>
                    .
                  </p>
                </LegalSection>

                <LegalSection id="retention" title="8. Data Retention">
                  <p>
                    We retain your personal information for as long as your account
                    is active or as needed to provide the service. We also retain
                    data as necessary to comply with legal obligations, resolve
                    disputes, and enforce our agreements.
                  </p>
                  <ul>
                    <li>
                      <strong className="text-foreground font-medium">Account data:</strong>
                      Retained until account deletion, plus 30-day grace period
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">AI conversations:</strong>
                      Retained until you delete your account or individual chats
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Usage logs:</strong>
                      Retained for 90 days for security and debugging purposes
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Financial records:</strong>
                      Retained for 7 years as required by financial regulations
                    </li>
                  </ul>
                  <p>
                    When you delete your account, we will delete or anonymize your
                    personal data within 30 days, except where retention is required
                    by law (e.g., financial record retention).
                  </p>
                </LegalSection>

                <LegalSection id="security" title="9. Security">
                  <p>
                    We take reasonable technical and organizational measures to
                    protect your information against unauthorized access, alteration,
                    disclosure, or destruction. Our security measures include:
                  </p>
                  <ul>
                    <li>Encryption in transit (TLS/SSL) and at rest</li>
                    <li>Access controls and principle of least privilege</li>
                    <li>Regular security reviews and penetration testing</li>
                    <li>Secure authentication and session management</li>
                    <li>Employee security training and confidentiality agreements</li>
                  </ul>
                  <p>
                    No method of transmission over the internet is 100% secure. While
                    we strive to protect your data, we cannot guarantee absolute
                    security. You are responsible for maintaining the security of
                    your account credentials.
                  </p>
                </LegalSection>

                <LegalSection id="rights" title="10. Your Rights">
                  <p>
                    Depending on your location, you may have the following rights
                    regarding your personal information:
                  </p>
                  <ul>
                    <li>
                      <strong className="text-foreground font-medium">Access:</strong> Request a
                      copy of the data we hold about you
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Correction:</strong> Request
                      correction of inaccurate or incomplete data
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Deletion:</strong> Request
                      deletion of your personal data (subject to legal retention
                      requirements)
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Portability:</strong> Receive
                      your data in a structured, machine-readable format
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Objection:</strong> Object
                      to certain types of processing, including direct marketing
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Restriction:</strong>
                      Request we restrict processing of your data in certain
                      circumstances
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Withdraw consent:</strong>
                      Withdraw consent where processing is based on consent
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Data export:</strong>
                      Request an export of your data using our export tools in
                      account settings
                    </li>
                  </ul>
                  <p>
                    To exercise any of these rights, contact us at{" "}
                    <a
                      href="mailto:privacy@eryx.ai"
                      className="text-foreground underline underline-offset-4 hover:text-muted-foreground"
                    >
                      privacy@eryx.ai
                    </a>
                    . We will respond within 30 days.
                  </p>
                  <p>
                    For GDPR requests from EEA residents, we respond within 30 days as
                    required by regulation.
                  </p>
                </LegalSection>

                <LegalSection id="complaints" title="11. Complaints">
                  <p>
                    If you have concerns about how we handle your personal information,
                    please contact us first. We take privacy complaints seriously and
                    will respond within 30 days.
                  </p>
                  <p>
                    If you are located in the EEA and are unsatisfied with our response,
                    you have the right to lodge a complaint with your local data
                    protection authority.
                  </p>
                  <p>
                    For Nepal residents, you may file complaints with the Nepal
                    Telecommunications Authority or relevant consumer protection
                    authorities.
                  </p>
                </LegalSection>

                <LegalSection id="children" title="12. Children's Privacy">
                  <p>
                    Our service is not directed to individuals under the age of 18. We
                    do not knowingly collect personal information from children. If
                    you believe we have inadvertently collected information from a
                    minor, please contact us immediately at{" "}
                    <a
                      href="mailto:privacy@eryx.ai"
                      className="text-foreground underline underline-offset-4 hover:text-muted-foreground"
                    >
                      privacy@eryx.ai
                    </a>{" "}
                    and we will delete such information.
                  </p>
                </LegalSection>

                <LegalSection id="data-breach" title="13. Data Breach Notification">
                  <p>
                    In the event of a data breach that affects your personal
                    information, we will notify you within 72 hours of becoming
                    aware of the breach, where required by applicable law.
                  </p>
                  <p>
                    Our notification will include:
                  </p>
                  <ul>
                    <li>Description of the nature of the breach</li>
                    <li>Categories and approximate number of individuals affected</li>
                    <li>Potential consequences of the breach</li>
                    <li>Steps we are taking to address the breach</li>
                  </ul>
                </LegalSection>

                <LegalSection id="changes" title="14. Changes to This Policy">
                  <p>
                    We may update this Privacy Policy from time to time. When we
                    make material changes, we will:
                  </p>
                  <ul>
                    <li>Update the date at the top of this page</li>
                    <li>Notify you by email to your registered address</li>
                    <li>Display a prominent notice in the service for 30 days</li>
                  </ul>
                  <p>
                    Material changes include modifications to the types of data we
                    collect, how we use it, third-party sharing, or your rights.
                  </p>
                  <p>
                    Your continued use of the service after any changes constitutes
                    acceptance of the updated policy.
                  </p>
                </LegalSection>

                <LegalSection id="contact" title="15. Contact">
                  <p>
                    If you have any questions or concerns about this Privacy Policy,
                    please contact us at{" "}
                    <a
                      href="mailto:privacy@eryx.ai"
                      className="text-foreground underline underline-offset-4 hover:text-muted-foreground"
                    >
                      privacy@eryx.ai
                    </a>
                  </p>
                  <p>
                    For data protection inquiries:{" "}
                    <a
                      href="mailto:privacy@eryx.ai"
                      className="text-foreground underline underline-offset-4 hover:text-muted-foreground"
                    >
                      privacy@eryx.ai
                    </a>
                  </p>
                  <p>
                    For support:{" "}
                    <a
                      href="mailto:support@eryx.ai"
                      className="text-foreground underline underline-offset-4 hover:text-muted-foreground"
                    >
                      support@eryx.ai
                    </a>
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
