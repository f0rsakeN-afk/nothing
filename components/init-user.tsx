"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/sileo-toast";

export function InitUser() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/init-user")
      .then((res) => {
        if (res.ok) {
          sessionStorage.setItem("user_initialized", "1");
        } else {
          console.error("[InitUser] Failed to initialize user");
          // Don't show toast - this is silent init, user can retry by refreshing
        }
      })
      .catch((err) => {
        console.error("[InitUser] Network error:", err);
        // Silent failure - don't disrupt UX
      });
  }, [router]);

  return null;
}
