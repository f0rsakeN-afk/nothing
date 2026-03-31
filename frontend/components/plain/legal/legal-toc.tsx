"use client";

import { useCallback, useEffect, useState } from "react";

type TocItem = { id: string; title: string };

export function LegalToc({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>("");

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        setActiveId(entry.target.id);
      }
    }
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      rootMargin: "-20% 0% -70% 0%",
      threshold: 0,
    });

    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items, handleObserver]);

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={`text-sm py-1 px-2 rounded-md   ${
            activeId === item.id
              ? "text-foreground bg-muted"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {item.title}
        </a>
      ))}
    </nav>
  );
}
