import { motion } from "motion/react";

const stairEase = [0.455, 0.03, 0.515, 0.955] as const;

export default function PreloaderOverlay() {
  return (
    <motion.div className="fixed inset-0 z-200">
      {/* Top stair columns — always dark, collapse upward on exit */}
      <motion.div className="pointer-events-none fixed left-0 top-0 z-2 flex h-[50dvh]">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ height: "100%" }}
            animate={{ height: "100%" }}
            exit={{ height: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.4 + 0.05 * i,
              ease: stairEase,
            }}
            className="h-full w-[10vw]"
            style={{ backgroundColor: "var(--foreground)" }}
          />
        ))}
      </motion.div>

      {/* Bottom stair columns — always dark, collapse downward on exit */}
      <motion.div className="pointer-events-none fixed bottom-0 left-0 z-2 flex h-[50dvh] items-end">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ height: "100%" }}
            animate={{ height: "100%" }}
            exit={{ height: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.4 + 0.05 * i,
              ease: stairEase,
            }}
            className="h-full w-[10vw]"
            style={{ backgroundColor: "var(--foreground)" }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
