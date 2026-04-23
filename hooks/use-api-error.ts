"use client";

import { useCallback } from "react";
import { toast } from "@/components/ui/sileo-toast";

export interface ApiError {
  code?: string;
  message?: string;
  status?: number;
}

interface UseApiErrorOptions {
  /** Show toast on error */
  showToast?: boolean;
  /** Toast title prefix */
  title?: string;
  /** Custom error messages by code */
  messages?: Record<string, string>;
}

const DEFAULT_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Please sign in to continue",
  NOT_FOUND: "Resource not found",
  RATE_LIMITED: "Too many requests. Please wait a moment.",
  CREDIT_ERROR: "Insufficient credits",
  PROJECT_LIMIT_REACHED: "Project limit reached",
  INTERNAL_ERROR: "Something went wrong. Please try again.",
};

export function useApiError(options: UseApiErrorOptions = {}) {
  const {
    showToast = true,
    title = "Error",
    messages = {},
  } = options;

  const errorMessages = { ...DEFAULT_MESSAGES, ...messages };

  const handleError = useCallback(
    (error: unknown, customMessage?: string) => {
      // Log for debugging
      console.error("[API Error]", error);

      if (!showToast) return;

      // Extract error info
      const apiError = error as ApiError;
      const errorCode = apiError.code;
      const errorMessage = apiError.message || customMessage;

      // Get user-friendly message
      const userMessage = errorCode
        ? errorMessages[errorCode] || errorMessage || errorMessages.INTERNAL_ERROR
        : errorMessage || errorMessages.INTERNAL_ERROR;

      // Show toast with action hint for retryable errors
      const isRetryable = errorCode !== "UNAUTHORIZED" && errorCode !== "NOT_FOUND";

      toast.error(title, {
        description: userMessage,
        action: isRetryable
          ? {
              label: "Retry",
              onClick: () => {
                // Retry will be handled by caller
              },
            }
          : undefined,
      });
    },
    [showToast, title, errorMessages],
  );

  const parseError = useCallback((error: unknown): ApiError => {
    if (typeof error === "object" && error !== null) {
      const err = error as Record<string, unknown>;
      return {
        code: err.code as string | undefined,
        message: err.message as string | undefined,
        status: err.status as number | undefined,
      };
    }
    return { message: String(error) };
  }, []);

  return {
    handleError,
    parseError,
    errorMessages,
  };
}

/**
 * Check if error is a network/connectivity error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return error.message.includes("fetch") || error.message.includes("network");
  }
  if ((error as { cause?: unknown }).cause) {
    return isNetworkError((error as { cause: unknown }).cause);
  }
  return false;
}

/**
 * Check if error is an auth error
 */
export function isAuthError(error: unknown): boolean {
  const apiError = error as ApiError;
  return (
    apiError.code === "UNAUTHORIZED" ||
    apiError.status === 401 ||
    (apiError.message?.toLowerCase().includes("unauthorized") ?? false)
  );
}
