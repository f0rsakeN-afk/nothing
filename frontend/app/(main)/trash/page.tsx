"use client";

import { useMemo } from "react";
import { TrashItemList, TrashItem } from "@/components/main/trash/trash-item-list";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Example mock data spanning multiple item types
const INITIAL_TRASH_DATA: TrashItem[] = [
  { id: "t1", title: "Legacy V1 Architecture", type: "project", expiresIn: "28 days" },
  { id: "t2", title: "Concept Mockup v3.png", type: "image", expiresIn: "30 days" },
  { id: "t3", title: "React Context Debugging", type: "chat", expiresIn: "14 days" },
  { id: "t4", title: "Q3 Strategy Planning.pdf", type: "document", expiresIn: "2 days" },
  { id: "t5", title: "old_utils.ts", type: "code", expiresIn: "10 hours" },
];

export default function TrashPage() {
  
  // Memoize data to prevent re-renders if the list gets complex or large
  const trashItems = useMemo(() => INITIAL_TRASH_DATA, []);

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto w-full">
      <div className="w-full max-w-6xl mx-auto px-6 py-12 md:py-20 flex flex-col pt-16">
        
        {/* Header Row */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight mb-2">Trash</h1>
            <p className="text-[13.5px] text-muted-foreground">
              Items in trash will be permanently deleted after 30 days.
            </p>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger className="h-9 px-4 inline-flex items-center justify-center rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 border border-destructive/20 transition-colors">
              Empty trash
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Empty Trash</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to permanently delete all items in the trash? This action cannot be undone and all data will be lost forever.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                  Empty trash
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Unified Code-Split List */}
        <TrashItemList items={trashItems} />
        
      </div>
    </div>
  );
}
