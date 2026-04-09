"use client";

import { useState, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  ExternalLink,
  Copy,
  FileText,
  Globe,
  CheckCircle,
} from "lucide-react";

interface GeneratedFile {
  id: string;
  name: string;
  source: string;
  sourceType: "url" | "document" | "ai";
  generatedAt: Date;
}

const DUMMY_FILES: GeneratedFile[] = [
  {
    id: "1",
    name: "Project Setup Guide.md",
    source: "https://docs.example.com/setup",
    sourceType: "url",
    generatedAt: new Date("2026-04-01"),
  },
  {
    id: "2",
    name: "API Reference.md",
    source: "https://api.example.com/docs",
    sourceType: "url",
    generatedAt: new Date("2026-03-28"),
  },
  {
    id: "3",
    name: "Architecture Notes.md",
    source: "AI Generated",
    sourceType: "ai",
    generatedAt: new Date("2026-03-15"),
  },
];

function FileCard({ file }: { file: GeneratedFile }) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "url":
        return <Globe className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  return (
    <Card className="group relative">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-muted rounded-lg shrink-0">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-medium truncate">{file.name}</h3>
              {/* <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  {getSourceIcon(file.sourceType)}
                  <span className="truncate max-w-[150px]">{file.source}</span>
                </div>
              </div> */}
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>{formatDate(file.generatedAt)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FilesHeader() {
  return (
    <div className="py-4 max-w-6xl mx-auto w-full">
      <h1 className="text-lg font-medium">Generated Files</h1>
      <p className="text-sm text-muted-foreground">
        Files created from URLs and documents
      </p>
    </div>
  );
}

function FilesGrid({ files }: { files: GeneratedFile[] }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {files.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No generated files yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Files will appear here when you generate them from URLs or
              documents
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-2">
            {files.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FilesPage() {
  const [files] = useState<GeneratedFile[]>(DUMMY_FILES);

  return (
    <div className="flex flex-col h-full">
      <FilesHeader />
      <FilesGrid files={files} />
    </div>
  );
}
