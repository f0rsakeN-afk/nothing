"use client";

import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className={cn(
            "flex flex-col items-center justify-center p-6 rounded-lg",
            "bg-destructive/10 border border-destructive/20",
            "text-center",
            this.props.className
          )}
        >
          <AlertTriangle className="h-8 w-8 text-destructive mb-3" />
          <h3 className="text-sm font-medium text-foreground mb-1">
            Something went wrong
          </h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-xs">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleRetry}
            className="gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specific error boundary for chat components
interface ChatErrorBoundaryProps {
  children: ReactNode;
  className?: string;
}

export function ChatErrorBoundary({ children, className }: ChatErrorBoundaryProps) {
  return (
    <ErrorBoundary
      className={cn("min-h-[200px]", className)}
      onRetry={() => {
        // Force a re-render by reloading the component
        window.location.reload();
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
