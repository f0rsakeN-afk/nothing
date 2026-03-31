"use client";

import { useCallback, useState } from "react";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Status = "idle" | "loading" | "success" | "error";

interface FormData {
  name: string;
  email: string;
  topic: string;
  message: string;
}

interface FormErrors {
  name: string;
  email: string;
  topic: string;
  message: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_FORM: FormData = { name: "", email: "", topic: "", message: "" };
const INITIAL_ERRORS: FormErrors = {
  name: "",
  email: "",
  topic: "",
  message: "",
};
const MESSAGE_MAX = 2000;

const TOPICS = [
  { value: "general", label: "General Inquiry" },
  { value: "support", label: "Technical Support" },
  { value: "sales", label: "Sales" },
  { value: "partnership", label: "Partnership" },
  { value: "billing", label: "Billing" },
  { value: "other", label: "Other" },
] as const;

// ─── Validation ───────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form: FormData): FormErrors {
  const e: FormErrors = { name: "", email: "", topic: "", message: "" };
  if (!form.name.trim() || form.name.trim().length < 2)
    e.name = "Name must be at least 2 characters.";
  if (!form.email.trim() || !EMAIL_RE.test(form.email))
    e.email = "Enter a valid email address.";
  if (!form.topic) e.topic = "Please select a topic.";
  if (!form.message.trim() || form.message.trim().length < 20)
    e.message = "Message must be at least 20 characters.";
  return e;
}

function hasErrors(errors: FormErrors): boolean {
  return Object.values(errors).some(Boolean);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs text-destructive mt-1.5">
      <AlertCircle className="w-3 h-3 shrink-0" />
      {message}
    </p>
  );
}

function RequiredMark() {
  return <span className="text-destructive ml-0.5">*</span>;
}

// ─── Success state ────────────────────────────────────────────────────────────

function SuccessView({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 gap-4">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
        <CheckCircle className="w-6 h-6 text-foreground" />
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">Message sent</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Thanks for reaching out. We&apos;ll get back to you within 24 hours.
        </p>
      </div>
      <button
        onClick={onReset}
        className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground   mt-2"
      >
        Send another message
      </button>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function ContactForm() {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>(INITIAL_ERRORS);
  const [status, setStatus] = useState<Status>("idle");
  const [globalError, setGlobalError] = useState("");

  const handleChange = useCallback(
    (field: keyof Pick<FormData, "name" | "email" | "message">) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = e.target.value;
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: "" }));
      },
    [],
  );

  const handleTopicChange = useCallback((value: string | null) => {
    setForm((prev) => ({ ...prev, topic: value || "" }));
    setErrors((prev) => ({ ...prev, topic: "" }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const errs = validate(form);
      if (hasErrors(errs)) {
        setErrors(errs);
        return;
      }
      setStatus("loading");
      setGlobalError("");
      try {
        // Replace with real API call when backend is ready:
        // await fetch("/api/contact", { method: "POST", body: JSON.stringify(form) });
        await new Promise((res) => setTimeout(res, 1200));
        setStatus("success");
      } catch {
        setStatus("error");
        setGlobalError(
          "Something went wrong. Please try again or email us directly.",
        );
      }
    },
    [form],
  );

  const handleReset = useCallback(() => {
    setForm(INITIAL_FORM);
    setErrors(INITIAL_ERRORS);
    setStatus("idle");
    setGlobalError("");
  }, []);

  const isLoading = status === "loading";
  const charsLeft = MESSAGE_MAX - form.message.length;
  const charsNearMax = charsLeft <= 200;

  if (status === "success") return <SuccessView onReset={handleReset} />;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {/* Name + Email row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">
            Name <RequiredMark />
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Alex Johnson"
            value={form.name}
            onChange={handleChange("name")}
            disabled={isLoading}
            aria-invalid={!!errors.name}
            autoComplete="name"
          />
          <FieldError message={errors.name} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">
            Email <RequiredMark />
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="alex@example.com"
            value={form.email}
            onChange={handleChange("email")}
            disabled={isLoading}
            aria-invalid={!!errors.email}
            autoComplete="email"
          />
          <FieldError message={errors.email} />
        </div>
      </div>

      {/* Topic */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="topic">
          Topic <RequiredMark />
        </Label>
        <Select
          value={form.topic}
          onValueChange={handleTopicChange}
          disabled={isLoading}
        >
          <SelectTrigger
            id="topic"
            className="w-full"
            aria-invalid={!!errors.topic}
          >
            <SelectValue placeholder="Select a topic…" />
          </SelectTrigger>
          <SelectContent>
            {TOPICS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={errors.topic} />
      </div>

      {/* Message */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="message">
            Message <RequiredMark />
          </Label>
          <span
            className={`text-xs tabular-nums   ${
              charsNearMax ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {charsLeft.toLocaleString()} / {MESSAGE_MAX.toLocaleString()}
          </span>
        </div>
        <Textarea
          id="message"
          placeholder="Tell us what's on your mind…"
          value={form.message}
          onChange={handleChange("message")}
          disabled={isLoading}
          aria-invalid={!!errors.message}
          maxLength={MESSAGE_MAX}
          className="min-h-36 resize-none"
        />
        <FieldError message={errors.message} />
      </div>

      {/* Global error */}
      {status === "error" && globalError && (
        <p className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {globalError}
        </p>
      )}

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full sm:w-auto sm:self-end"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Sending…
          </>
        ) : (
          "Send message"
        )}
      </Button>
    </form>
  );
}
