"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck, ArrowLeft } from "lucide-react";

import {
  verifyEmailAddressSchema,
  type verifyEmailInput,
} from "@/schemas/auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

function SuccessView() {
  return (
    <div className="flex flex-col items-center text-center gap-5 py-2">
      <div className="h-14 w-14 rounded-2xl border border-border bg-muted flex items-center justify-center shadow-sm">
        <MailCheck className="w-6 h-6 text-green-500" />
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-base font-semibold text-foreground tracking-tight">
          Email verified!
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your email address has been successfully verified.
          <br />
          You can now continue to the application.
        </p>
      </div>

      <Link
        href="/login"
        className="inline-flex items-center justify-center w-full h-10 px-4 py-2 mt-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-medium text-sm  "
      >
        Continue to Login
      </Link>
    </div>
  );
}

export function VerifyEmailForm({ email }: { email?: string }) {
  const [verified, setVerified] = useState(false);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<verifyEmailInput>({
    resolver: zodResolver(verifyEmailAddressSchema),
    defaultValues: { otp: "" },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const otpValue = watch("otp") || "";

  const onSubmit = async () => {
    // Replace with real API call:
    // await fetch("/api/auth/verify-email", { method: "POST", body: JSON.stringify(data) });
    void email;
    await new Promise((res) => setTimeout(res, 1000));
    setVerified(true);
  };

  const handleResend = async () => {
    // API call for resend
  };

  if (verified) {
    return <SuccessView />;
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col items-center gap-2">
        <Label htmlFor="otp" className="text-sm font-medium sr-only">
          Verification Code
        </Label>
        <InputOTP
          maxLength={6}
          id="otp"
          value={otpValue}
          onChange={(value) => setValue("otp", value, { shouldValidate: true })}
          disabled={isSubmitting}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
        {errors.otp && (
          <p className="text-xs text-destructive mt-1">{errors.otp.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting || otpValue.length !== 6}
        size="lg"
        className="w-full h-10 font-medium"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Verifying…
          </>
        ) : (
          "Verify email"
        )}
      </Button>

      <div className="flex flex-col gap-4 text-center mt-2">
        <p className="text-sm text-muted-foreground">
          Didn&apos;t receive the code?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={isSubmitting}
            className="font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground  "
          >
            Click to resend
          </button>
        </p>

        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground   duration-200"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
