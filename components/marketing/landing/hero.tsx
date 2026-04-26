"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@stackframe/stack";
import dynamic from "next/dynamic";
import GridIllustration from "@/components/ui/grid-illustration";
import IntegrationBox from "@/components/ui/integrationBox";

import { Button } from "@/components/ui/button";
import { LogIn, ArrowRight } from "lucide-react";

const AuthDialog = dynamic(
  () =>
    import("@/components/main/sidebar/dialogs/auth/auth-dialog").then(
      (mod) => mod.AuthDialog,
    ),
  { ssr: false },
);

// const PhotonBeam = dynamic(() => import("@/components/ui/photon-beam"), {
//   ssr: false,
// });

export default function Hero() {
  const user = useUser();
  const router = useRouter();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  return (
    <>
      <section className="relative w-full">
        <div className="relative w-full max-w-7xl grid grid-cols-2 justify-between mx-auto py-20">
          <div className="relative my-20 flex flex-col items-center lg:items-start">
            {/* Title */}
            <div className="text-center text-[30px] font-display leading-none font-semibold sm:text-[3rem] sm:leading-tight lg:text-left">
              <h1 className="bg-linear-to-b from-neutral-700 to-neutral-900 bg-clip-text text-transparent dark:from-neutral-50 dark:to-neutral-300 font-poppins">
                AI Chat That Actually Gets You
                <br />
                Memory That Never Forgets
              </h1>
            </div>

            {/* Description */}
            <div className="my-4 max-w-sm text-center sm:my-6 sm:max-w-md lg:text-left">
              <p className="text-base text-muted-foreground sm:text-lg font-medium text-justify">
                Chat with AI that remembers your projects, understands your
                codebase, and builds on context not just the current
                conversation.
              </p>
            </div>

            {/* Button */}
            <div className="z-10 rounded-xl p-[2px]">
              {user ? (
                <Button
                  onClick={() => router.push("/home")}
                  className="font-semibold cursor-pointer"
                >
                  Go to Dashboard <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => setAuthDialogOpen(true)}
                  className="font-semibold cursor-pointer"
                >
                  Create Account Today <LogIn className="ml-2 w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <IntegrationBox />
        </div>
      </section>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </>
  );
}
