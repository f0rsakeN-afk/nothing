import { FileText, FileCode, File, Plus } from "lucide-react";

export function ProjectFilesDropzone() {
  return (
    <div className="flex-1 p-5 flex flex-col min-h-[300px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-medium text-foreground">Files</h3>
        <Plus className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
      </div>

      {/* Empty State */}
      <div className="flex-1 mt-2 bg-muted/30 border border-border/60 rounded-xl flex flex-col items-center justify-center p-6 text-center shadow-inner cursor-pointer hover:bg-muted/60 transition-colors border-dashed">
        <div className="flex items-center justify-center mb-4 relative opacity-60">
          <FileText className="w-8 h-8 text-muted-foreground absolute -left-6 z-0 -rotate-12" />
          <FileCode className="w-8 h-8 text-muted-foreground absolute -right-6 z-0 rotate-12" />
          <File className="w-10 h-10 text-foreground z-10" />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-background rounded-full border border-border flex items-center justify-center z-20">
            <Plus className="w-3 h-3 text-foreground" />
          </div>
        </div>
        <p className="text-[13px] text-muted-foreground max-w-[200px] leading-relaxed">
          Add PDFs, documents, or other text to reference in this project.
        </p>
      </div>
    </div>
  );
}
