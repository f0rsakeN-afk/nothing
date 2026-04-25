"use client";

import { LegalSection } from "@/components/plain/legal/legal-section";
import { LegalToc } from "@/components/plain/legal/legal-toc";
import { useTranslations } from "next-intl";

function CookiesJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Cookie Policy — Eryx",
    description:
      "Cookie Policy for Eryx AI platform. Learn about the cookies we use and how to manage your cookie preferences.",
    url: "/legal/cookies",
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://eryx.ai" },
        {
          "@type": "ListItem",
          position: 2,
          name: "Legal",
          item: "https://eryx.ai/legal/cookies",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Cookie Policy",
          item: "https://eryx.ai/legal/cookies",
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
  { id: "what-are", title: "2. What Are Cookies" },
  { id: "how-we-use", title: "3. How We Use Cookies" },
  { id: "categories", title: "4. Cookie Categories" },
  { id: "third-party", title: "5. Third-Party Cookies" },
  { id: "managing", title: "6. Managing Cookies" },
  { id: "changes", title: "7. Changes to This Policy" },
  { id: "contact", title: "8. Contact" },
];

export default function CookiesPage() {
  const t = useTranslations("legal");

  return (
    <>
      <CookiesJsonLd />
      <div className="min-h-dvh bg-background text-foreground">

        <div className="max-w-5xl mx-auto px-6 py-12 lg:py-16">
          <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-16">
            {/* Sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-20">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4 px-2">
                  {t("contents")}
                </p>
                <LegalToc items={sections} />
              </div>
            </aside>

            {/* Content */}
            <main className="min-w-0">
              <div className="mb-8 pb-8 border-b border-border">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  {t("cookiePolicy")}
                </h1>
                <p className="mt-3 text-base text-muted-foreground leading-relaxed max-w-xl">
                  This Cookie Policy explains what cookies are, how Eryx uses
                  them, and your choices regarding cookies.
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
                    <strong className="text-foreground">Essential cookies:</strong> Required for the service to function. Cannot be disabled.
                  </p>
                  <p>
                    <strong className="text-foreground">Analytics cookies:</strong> Help us improve the service. Optional.
                  </p>
                  <p>
                    <strong className="text-foreground">No marketing cookies:</strong> We do not use tracking for advertising.
                  </p>
                  <p>
                    <strong className="text-foreground">Your choices:</strong> You can reject non-essential cookies through our consent banner or browser settings.
                  </p>
                </div>
              </details>

              <div className="divide-y divide-border tracking-wide">
                <LegalSection id="overview" title="1. Overview">
                  <p>
                    Eryx uses cookies and similar tracking technologies to
                    operate our service, personalize your experience, and
                    understand how you interact with our platform.
                  </p>
                  <p>
                    This Cookie Policy explains what cookies are, what types of
                    cookies we use, why we use them, and your rights to control
                    them.
                  </p>
                  <p>
                    For more information about how we handle your data generally,
                    see our{" "}
                    <a
                      href="/legal/policy"
                      className="text-foreground underline underline-offset-4 hover:text-muted-foreground"
                    >
                      Privacy Policy
                    </a>
                    .
                  </p>
                </LegalSection>

                <LegalSection id="what-are" title="2. What Are Cookies">
                  <p>
                    Cookies are small text files stored on your device (computer,
                    tablet, or mobile) when you visit a website. They are widely
                    used to make websites work more efficiently, provide a better
                    user experience, and give website owners useful information.
                  </p>
                  <p>
                    <strong className="text-foreground font-medium">Similar technologies:</strong> In addition to cookies, we may use
                    similar technologies such as local storage, session storage,
                    and pixel tags for the same purposes.
                  </p>
                </LegalSection>

                <LegalSection id="how-we-use" title="3. How We Use Cookies">
                  <p>We use cookies for the following purposes:</p>
                  <ul>
                    <li>
                      <strong className="text-foreground font-medium">Authentication:</strong> To
                      identify you when you log in and keep you signed in
                      across sessions
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Security:</strong> To detect
                      and prevent security threats and unauthorized access
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Functionality:</strong> To
                      remember your preferences, settings, and display
                      customizations
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Analytics:</strong> To
                      understand how visitors interact with our service and
                      identify areas for improvement
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Performance:</strong> To
                      monitor and analyze service performance and reliability
                    </li>
                  </ul>
                </LegalSection>

                <LegalSection id="categories" title="4. Cookie Categories">
                  <p>
                    Our cookies fall into the following categories:
                  </p>
                  <ul>
                    <li>
                      <strong className="text-foreground font-medium">Essential Cookies</strong>
                      <p>
                        These cookies are strictly necessary for the service to
                        function. They enable core functionality such as security,
                        authentication, session management, and accessibility.
                      </p>
                      <p>
                        <strong className="text-foreground">Cannot be disabled.</strong> Disabling
                        these cookies will cause the service to malfunction or
                        become inaccessible.
                      </p>
                      <p>Examples: Session cookies, CSRF tokens, authentication tokens</p>
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Analytics Cookies</strong>
                      <p>
                        These cookies help us understand how visitors interact
                        with our service by collecting and reporting information
                        anonymously.
                      </p>
                      <p>
                        <strong className="text-foreground">Optional.</strong> You can consent
                        to or reject these in our cookie consent banner.
                      </p>
                      <p>Examples: Google Analytics, error tracking, usage metrics</p>
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Preference Cookies</strong>
                      <p>
                        These cookies remember your choices and settings, such as
                        your language preference, theme selection, and UI
                        customization choices.
                      </p>
                      <p>
                        <strong className="text-foreground">Optional.</strong> These enhance
                        your experience but are not critical to service
                        functionality.
                      </p>
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Marketing Cookies</strong>
                      <p>
                        <strong className="text-foreground">We do not use marketing cookies.</strong> We
                        do not track you across websites for advertising purposes
                        or deliver personalized advertisements.
                      </p>
                    </li>
                  </ul>
                </LegalSection>

                <LegalSection id="third-party" title="5. Third-Party Cookies">
                  <p>
                    Some cookies are set by third-party services that we use:
                  </p>
                  <ul>
                    <li>
                      <strong className="text-foreground font-medium">AI Providers:</strong> Our
                      AI service providers (OpenAI, Anthropic, xAI) may set
                      cookies as part of their services. Their cookie practices
                      are governed by their own policies.
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Analytics:</strong> We may use
                      analytics services that set their own cookies to help us
                      understand usage patterns.
                    </li>
                    <li>
                      <strong className="text-foreground font-medium">Payment Providers:</strong>
                      Our payment processor may set cookies when you complete a
                      transaction. Their practices are governed by their own
                      policies.
                    </li>
                  </ul>
                  <p>
                    Third-party cookies are governed by the respective third
                    parties&apos; privacy and cookie policies. We encourage you
                    to review those policies.
                  </p>
                </LegalSection>

                <LegalSection id="managing" title="6. Managing Cookies">
                  <p>
                    <strong className="text-foreground font-medium">Consent Banner:</strong> When you
                    first visit Eryx, you will see a cookie consent banner where
                    you can accept or reject non-essential cookies.
                  </p>
                  <p>
                    <strong className="text-foreground font-medium">Browser Settings:</strong> You
                    can also control or disable cookies through your browser
                    settings. Most browsers allow you to:
                  </p>
                  <ul>
                    <li>View what cookies are stored on your device</li>
                    <li>Delete all or specific cookies</li>
                    <li>Block cookies from all or certain websites</li>
                    <li>Block third-party cookies</li>
                    <li>Clear all cookies when you close the browser</li>
                  </ul>
                  <p>
                    <strong className="text-foreground font-medium">Impact of Disabling:</strong> If
                    you disable essential cookies, the service will not function
                    properly. Disabling analytics cookies will not affect your
                    user experience but may limit our ability to improve the
                    service.
                  </p>
                  <p>
                    <strong className="text-foreground font-medium">Updating Preferences:</strong> You
                    can update your cookie preferences at any time by:
                  </p>
                  <ul>
                    <li>Clicking the cookie consent link in our footer</li>
                    <li>
                      Contacting us at{" "}
                      <a
                        href="mailto:privacy@eryx.ai"
                        className="text-foreground underline underline-offset-4 hover:text-muted-foreground"
                      >
                        privacy@eryx.ai
                      </a>
                    </li>
                  </ul>
                </LegalSection>

                <LegalSection id="changes" title="7. Changes to This Policy">
                  <p>
                    We may update this Cookie Policy from time to time. When we
                    make material changes, we will update the date at the top of
                    this page and notify you through the service.
                  </p>
                  <p>
                    Your continued use of the service after any changes constitutes
                    acceptance of the updated policy.
                  </p>
                </LegalSection>

                <LegalSection id="contact" title="8. Contact">
                  <p>
                    If you have any questions about our use of cookies, please
                    contact us at{" "}
                    <a
                      href="mailto:privacy@eryx.ai"
                      className="text-foreground underline underline-offset-4 hover:text-muted-foreground"
                    >
                      privacy@eryx.ai
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
