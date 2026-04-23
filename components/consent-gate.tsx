/**
 * ConsentGate - Conditionally renders children based on cookie consent
 * Usage: <ConsentGate category="marketing">{<TrackingPixel />}</ConsentGate>
 */

"use client";

import { type CookieCategory } from "@/hooks/use-cookie-consent";
import { useCookieCategory } from "@/hooks/use-cookie-consent";

interface ConsentGateProps {
  category: CookieCategory;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ConsentGate({ category, children, fallback = null }: ConsentGateProps) {
  const isAllowed = useCookieCategory(category);
  return <>{isAllowed ? children : fallback}</>;
}
