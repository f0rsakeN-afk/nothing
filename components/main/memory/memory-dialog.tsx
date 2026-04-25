'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useMemories } from '@/hooks/use-memories';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search, Trash2, Calendar, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { MemoryItem } from '@/services/memory.service';

interface MemoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectionMode?: boolean;
  selectedMemories?: string[];
  onMemoriesSelect?: (memoryIds: string[]) => void;
}

export function MemoryDialog({
  isOpen,
  onOpenChange,
  selectionMode = false,
  selectedMemories = [],
  onMemoriesSelect,
}: MemoryDialogProps) {
  const t = useTranslations("memory");
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newMemory, setNewMemory] = useState({ title: '', content: '' });
  const [localSelected, setLocalSelected] = useState<string[]>(selectedMemories);

  const {
    memories,
    total,
    isLoading,
    searchMemories,
    searchResults,
    isSearching,
    addMemory,
    isAdding: isAddingMemory,
    deleteMemory,
    isDeleting,
  } = useMemories();

  // Reset local selection when dialog opens
  const handleOpenChange = useCallback((open: boolean) => {
    if (open) {
      setLocalSelected(selectedMemories);
      setSearchQuery('');
      setIsAdding(false);
    }
    onOpenChange(open);
  }, [selectedMemories, onOpenChange]);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchMemories(searchQuery);
    }
  }, [searchQuery, searchMemories]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleAddMemory = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemory.content.trim()) return;

    try {
      await addMemory({
        title: newMemory.title || newMemory.content.slice(0, 50),
        content: newMemory.content,
      });
      setNewMemory({ title: '', content: '' });
      setIsAdding(false);
    } catch (error) {
      const err = error as { code?: string; message?: string; upgradeTo?: string };
      if (err.code === 'MEMORY_LIMIT_REACHED' || err.code === 'MEMORY_NOT_AVAILABLE') {
        toast.error(t("memoryLimitReached"), {
          description: err.upgradeTo ? t("upgradeForMore", { plan: err.upgradeTo }) : undefined,
          action: err.upgradeTo ? {
            label: t("upgradeForMore", { plan: err.upgradeTo }),
            onClick: () => window.dispatchEvent(new CustomEvent('open-pricing-dialog')),
          } : undefined,
        });
      } else {
        toast.error(t("failedToAddMemory"));
      }
    }
  }, [newMemory, addMemory, t]);

  const toggleMemorySelection = useCallback((memoryId: string) => {
    setLocalSelected((prev) => {
      if (prev.includes(memoryId)) {
        return prev.filter((id) => id !== memoryId);
      }
      if (prev.length >= 5) return prev;
      return [...prev, memoryId];
    });
  }, []);

  const handleConfirmSelection = useCallback(() => {
    onMemoriesSelect?.(localSelected);
    onOpenChange(false);
  }, [onMemoriesSelect, localSelected, onOpenChange]);

  const formatDate = useCallback((date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date));
  }, []);

  const startAddingMemory = useCallback(() => {
    setIsAdding(true);
  }, []);

  const cancelAddingMemory = useCallback(() => {
    setIsAdding(false);
  }, []);

  const clearAllSelected = useCallback(() => {
    setLocalSelected([]);
  }, []);

  const deleteMemoryById = useCallback((memoryId: string) => {
    deleteMemory(memoryId);
  }, [deleteMemory]);

  const closeDialog = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  // Determine which memories to display
  const displayedMemories = searchQuery.trim() && searchResults
    ? searchResults.memories
    : memories;

  const canAddMore = localSelected.length < 5;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center">
              <Search className="h-3 w-3 text-primary" />
            </div>
            {selectionMode ? t("selectContext") : t("title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0 flex flex-col">
          {/* Add memory form - only show in non-selection mode */}
          {!selectionMode && (
            <>
              {isAdding ? (
                <form onSubmit={handleAddMemory} className="space-y-3 p-4 rounded-lg border bg-muted/30">
                  <Input
                    value={newMemory.title}
                    onChange={(e) => setNewMemory({ ...newMemory, title: e.target.value })}
                    placeholder={t("titleOptional")}
                    className="flex-1"
                  />
                  <textarea
                    value={newMemory.content}
                    onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
                    placeholder={t("whatToRemember")}
                    className="w-full min-h-[100px] p-3 rounded-lg border bg-background text-sm resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="ghost" size="sm" onClick={cancelAddingMemory}>
                      {t("cancel")}
                    </Button>
                    <Button type="submit" size="sm" disabled={!newMemory.content.trim() || isAddingMemory}>
                      {isAddingMemory ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
                    </Button>
                  </div>
                </form>
              ) : (
                <Button onClick={startAddingMemory} variant="outline" className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  {t("addMemory")}
                </Button>
              )}
            </>
          )}

          {/* Selection count - only in selection mode */}
          {selectionMode && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {localSelected.length}/5 {t("memoriesSelected")}
              </span>
              {localSelected.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={clearAllSelected}
                >
                  {t("clearAll")}
                </Button>
              )}
            </div>
          )}

          {/* Search */}
          {!selectionMode && (
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={selectionMode ? t("searchToFilter") : t("searchMemories")}
                className="flex-1"
              />
              <Button type="submit" size="icon" variant="secondary" disabled={isSearching || !searchQuery.trim()}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </form>
          )}

          {/* Search hint in selection mode */}
          {selectionMode && (
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search to filter..."
                className="flex-1"
              />
              <Button type="submit" size="icon" variant="secondary" disabled={isSearching || !searchQuery.trim()}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </form>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {searchQuery.trim() ? `${displayedMemories.length} ${t("results")}` : `${total} ${t("totalMemories")}`}
            </span>
            {searchQuery.trim() && (
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={handleClearSearch}>
                {t("clearSearch")}
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1 pr-4 -mr-4">
            {isLoading && displayedMemories.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-[350px]">
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-4">{t("loadingMemories")}</p>
              </div>
            ) : displayedMemories.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-[350px] py-12 px-4 border border-dashed rounded-lg bg-muted/50 m-1">
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="font-medium">{t("noMemoriesFound")}</p>
                {searchQuery && <p className="text-xs text-muted-foreground mt-1">{t("tryDifferentSearch")}</p>}
                {!searchQuery && (
                  <p className="text-xs text-muted-foreground mt-1">{t("addMemoriesHint")}</p>
                )}
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {displayedMemories.map((memory) => {
                  const isSelected = localSelected.includes(memory.id);
                  const canSelect = canAddMore || isSelected;

                  return (
                    <div
                      key={memory.id}
                      onClick={() => canSelect && toggleMemorySelection(memory.id)}
                      className={cn(
                        'group relative p-4 rounded-lg border bg-card transition-all cursor-pointer',
                        selectionMode && 'hover:shadow-sm',
                        isSelected && 'border-primary bg-primary/5',
                        !canSelect && !isSelected && 'opacity-50 cursor-not-allowed',
                      )}
                    >
                      <div className="flex flex-col gap-2">
                        {memory.title && (
                          <p className="text-sm font-medium text-foreground">{memory.title}</p>
                        )}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                          {memory.content}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(memory.createdAt)}</span>
                          </div>
                          {selectionMode ? (
                            <div
                              className={cn(
                                'h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors',
                                isSelected
                                  ? 'bg-primary border-primary text-primary-foreground'
                                  : 'border-muted-foreground/30',
                              )}
                            >
                              {isSelected && <Check className="h-3.5 w-3.5" />}
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMemoryById(memory.id);
                              }}
                              className={cn(
                                'h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10',
                                'transition-opacity opacity-0 group-hover:opacity-100',
                              )}
                              disabled={isDeleting}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {selectionMode && (
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={closeDialog}>
              {t("cancel")}
            </Button>
            <Button onClick={handleConfirmSelection} disabled={localSelected.length === 0}>
              {t("use")} {localSelected.length} {localSelected.length !== 1 ? t("memories") : t("memory")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}