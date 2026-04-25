"use client";

import { LegalSection } from "@/components/plain/legal/legal-section";
import { LegalToc } from "@/components/plain/legal/legal-toc";
import { useTranslations } from "next-intl";

function TermsJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Terms of Service — Eryx",
    description:
      "Terms of Service governing your use of Eryx AI platform. Understand your rights, responsibilities, and the rules that govern your use of our service.",
    url: "/legal/terms",
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://eryx.ai" },
        {
          "@type": "ListItem",
          position: 2,
          name: "Legal",
          item: "https://eryx.ai/legal/terms",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Terms of Service",
          item: "https://eryx.ai/legal/terms",
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
  { id: "acceptance", title: "1. Acceptance of Terms" },
  { id: "description", title: "2. Description of Service" },
  { id: "accounts", title: "3. Accounts & Registration" },
  { id: "billing", title: "4. Billing & Payments" },
  { id: "acceptable-use", title: "5. Acceptable Use Policy" },
  { id: "ai-outputs", title: "6. AI-Generated Content" },
  { id: "ip", title: "7. Intellectual Property" },
  { id: "third-party", title: "8. Third-Party Services" },
  { id: "security", title: "9. Security & Account Responsibility" },
  { id: "termination", title: "10. Termination" },
  { id: "disclaimer", title: "11. Disclaimer of Warranties" },
  { id: "liability", title: "12. Limitation of Liability" },
  { id: "indemnification", title: "13. Indemnification" },
  { id: " Modifications", title: "14. Modifications to Service" },
  { id: "governing", title: "15. Governing Law & Dispute Resolution" },
  { id: "changes", title: "16. Changes to Terms" },
  { id: "contact", title: "17. Contact" },
];

export default function TermsPage() {
  const t = useTranslations("legal");

  return (
    <>
      <TermsJsonLd />
      <div className="min-h-dvh bg-background text-foreground">

        <div className="max-w-5xl mx-auto px-6 py-12 lg:py-16">
          <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-16">
            {/* Sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-20">
                <p className="text-xs font-semibold uppercase tracking-widest  text-primary mb-4 px-2">
                  {t("contents")}
                </p>
                <LegalToc items={sections} />
              </div>
            </aside>

            {/* Content */}
            <main className="min-w-0">
              <div className="mb-8 pb-8 border-b border-border">
                <h1 className="text-3xl font-display font-semibold tracking-tight text-foreground">
                  {t("termsOfService")}
                </h1>
                <p className="mt-3 text-base text-muted-foreground leading-relaxed max-w-xl">
                  These Terms of Service govern your access to and use of Eryx.
                  By creating an account or using our platform, you agree to be
                  bound by these terms.
                </p>
                <p className="mt-4 text-xs text-muted-foreground/60">
                  Last updated April 23, 2026
                </p>
              </div>

              <details className="mb-8 p-4 rounded-lg border border-border bg-muted/30">
                <summary className="font-medium text-sm cursor-pointer select-none">
                  {t("quickSummary")}
                </summary>
                <div className="mt-3 text-sm text-muted-foreground space-y-2">
                  <p>
                    <strong className="text-foreground">Age requirement:</strong> You must be 18+ to use Eryx.
                  </p>
                  <p>
                    <strong className="text-foreground">Your data is yours:</strong> You retain ownership of your content. We only use it to provide the service.
                  </p>
                  <p>
                    <strong className="text-foreground">AI output is not guaranteed:</strong> AI responses may be inaccurate. Verify important information independently.
                  </p>
                  <p>
                    <strong className="text-foreground">Credits:</strong> Unused credits do not roll over. No refunds for unused credits after termination.
                  </p>
                  <p>
                    <strong className="text-foreground">No illegal use:</strong> Do not use Eryx for illegal, harmful, or fraudulent purposes.
                  </p>
                  <p>
                    <strong className="text-foreground">We can terminate accounts:</strong> Without notice, if terms are violated.
                  </p>
                  <p>
                    <strong className="text-foreground">Liability cap:</strong> Our maximum liability is your 12-month payment or $100, whichever is greater.
                  </p>
                  <p>
                    <strong className="text-foreground">Governing law:</strong> Nepal. Disputes handled individually, not as class actions.
                  </p>
                </div>
              </details>

              <div className="divide-y divide-border tracking-wide">
                <LegalSection id="acceptance" title="1. Acceptance of Terms">
                  <p>
                    By creating an account or using Eryx in any way, you acknowledge
                    that you have read, understood, and agree to be bound by these
                    Terms of Service and our Privacy Policy. If you do not agree to
                    these terms, do not use our services.
                  </p>
                  <p>
                    These terms constitute a legally binding agreement between you
                    (&quot;you&quot; or &quot;user&quot;) and Eryx (&quot;we,&quot; &quot;us,&quot;
                    or &quot;Eryx&quot;). Your continued use of the service following any
                    modifications constitutes your acceptance of the updated terms.
                  </p>
                  <p>
                    You represent that you are at least 18 years of age and have the
                    legal capacity to enter into these terms. If you are using the
                    service on behalf of an organization, you represent that you have
                    the authority to bind that organization to these terms.
                  </p>
                </LegalSection>

                <LegalSection id="description" title="2. Description of Service">
                  <p>
                    Eryx is an AI-powered conversational platform that provides
                    access to large language models and associated tools for
                    conversation, analysis, content generation, and related tasks.
                    The service includes web-based interfaces, APIs, and associated
                    functionality.
                  </p>
                  <p>
                    We reserve the right to modify, suspend, or discontinue any part
                    of the service at any time with or without prior notice. We will
                    not be liable to you or any third party for any modification,
                    suspension, or discontinuation of the service.
                  </p>
                  <p>
                    <strong className="text-foreground font-medium">Credit System:</strong> The service
                    operates on a credit-based system. Credits are consumed based on
                    your subscription plan and the AI models used. Unused credits do
                    not roll over at the end of each billing period unless your
                    subscription specifies otherwise.
                  </p>
                </LegalSection>

                <LegalSection id="accounts" title="3. Accounts & Registration">
                  <p>
                    To access certain features, you must register for an account.
                    You agree to provide accurate, current, and complete information
                    during registration and to keep your account information
                    up-to-date.
                  </p>
                  <p>
                    You are solely responsible for maintaining the confidentiality of
                    your account credentials and for all activity that occurs under
                    your account. You agree to notify us immediately of any
                    unauthorized access or security breach.
                  </p>
                  <p>
                    One account per person. You may not share accounts, create
                    multiple accounts for circumventing policies, or transfer account
                    access to others without our written consent.
                  </p>
                  <p>
                    We reserve the right to suspend or terminate accounts that
                    violate these terms or engage in fraudulent activity.
                  </p>
                </LegalSection>

                <LegalSection id="billing" title="4. Billing & Payments">
                  <p>
                    Subscription fees are billed in advance on a recurring basis
                    according to your selected plan. All fees are non-refundable
                    except as expressly stated in our refund policy.
                  </p>
                  <p>
                    <strong className="text-foreground font-medium">Credits:</strong> Purchased credits
                    expire according to your subscription terms. In the event of
                    service termination, no refund will be provided for unused
                    credits.
                  </p>
                  <p>
                    <strong className="text-foreground font-medium">Failed Payments:</strong> If a
                    payment fails, we will attempt to process it again. After 30 days
                    of failed payments, we reserve the right to suspend your account
                    until payment is received.
                  </p>
                  <p>
                    <strong className="text-foreground font-medium">Price Changes:</strong> We may change
                    subscription fees with 30 days&apos; prior notice before your next
                    billing cycle. Price changes take effect at the start of your next
                    billing period.
                  </p>
                  <p>
                    <strong className="text-foreground font-medium">Chargebacks:</strong> Initiating a
                    chargeback or payment reversal without our consent constitutes a
                    material breach of these terms and may result in account
                    termination and legal action.
                  </p>
                </LegalSection>

                <LegalSection id="acceptable-use" title="5. Acceptable Use Policy">
                  <p>You agree not to use Eryx for any of the following:</p>
                  <ul>
                    <li>
                      <strong className="text-foreground font-medium">Illegal activities:</strong> Any
                      unlawful, fraudulent, or malicious purpose
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Harmful content:</strong> Generating
                      content that is offensive, defamatory, harassing, or promotes
                      violence
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">CSAM:</strong> Creating,
                      distributing, or possessing child sexual abuse material
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Fraud:</strong> Impersonating any
                      person or entity, or misrepresenting your affiliation
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Security abuse:</strong> Attempting
                      to gain unauthorized access to any system, including the
                      service infrastructure
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Scraping:</strong> Using automated
                      tools to scrape or extract data without prior written permission
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">API abuse:</strong> Exceeding rate
                      limits, circumventing usage restrictions, or reselling access to
                      the service
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Harmful AI use:</strong> Using the
                      service to develop weapons, conduct surveillance, or any activity
                      that could cause harm to individuals
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Technical abuse:</strong> Reverse
                      engineering, decompiling, or disassembling any part of the
                      service
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Interference:</strong> Interfering
                      with or disrupting the integrity or performance of the service or
                      its underlying systems
                    </li>
                  </ul>
                  <p>
                    We actively monitor for prohibited use. Violations may result in
                    immediate account suspension and may be reported to law enforcement
                    authorities.
                  </p>
                </LegalSection>

                <LegalSection id="ai-outputs" title="6. AI-Generated Content">
                  <p>
                    <strong className="text-foreground font-medium">Nature of AI Output:</strong> Content
                    generated by Eryx (&quot;AI Output&quot;) is generated by artificial
                    intelligence systems and may contain inaccuracies, hallucinations, or
                    outdated information. You acknowledge that AI Output should not be
                    relied upon as authoritative or complete, particularly for
                    legal, medical, financial, or other high-stakes decisions.
                  </p>
                  <p>
                    <strong className="text-foreground font-medium">Your Responsibility:</strong> You are
                    solely responsible for reviewing and evaluating any AI Output before
                    use. Eryx does not guarantee the accuracy, completeness, or
                    reliability of AI Output. You should independently verify any
                    information before acting on it.
                  </p>
                  <p>
                    <strong className="text-foreground font-medium">Content Moderation:</strong> We do not
                    claim to filter all harmful content. While we implement safety
                    measures, we cannot guarantee that all Prohibited Content will be
                    blocked.
                  </p>
                  <p>
                    <strong className="text-foreground font-medium">Limitation for AI Services:</strong>
                    Because AI services depend on third-party providers (OpenAI,
                    Anthropic, xAI, and others), service availability and output
                    quality may vary. We are not liable for disputes arising from AI
                    Output accuracy.
                  </p>
                </LegalSection>

                <LegalSection id="ip" title="7. Intellectual Property">
                  <p>
                    <strong className="text-foreground font-medium">Our IP:</strong> Eryx and its
                    original content, features, and functionality are proprietary to
                    Eryx and are protected by intellectual property laws. You may
                    not copy, modify, or distribute our branding, logos, or proprietary
                    information without written consent.
                  </p>
                  <p>
                    <strong className="text-foreground font-medium">Your Content:</strong> You retain
                    ownership of content you create and submit to the service
                    (&quot;Your Content&quot;). By submitting Your Content, you grant us a
                    worldwide, non-exclusive, royalty-free license to use, store,
                    display, and process it solely for the purpose of providing the
                    service.
                  </p>
                  <p>
                    <strong className="text-foreground font-medium">AI Output:</strong> AI Output
                    generated through your use of the service may be subject to the
                    terms of third-party AI providers. You are responsible for
                    ensuring your use of AI Output complies with applicable terms.
                  </p>
                  <p>
                    <strong className="text-foreground font-medium">Feedback:</strong> If you provide
                    suggestions, ideas, or feedback about the service, we may use
                    them without obligation to you.
                  </p>
                </LegalSection>

                <LegalSection id="third-party" title="8. Third-Party Services">
                  <p>
                    Eryx relies on third-party AI providers including but not limited
                    to OpenAI, Anthropic, and xAI to deliver AI capabilities. Your
                    use of the service is subject to these providers&apos; terms of
                    service. We are not responsible for the availability, accuracy, or
                    output of third-party AI services.
                  </p>
                  <p>
                    The service may integrate with third-party services
                    (&quot;Third-Party Services&quot;) such as MCP servers, cloud storage
                    providers, and payment processors. Your use of Third-Party Services
                    is subject to their respective terms and privacy policies.
                  </p>
                  <p>
                    We do not endorse or warrant Third-Party Services and are not
                    liable for any damages arising from your use of them.
                  </p>
                </LegalSection>

                <LegalSection id="security" title="9. Security & Account Responsibility">
                  <p>
                    You are responsible for maintaining adequate security of your
                    account credentials. Use strong, unique passwords and enable
                    two-factor authentication where available.
                  </p>
                  <p>
                    You must promptly notify us of any security incident, unauthorized
                    access, or data breach affecting your account.
                  </p>
                  <p>
                    We implement reasonable technical measures to protect your data.
                    However, no security measure is impenetrable. We are not liable
                    for breaches that result from your actions or negligence.
                  </p>
                </LegalSection>

                <LegalSection id="termination" title="10. Termination">
                  <p>
                    <strong className="text-foreground font-medium">By You:</strong> You may terminate
                    your account at any time through your account settings or by
                    contacting support. Upon termination, your right to use the service
                    immediately ceases.
                  </p>
                  <p>
                    <strong className="text-foreground font-medium">By Us:</strong> We may suspend or
                    terminate your access to the service at our sole discretion,
                    without notice, if we believe you have violated these terms,
                    engaged in fraudulent activity, or acted in a manner harmful to
                    other users, us, or third parties.
                  </p>
                  <p>
                    <strong className="text-foreground font-medium">Effect of Termination:</strong> Upon
                    termination, your data will be retained for 30 days as required by
                    law, after which it will be deleted. You may export your data
                    before termination using our export tools.
                  </p>
                  <p>
                    <strong className="text-foreground font-medium">Survival:</strong> Sections 7
                    (Intellectual Property), 11 (Disclaimer), 12 (Limitation of
                    Liability), 13 (Indemnification), and 15 (Governing Law) survive
                    termination.
                  </p>
                </LegalSection>

                <LegalSection id="disclaimer" title="11. Disclaimer of Warranties">
                  <p>
                    THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS
                    AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR
                    IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE
                    UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF HARMFUL
                    COMPONENTS.
                  </p>
                  <p>
                    TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL
                    WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
                    IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
                    PURPOSE, AND NON-INFRINGEMENT.
                  </p>
                  <p>
                    WE DO NOT WARRANT OR GUARANTEE THE ACCURACY, COMPLETENESS, OR
                    RELIABILITY OF AI OUTPUT. YOU ACKNOWLEDGE THAT AI SYSTEMS MAY
                    PRODUCE INACCURATE OR HARMFUL CONTENT AND USE AI OUTPUT AT YOUR
                    OWN RISK.
                  </p>
                </LegalSection>

                <LegalSection id="liability" title="12. Limitation of Liability">
                  <p>
                    TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, WE SHALL NOT
                    BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
                    OR PUNITIVE DAMAGES — INCLUDING LOSS OF PROFITS, DATA, BUSINESS
                    OPPORTUNITIES, OR GOODWILL — ARISING FROM YOUR USE OF OR
                    INABILITY TO USE THE SERVICE.
                  </p>
                  <p>
                    OUR TOTAL LIABILITY TO YOU FOR ANY CLAIMS ARISING FROM THESE
                    TERMS OR YOUR USE OF THE SERVICE SHALL NOT EXCEED THE GREATER
                    OF: (A) THE AMOUNT YOU PAID US IN THE TWELVE MONTHS PRECEDING THE
                    CLAIM; OR (B) ONE HUNDRED US DOLLARS ($100).
                  </p>
                  <p>
                    THE ABOVE LIMITATIONS APPLY REGARDLESS OF THE THEORY OF
                    LIABILITY (CONTRACT, TORT, OR OTHERWISE) AND EVEN IF WE WERE
                    ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
                  </p>
                  <p>
                    CERTAIN JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION
                    OF LIABILITY FOR CONSEQUENTIAL OR INCIDENTAL DAMAGES, SO THE
                    ABOVE LIMITATION MAY NOT APPLY TO YOU.
                  </p>
                </LegalSection>

                <LegalSection id="indemnification" title="13. Indemnification">
                  <p>
                    You agree to indemnify, defend, and hold harmless Eryx and its
                    officers, directors, employees, contractors, and agents from and
                    against any claims, damages, losses, and expenses (including
                    reasonable legal fees) arising from:
                  </p>
                  <ul>
                    <li>Your violation of these Terms</li>
                    <li>Your misuse of the service</li>
                    <li>Your violation of any third-party rights</li>
                    <li>
                      Claims that Your Content infringes or misappropriates any
                      third-party intellectual property right
                    </li>
                  </ul>
                  <p>
                    We reserve the right to assume exclusive defense and control of any
                    matter subject to indemnification by you, at your expense. You
                    agree to cooperate with us in defending such claims.
                  </p>
                </LegalSection>

                <LegalSection id=" Modifications" title="14. Modifications to Service">
                  <p>
                    We may modify the service, add or remove features, and change
                    pricing at any time. Material changes will be communicated via
                    email or prominent notice in the service.
                  </p>
                  <p>
                    We may also establish or modify usage limits, rate limits, and
                    credit consumption rates. These changes will be communicated
                    with reasonable notice where practicable.
                  </p>
                  <p>
                    Your continued use of the service after any changes constitutes
                    your acceptance of the modified terms and pricing.
                  </p>
                </LegalSection>

                <LegalSection id="governing" title="15. Governing Law & Dispute Resolution">
                  <p>
                    These Terms are governed by and construed in accordance with the
                    laws of Nepal, without regard to its conflict of law principles.
                    If you are located outside Nepal, you are responsible for
                    compliance with your local laws.
                  </p>
                  <p>
                    <strong className="text-foreground font-medium">Disputes:</strong> Any dispute
                    arising from these terms or your use of the service shall first
                    be attempted to be resolved through good-faith negotiations.
                    If the dispute cannot be resolved within 30 days, either party
                    may pursue legal remedies.
                  </p>
                  <p>
                    <strong className="text-foreground font-medium">Small Claims:</strong> Notwithstanding
                    the above, you may bring claims in small claims court if your
                    jurisdiction allows it.
                  </p>
                  <p>
                    <strong className="text-foreground font-medium">Class Action Waiver:</strong> YOU
                    AGREE THAT ANY DISPUTE RESOLUTION WILL BE CONDUCTED ONLY ON AN
                    INDIVIDUAL BASIS AND NOT IN A CLASS, CONSOLIDATED, OR
                    REPRESENTATIVE ACTION, WHERE SUCH JURISDICTION PERMITS.
                  </p>
                  <p>
                    Notwithstanding the above, either party may seek injunctive relief
                    in any court of competent jurisdiction to protect its
                    intellectual property rights.
                  </p>
                </LegalSection>

                <LegalSection id="changes" title="16. Changes to Terms">
                  <p>
                    We may update these terms from time to time. When we make material
                    changes, we will update the date at the top of this page and, where
                    appropriate, notify you by email or through the service.
                  </p>
                  <p>
                    Material changes include modifications to payment terms, liability
                    limitations, acceptable use policies, and intellectual property
                    rights.
                  </p>
                  <p>
                    Your continued use of the service after any changes constitutes your
                    acceptance of the new terms. If you do not agree to the updated
                    terms, you must stop using the service and delete your account.
                  </p>
                </LegalSection>

                <LegalSection id="contact" title="17. Contact">
                  <p>
                    If you have any questions about these Terms of Service, please
                    contact us at{" "}
                    <a
                      href="mailto:legal@eryx.ai"
                      className="text-foreground underline underline-offset-4 hover:text-muted-foreground  "
                    >
                      legal@eryx.ai
                    </a>
                    .
                  </p>
                  <p>
                    For support inquiries:{" "}
                    <a
                      href="mailto:support@eryx.ai"
                      className="text-foreground underline underline-offset-4 hover:text-muted-foreground  "
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
