"use client";

import { memo, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, PieChart as PieChartIcon, BarChart as BarChartIcon, GanttChartSquare } from "lucide-react";
import { CodeBlock } from "./code-block";

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899"];

export const ChartVisualizer = memo(function ChartVisualizer({ data }: { data: string }) {
  const chartData = useMemo(() => {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }, [data]);

  if (!chartData || !chartData.type || !chartData.items) {
    return <CodeBlock language="json">{data}</CodeBlock>;
  }

  const { type, items, title, xKey = "name", yKey = "value", startKey = "start", endKey = "end" } = chartData;

  const processedItems = useMemo(() => {
    if (type !== "gantt") return items;
    return items.map((item: any) => ({
      ...item,
      duration: item[endKey] - item[startKey],
      offset: item[startKey],
    }));
  }, [items, type, startKey, endKey]);

  return (
    <div className="my-6 rounded-xl border border-border bg-muted/20 p-6 shadow-sm transition-all hover:bg-muted/30">
      <div className="mb-6 flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
          {type === "bar"   && <BarChartIcon    className="h-4 w-4 text-primary" />}
          {type === "line"  && <TrendingUp      className="h-4 w-4 text-primary" />}
          {type === "pie"   && <PieChartIcon    className="h-4 w-4 text-primary" />}
          {type === "gantt" && <GanttChartSquare className="h-4 w-4 text-primary" />}
          {title || (type === "gantt" ? "Timeline" : "Data Visualization")}
        </h4>
      </div>

      <div className="h-[300px] w-full min-w-0 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          {type === "line" ? (
            <LineChart data={processedItems} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.4)" />
              <XAxis
                dataKey={xKey}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <RechartsTooltip
                contentStyle={{ backgroundColor: "hsl(var(--background))", borderRadius: "12px", border: "1px solid hsl(var(--border))", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                itemStyle={{ fontSize: "12px", color: "hsl(var(--foreground))" }}
                cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "4 4" }}
              />
              <Line type="monotone" dataKey={yKey} stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0, fill: "#10b981" }} />
            </LineChart>
          ) : type === "pie" ? (
            <PieChart>
              <Pie data={processedItems} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={80} stroke="hsl(var(--background))" strokeWidth={2}>
                {processedItems.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip
                contentStyle={{ backgroundColor: "hsl(var(--background))", borderRadius: "12px", border: "1px solid hsl(var(--border))" }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
              />
            </PieChart>
          ) : type === "gantt" ? (
            <BarChart layout="vertical" data={processedItems} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border) / 0.4)" />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey={xKey}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <RechartsTooltip
                cursor={{ fill: "transparent" }}
                content={({ active, payload }) => {
                  if (active && payload?.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-border bg-background p-2 shadow-md">
                        <p className="text-xs font-bold text-foreground">{d[xKey]}</p>
                        <p className="text-[11px] text-muted-foreground">{d[startKey]} – {d[endKey]}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="offset" stackId="a" fill="transparent" />
              <Bar dataKey="duration" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          ) : (
            <BarChart data={processedItems} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.4)" />
              <XAxis
                dataKey={xKey}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <RechartsTooltip
                cursor={{ fill: "hsl(var(--muted) / 0.3)", radius: 4 }}
                contentStyle={{ backgroundColor: "hsl(var(--background))", borderRadius: "12px", border: "1px solid hsl(var(--border))" }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Bar dataKey={yKey} fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
});
