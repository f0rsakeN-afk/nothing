"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AppError]", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-full bg-destructive/10">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
        </div>

        <h2 className="text-xl font-semibold text-foreground mb-2">
          Something went wrong
        </h2>

        <p className="text-sm text-muted-foreground mb-6">
          {error.message || "An unexpected error occurred"}
        </p>

        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => reset()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>

          <Link href="/home">
            <Button variant="default" className="gap-2">
              Go home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
