"use client";

import { memo, useCallback, useState } from "react";
import {
  FolderOpenDot,
  MessageSquare,
  Image as ImageIcon,
  FileText,
  FileCode,
  MoreVertical,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type TrashItemType = "chat" | "project" | "image" | "document" | "code";

export interface TrashItem {
  id: string;
  title: string;
  type: TrashItemType;
  expiresIn: string;
}

const getIconForType = (type: TrashItemType) => {
  switch (type) {
    case "project":
      return <FolderOpenDot className="w-5 h-5 text-primary" />;
    case "chat":
      return <MessageSquare className="w-5 h-5 text-primary" />;
    case "image":
      return <ImageIcon className="w-5 h-5 text-primary" />;
    case "document":
      return <FileText className="w-5 h-5 text-primary" />;
    case "code":
      return <FileCode className="w-5 h-5 text-primary" />;
    default:
      return <FileText className="w-5 h-5 text-primary" />;
  }
};

interface TrashItemListProps {
  items: TrashItem[];
}

export const TrashItemList = memo(function TrashItemList({
  items,
}: TrashItemListProps) {
  const [itemToDelete, setItemToDelete] = useState<TrashItem | null>(null);

  const handleRestore = useCallback((id: string) => {
    console.log("Restoring item:", id);
  }, []);

  const handleDeletePermanent = useCallback(() => {
    if (!itemToDelete) return;
    console.log("Permanently deleting item:", itemToDelete.id);
    setItemToDelete(null);
  }, [itemToDelete]);

  if (items.length === 0) {
    return (
      <div className="flex-1 mt-8 bg-muted/20 border border-border/40 rounded-2xl flex flex-col items-center justify-center p-12 text-center border-dashed">
        <Trash2 className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-base font-semibold text-foreground mb-1">
          Trash is empty
        </h3>
        <p className="text-[13px] text-muted-foreground max-w-xs">
          Items in the trash will be automatically deleted after 30 days.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((item) => (
          <Card
            key={item.id}
            className="flex flex-col h-full hover:bg-muted/10 hover:border-primary/30 transition-colors shadow-none border-border/40 relative group"
          >
            <CardHeader className="pb-8">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  {getIconForType(item.type)}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-accent-foreground transition-all cursor-pointer outline-none"
                    onClick={(e) => e.preventDefault()}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 rounded-xl">
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={() => handleRestore(item.id)}
                    >
                      <RotateCcw className="w-4 h-4 text-muted-foreground" />{" "}
                      Restore
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive gap-2"
                      onClick={() => setItemToDelete(item)}
                    >
                      <Trash2 className="w-4 h-4" /> Delete forever
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="space-y-1">
              <CardTitle
                className="text-base font-sans font-semibold tracking-tight truncate"
                title={item.title}
              >
                {item.title}
              </CardTitle>
              <CardDescription className="text-[12px] font-sans font-medium text-muted-foreground flex items-center gap-2">
                <span className="capitalize">{item.type}</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                <span className="text-destructive/80 font-medium tracking-tight">Deletes in {item.expiresIn}</span>
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog
        open={!!itemToDelete}
        onOpenChange={(open) => !open && setItemToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete forever?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete &quot;{itemToDelete?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePermanent}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
