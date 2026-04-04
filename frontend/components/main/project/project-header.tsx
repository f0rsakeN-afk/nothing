import { MoreVertical, Pin, Pencil, Archive as ArchiveIcon, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ProjectHeader() {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-4xl font-semibold tracking-tight">cwdc</h1>
      <div className="flex items-center gap-2 text-muted-foreground">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer outline-none">
            <MoreVertical className="w-4 h-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 rounded-xl">
            <DropdownMenuItem className="gap-2"><Pin className="w-4 h-4 text-muted-foreground" /> Pin project</DropdownMenuItem>
            <DropdownMenuItem className="gap-2"><Pencil className="w-4 h-4 text-muted-foreground" /> Rename</DropdownMenuItem>
            <DropdownMenuItem className="gap-2"><ArchiveIcon className="w-4 h-4 text-muted-foreground" /> Archive</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive gap-2">
              <Trash2 className="w-4 h-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
