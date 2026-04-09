"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function InitUser() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/init-user").then((res) => {
      if (res.ok) {
        // Signal server that client-side init worked
        sessionStorage.setItem("user_initialized", "1");
      }
    });
  }, [router]);

  return null;
}
