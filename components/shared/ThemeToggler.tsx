// "use client";

// import { Sun, Moon } from "lucide-react";
// import { m, AnimatePresence } from "motion/react";
// import { useTheme } from "next-themes";
// import { useEffect, useState } from "react";
// import { Button } from "../ui/button";

// export function ThemeToggle() {
//   const { theme, setTheme } = useTheme();
//   const [mounted, setMounted] = useState(false);

//   useEffect(() => {
//     const frame = requestAnimationFrame(() => setMounted(true));
//     return () => cancelAnimationFrame(frame);
//   }, []);

//   if (!mounted) return <div className="w-10 h-10" />;

//   const handleToggle = () => {
//     setTheme(theme === "light" ? "dark" : "light");
//   };

//   const getThemeIcon = (t: string | undefined) => {
//     return t === "light" ? (
//       <Sun className="w-5 h-5 text-foreground" />
//     ) : (
//       <Moon className="w-5 h-5 text-foreground" />
//     );
//   };

//   return (
//     <Button
//       variant={"ghost"}
//       onClick={handleToggle}
//       className="relative w-10 h-10 rounded-full p-2 flex items-center justify-center transition"
//       title={`Theme: ${theme}`}
//     >
//       <AnimatePresence mode="popLayout">
//         <m.span
//           key={theme}
//           initial={{ opacity: 0, scale: 0.6 }}
//           animate={{ opacity: 1, scale: 1 }}
//           exit={{ opacity: 0, scale: 0.6 }}
//           transition={{ duration: 0.12 }}
//           className="absolute inset-0 flex items-center justify-center"
//         >
//           {getThemeIcon(theme)}
//         </m.span>
//       </AnimatePresence>
//     </Button>
//   );
// }