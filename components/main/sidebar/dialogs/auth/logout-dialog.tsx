import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LogOut } from "lucide-react";
import { useStackApp } from "@stackframe/stack";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

interface LogoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STORAGE_KEY = "eryx-settings";

export function LogoutDialog({ open, onOpenChange }: LogoutDialogProps) {
  const t = useTranslations();
  const app = useStackApp();
  const router = useRouter();

  const handleSignOut = () => {
    // Clear localStorage settings
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}

    app.signOut();
    onOpenChange(false);
    router.push("/");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10">
            <LogOut className="size-5 text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>{t("auth.logOutOfAccount")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("auth.alwaysLogBackIn")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className={"text-white"}
            render={<Button variant="destructive" />}
            onClick={handleSignOut}
          >
            {t("auth.signOut")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
