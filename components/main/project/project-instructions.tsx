"use client";

import { useState, useEffect } from "react";
import { Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateProject } from "@/hooks/use-projects";
import { toast } from "@/components/ui/sileo-toast";

interface ProjectInstructionsProps {
  projectId: string;
  instruction: string | null;
}

export function ProjectInstructions({ projectId, instruction }: ProjectInstructionsProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(instruction || "");
  const updateProject = useUpdateProject();

  useEffect(() => {
    setValue(instruction || "");
  }, [instruction]);

  const handleSave = async () => {
    try {
      await updateProject.mutateAsync({
        id: projectId,
        instruction: value.trim() || undefined,
      });
      toast.success("Instructions saved");
      setOpen(false);
    } catch (error) {
      console.error("Failed to save instructions:", error);
      toast.error("Failed to save instructions");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="p-5 border-b border-border/60 hover:bg-muted/30 transition-colors cursor-pointer group text-left outline-none w-full block">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-[15px] font-medium text-foreground">
            Instructions
          </h3>
          <Plus className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
        {instruction ? (
          <p className="text-[13px] text-muted-foreground line-clamp-2">
            {instruction}
          </p>
        ) : (
          <p className="text-[13px] text-muted-foreground italic">
            Add instructions to tailor responses
          </p>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Project Instructions</DialogTitle>
        </DialogHeader>
        <div className="pt-4">
          <p className="text-[13px] text-muted-foreground mb-4">
            Provide instructions to tailor Eryx&apos;s responses for this
            specific project context. This will act as a system prompt.
          </p>
          <Textarea
            className="min-h-[200px] text-[14.5px] rounded-xl resize-none"
            placeholder="e.g. Always respond in TypeScript. Avoid using external libraries if possible."
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateProject.isPending}>
              {updateProject.isPending ? (
                "Saving..."
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" /> Save
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
