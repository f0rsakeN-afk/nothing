"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RenameChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTitle: string;
  onRename: (title: string) => void;
}

export function RenameChatDialog({
  open,
  onOpenChange,
  currentTitle,
  onRename,
}: RenameChatDialogProps) {
  const [value, setValue] = React.useState(currentTitle);

  // Sync when dialog opens with a potentially new title
  React.useEffect(() => {
    if (open) setValue(currentTitle);
  }, [open, currentTitle]);

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== currentTitle) onRename(trimmed);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSave();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Rename conversation</DialogTitle>
          <DialogDescription>
            Give this conversation a new name.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="rename-input" className="text-xs font-medium">
            Title
          </Label>
          <Input
            id="rename-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="h-9 text-sm"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="lg"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button size="lg" disabled={!value.trim()} onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
