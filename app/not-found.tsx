"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("errors");

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col items-center justify-center px-6">
      <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground mb-5">
        Error 404
      </p>

      <h1 className="text-4xl md:text-[3.25rem] font-semibold tracking-tight text-foreground mb-6 leading-[1.1] text-center">
        {t("notFound")}
      </h1>

      <p className="text-base text-muted-foreground max-w-md text-center leading-relaxed font-medium mb-10">
        {t("notFoundDesc")}
      </p>

      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          {t("backToHome")}
        </Link>
        <Link
          href="/contact"
          className="text-sm font-medium text-muted-foreground hover:text-foreground  "
        >
          {t("contactSupport")}
        </Link>
      </div>
    </div>
  );
}
