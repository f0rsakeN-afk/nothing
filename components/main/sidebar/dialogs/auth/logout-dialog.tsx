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

interface LogoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogoutDialog({ open, onOpenChange }: LogoutDialogProps) {
  const t = useTranslations();
  const app = useStackApp();
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
            onClick={() => {
              app.signOut();
              onOpenChange(false);
            }}
          >
            {t("auth.signOut")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
