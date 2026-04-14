"use client";

/**
 * i18n Provider
 *
 * Wraps the application with NextIntlClientProvider
 * Provides locale context to all child components
 *
 * Usage:
 * ```tsx
 * // app/layout.tsx
 * import { I18nProvider } from "@/components/providers/i18n-provider";
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <I18nProvider locale="en">
 *           {children}
 *         </I18nProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */

import { NextIntlClientProvider } from "next-intl";
import { ReactNode } from "react";

interface I18nProviderProps {
  children: ReactNode;
  locale: string;
  messages?: Record<string, unknown>;
  timeZone?: string;
  now?: Date;
}

export function I18nProvider({
  children,
  locale,
  messages,
  timeZone = "UTC",
  now,
}: I18nProviderProps) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone={timeZone}
      now={now}
    >
      {children}
    </NextIntlClientProvider>
  );
}
