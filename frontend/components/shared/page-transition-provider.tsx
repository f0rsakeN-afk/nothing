"use client";

import { AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import PreloaderOverlay from "./overlay";

/**
 * Mounts the overlay on every render (i.e. every route change because the
 * parent keys this component by pathname), then immediately schedules its
 * removal so AnimatePresence can play the stair-collapse exit animation.
 */
function OverlayController() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(false);
  }, []);

  return (
    <AnimatePresence>
      {visible && <PreloaderOverlay />}
    </AnimatePresence>
  );
}

/**
 * Drop this once inside <ThemeProvider> in the root layout.
 * It mounts <OverlayController> once on the initial page load,
 * triggering the cover → stair-collapse sequence only when the app first loads.
 * Children (your pages) are passed through as-is and remain SSR'd.
 */
export function PageTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <OverlayController />
      {children}
    </>
  );
}
