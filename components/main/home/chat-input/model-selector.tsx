"use client";

import * as React from "react";
import { Check, Cpu } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MODELS = [
  { value: "eryx-1", label: "Eryx-1" },
  { value: "eryx-1-fast", label: "Eryx-1 Fast" },
  { value: "eryx-1-pro", label: "Eryx-1 Pro" },
];

interface ModelSelectorProps {
  currentModel?: string;
  onModelChange?: (model: string) => void;
}

export function ModelSelector({ currentModel, onModelChange }: ModelSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const current = MODELS.find((m) => m.value === (currentModel || "eryx-1")) || MODELS[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12px] transition-all duration-150",
          currentModel && currentModel !== "eryx-1"
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/70"
        )}
      >
        <Cpu className="h-3.5 w-3.5" />
        <span className="font-medium">{current.label}</span>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="center" sideOffset={8} className="w-48 p-1.5">
        {MODELS.map((model) => (
          <button
            key={model.value}
            onClick={() => {
              onModelChange?.(model.value);
              setOpen(false);
            }}
            className={cn(
              "flex items-center gap-2 w-full px-2 py-1.5 text-[12px] rounded-md cursor-pointer transition-all",
              currentModel === model.value
                ? "text-primary font-medium bg-primary/10"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            )}
          >
            {currentModel === model.value ? (
              <Check className="h-[14px] w-[14px] text-primary shrink-0" />
            ) : (
              <span className="w-[14px] shrink-0" />
            )}
            <span>{model.label}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
