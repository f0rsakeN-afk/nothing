"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentResultDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentResultDialog({ isOpen, onOpenChange }: PaymentResultDialogProps) {
  const searchParams = useSearchParams();
  const [status, setStatus] = React.useState<"loading" | "success" | "failed" | "error">("loading");

  React.useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success") {
      setStatus("success");
    } else if (paymentStatus === "failed") {
      setStatus("failed");
    } else if (paymentStatus === "error") {
      setStatus("error");
    }
  }, [searchParams]);

  // Don't show dialog if no payment param
  React.useEffect(() => {
    if (!isOpen) {
      // Clear URL params when dialog closes
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      window.history.replaceState({}, "", url.toString());
    }
  }, [isOpen]);

  if (status === "loading") {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Processing payment...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center justify-center py-6">
          {status === "success" && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500" />
              <h2 className="mt-4 text-xl font-semibold">Payment Successful!</h2>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Your payment has been processed successfully. Your plan has been activated.
              </p>
            </>
          )}
          {status === "failed" && (
            <>
              <XCircle className="h-16 w-16 text-red-500" />
              <h2 className="mt-4 text-xl font-semibold">Payment Failed</h2>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Your payment could not be processed. Please try again or contact support.
              </p>
            </>
          )}
          {status === "error" && (
            <>
              <AlertCircle className="h-16 w-16 text-yellow-500" />
              <h2 className="mt-4 text-xl font-semibold">Payment Error</h2>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                An error occurred while processing your payment. Please contact support if this persists.
              </p>
            </>
          )}

          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {status !== "success" && (
              <Button onClick={() => window.location.href = "/"}>
                Try Again
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
