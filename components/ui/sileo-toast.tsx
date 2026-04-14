"use client"

import { Toaster as SileoToaster, sileo } from "sileo"
import "sileo/styles.css"

// Sonner-compatible toast API
type ToastType = "success" | "error" | "info" | "loading" | "default";

interface ToastOptions {
  type?: ToastType;
  title?: string;
  message?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Create a toast function that mimics Sonner's API
function toast(message: string, options?: { description?: string; duration?: number; action?: ToastOptions["action"] }): string;
function toast(options: ToastOptions): string;
function toast(messageOrOptions: string | ToastOptions, maybeOptions?: { description?: string; duration?: number; action?: ToastOptions["action"] }): string {
  if (typeof messageOrOptions === "string") {
    // Direct call like toast("message", { description: "..." })
    return sileo.show({
      title: messageOrOptions,
      description: maybeOptions?.description,
      ...(maybeOptions?.action && {
        button: {
          title: maybeOptions.action.label,
          onClick: maybeOptions.action.onClick,
        },
      }),
    });
  } else {
    // Object call like toast({ type: "success", message: "..." })
    const type = messageOrOptions.type ?? "default";
    const title = messageOrOptions.title || messageOrOptions.message || "";

    return sileo.show({
      title,
      description: messageOrOptions.description,
      type: type === "default" ? undefined : type,
      ...(messageOrOptions.action && {
        button: {
          title: messageOrOptions.action.label,
          onClick: messageOrOptions.action.onClick,
        },
      }),
    });
  }
}

toast.success = (message: string, options?: { description?: string; duration?: number }) =>
  sileo.success({ title: message, description: options?.description });

toast.error = (message: string, options?: { description?: string; duration?: number; action?: ToastOptions["action"] }) =>
  sileo.error({
    title: message,
    description: options?.description,
    ...(options?.action && {
      button: {
        title: options.action.label,
        onClick: options.action.onClick,
      },
    }),
  });

toast.info = (message: string, options?: { description?: string; duration?: number }) =>
  sileo.info({ title: message, description: options?.description });

toast.loading = (message: string, options?: { description?: string; duration?: number }) =>
  sileo.show({ title: message, description: options?.description, type: "loading" });

toast.dismiss = (id: string) => sileo.dismiss(id);

function ToasterComponent({
  position = "top-center",
}: {
  position?: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right"
}) {
  return (
    <SileoToaster
      position={position}
      offset={12}
      options={{
        fill: "var(--foreground)",
        duration: 2500,
      }}
    />
  )
}

export { ToasterComponent as Toaster, toast }
