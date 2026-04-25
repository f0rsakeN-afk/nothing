import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

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
import { Button } from "@/components/ui/button";

interface DeleteChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
}

export function DeleteChatDialog({
  open,
  onOpenChange,
  title,
}: DeleteChatDialogProps) {
  const t = useTranslations();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10">
            <Trash2 className="size-5 text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>{t("chat.deleteConversation")}</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">
              &ldquo;{title}&rdquo;
            </span>{" "}
            {t("chat.willBePermanentlyDeleted")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className={"text-white"}
            render={<Button variant="destructive" />}
            onClick={() => onOpenChange(false)}
          >
            {t("chat.deleteChat")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
