"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="max-w-md w-full text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-destructive/10">
                <AlertTriangle className="h-10 w-10 text-destructive" />
              </div>
            </div>

            <h1 className="text-2xl font-semibold text-foreground mb-2">
              Something went wrong
            </h1>

            <p className="text-sm text-muted-foreground mb-6">
              We encountered an unexpected error. Your progress has been saved.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
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
                  <Home className="h-4 w-4" />
                  Go home
                </Button>
              </Link>
            </div>

            {error.digest && (
              <p className="mt-6 text-xs text-muted-foreground font-mono">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
