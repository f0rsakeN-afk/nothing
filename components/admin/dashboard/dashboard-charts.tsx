"use client";

import { ChartContainer, ChartTooltipContent, ChartLegendContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";

interface ChartDataPoint {
  date: string;
  users: number;
  chats: number;
}

interface DashboardChartsProps {
  chartData: ChartDataPoint[];
}

export function DashboardCharts({ chartData }: DashboardChartsProps) {
  const formattedData = chartData.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  const chartConfig = {
    users: {
      label: "New Users",
      color: "hsl(var(--primary))",
    },
    chats: {
      label: "New Chats",
      color: "hsl(142, 76%, 45%)",
    },
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-medium text-foreground">Activity Overview</h3>
          <p className="text-xs text-muted-foreground mt-0.5">New users and chats over the last 30 days</p>
        </div>
      </div>
      <ChartContainer config={chartConfig} className="h-[220px] w-full">
        <AreaChart data={formattedData} margin={{ top: 5, right: 5, left: -20 }}>
          <defs>
            <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="chatsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            tickMargin={8}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={30}
          />
          <ChartTooltipContent
            indicator="dot"
            labelKey="date"
            formatter={(value, name) => [value, name === "users" ? "Users" : "Chats"]}
          />
          <ChartLegendContent />
          <Area
            type="monotone"
            dataKey="users"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#userGradient)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="chats"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#chatsGradient)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
