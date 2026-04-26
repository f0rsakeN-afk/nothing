"use client";

import { useState, memo, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, FileText, X, File, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/use-web-haptics';

export interface MemoryItem {
  id: string;
  title: string;
  content: string;
  category: string | null;
  createdAt: Date;
}

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; content: string; category: string }) => void;
  memory?: MemoryItem | null;
}

const PRESET_CATEGORIES = ['work', 'personal', 'projects', 'ideas', 'important'];

function MemoryModalComponent({ isOpen, onClose, onSubmit, memory }: MemoryModalProps) {
  const { trigger } = useHaptics();
  const [title, setTitle] = useState(memory?.title || '');
  const [content, setContent] = useState(memory?.content || '');
  const [category, setCategory] = useState(memory?.category || '');
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    trigger("success");
    onSubmit({ title, content, category });
    handleClose();
  };

  const handleClose = useCallback(() => {
    trigger("nudge");
    setTitle('');
    setContent('');
    setCategory('');
    setFileName(null);
    onClose();
  }, [onClose, trigger]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    try {
      let text = '';

      if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
        text = await file.text();
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        text = await file.text();
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        text = `[PDF content from: ${file.name}]`;
      } else {
        text = await file.text();
      }

      setContent((prev) => prev ? `${prev}\n\n${text}` : text);

      if (!title) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setTitle(nameWithoutExt);
      }
    } catch (error) {
      console.error('Error reading file:', error);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [title]);

  const removeFile = useCallback(() => {
    setFileName(null);
  }, []);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleCategorySelect = useCallback((cat: string) => {
    setCategory(cat);
  }, []);

  const handleCloseModal = useCallback(() => {
    handleClose();
  }, [handleClose]);

  const isEditing = !!memory;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Memory' : 'New Memory'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">Content</span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".md,.txt,.pdf,text/markdown,text/plain,application/pdf"
              className="hidden"
            />
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What would you like to remember?"
              className="w-full min-h-[100px] resize-none"
            />

            {fileName ? (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center justify-center w-10 h-10 bg-background rounded-lg">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{fileName}</p>
                  <p className="text-xs text-muted-foreground">Added to memory</p>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="p-1.5 hover:bg-background rounded-lg transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={triggerFileInput}
                className="w-full p-4 border border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-1 opacity-60">
                  <FileText className="w-5 h-5 -rotate-12" />
                  <FileCode className="w-5 h-5 rotate-12" />
                  <File className="w-6 h-6" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload .md, .txt, or .pdf
                </p>
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESET_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategorySelect(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm",
                  category === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={!content.trim()}>
              {isEditing ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export const MemoryModal = memo(MemoryModalComponent);