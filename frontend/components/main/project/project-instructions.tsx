import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function ProjectInstructions() {
  return (
    <Dialog>
      <DialogTrigger 
        className="p-5 border-b border-border/60 hover:bg-muted/30 transition-colors cursor-pointer group text-left outline-none w-full block"
      >
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-[15px] font-medium text-foreground">Instructions</h3>
          <Plus className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
        <p className="text-[13px] text-muted-foreground">Add instructions to tailor Eryx&apos;s responses</p>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Project Instructions</DialogTitle>
        </DialogHeader>
        <div className="pt-4">
          <p className="text-[13px] text-muted-foreground mb-4">
            Provide instructions to tailor Eryx&apos;s responses for this specific project context. This will act as a system prompt.
          </p>
          <Textarea 
            className="min-h-[200px] text-[14.5px] rounded-xl resize-none" 
            placeholder="e.g. Always respond in TypeScript. Avoid using external libraries if possible." 
          />
          <div className="flex justify-end mt-4">
            <Button>Save Instructions</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
