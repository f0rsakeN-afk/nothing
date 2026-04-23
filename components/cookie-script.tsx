/**
 * CookieScript - Loads scripts only when specific cookie consent is given
 * Usage: <CookieScript category="analytics" src="https://..." strategy="afterInteractive" />
 */

"use client";

import { useEffect, type ScriptHTMLAttributes } from "react";
import { type CookieCategory } from "@/hooks/use-cookie-consent";
import { useCookieCategory } from "@/hooks/use-cookie-consent";

interface CookieScriptProps extends ScriptHTMLAttributes<HTMLScriptElement> {
  category: CookieCategory;
  strategy?: "beforeInteractive" | "afterInteractive" | "lazyOnload" | "worker";
}

export function CookieScript({
  category,
  strategy = "afterInteractive",
  ...props
}: CookieScriptProps) {
  const isAllowed = useCookieCategory(category);

  useEffect(() => {
    if (!isAllowed) return;

    // Dynamic script loading based on strategy
    const loadScript = () => {
      const script = document.createElement("script");
      script.async = true;
      script.src = props.src || "";
      script.crossOrigin = props.crossOrigin || "anonymous";

      // Copy other props
      Object.entries(props).forEach(([key, value]) => {
        if (key !== "src" && key !== "strategy" && key !== "category") {
          script.setAttribute(key, String(value));
        }
      });

      document.body.appendChild(script);
    };

    switch (strategy) {
      case "beforeInteractive":
        loadScript();
        break;
      case "afterInteractive":
        if (document.readyState === "complete") {
          loadScript();
        } else {
          window.addEventListener("load", loadScript);
        }
        break;
      case "lazyOnload":
        window.addEventListener("load", loadScript);
        break;
      case "worker":
        // For web workers
        break;
    }

    return () => {
      window.removeEventListener("load", loadScript);
    };
  }, [isAllowed, strategy, props]);

  return null;
}
