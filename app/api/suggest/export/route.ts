import { NextRequest, NextResponse } from "next/server";
import promptsData from "@/data/prompts.json";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";
    const category = searchParams.get("category") || "";

    let data: Record<string, string[]> | string[] = promptsData as Record<string, string[]>;

    // Filter by category if specified
    if (category && category !== "all") {
      const filtered: Record<string, string[]> = {};
      const categories = (category).split(",");
      for (const cat of categories) {
        const catTrimmed = cat.trim().toLowerCase();
        if (data[catTrimmed]) {
          filtered[catTrimmed] = data[catTrimmed];
        }
      }
      data = Object.keys(filtered).length > 0 ? filtered : data;
    }

    if (format === "csv") {
      // Convert to CSV
      const rows = ["category,prompt"];
      for (const [cat, prompts] of Object.entries(data)) {
        for (const prompt of prompts) {
          // Escape quotes and wrap in quotes
          const escaped = prompt.replace(/"/g, '""');
          rows.push(`${cat},"${escaped}"`);
        }
      }
      const csv = rows.join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="prompts-${category || "all"}.csv"`,
        },
      });
    }

    // Default: JSON
    return NextResponse.json(data, {
      headers: {
        "Content-Disposition": `attachment; filename="prompts-${category || "all"}.json"`,
      },
    });
  } catch (error) {
    console.error("[export] error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
