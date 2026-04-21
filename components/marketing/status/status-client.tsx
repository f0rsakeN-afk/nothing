"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface LatencyMetrics {
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
}

interface Component {
  id: string;
  name: string;
  category: "core" | "external" | "ai";
  status: "operational" | "degraded" | "down";
  latencyMs?: number;
  uptimePercent: number;
  incidents: number;
  circuitState?: string;
}

interface CircuitBreaker {
  state: string;
  failures: number;
  successes: number;
  lastFailure: string | null;
  nextAttempt: string | null;
  failureRate: number;
  totalCalls: number;
  uptimePercent: number;
}

interface SLAData {
  uptimePercent: number;
  totalIncidents: number;
  mttrMinutes: number;
  lastIncidentAt: string | null;
}

interface DetailedMetrics {
  uptimePercent: number;
  latency: LatencyMetrics;
  totalChecks: number;
  downCount: number;
}

interface HealthCheck {
  timestamp: string;
  latencyMs?: number;
  uptimePercent: number;
  status: "up" | "down";
}

interface StatusData {
  timestamp: string;
  status: "operational" | "degraded" | "down";
  uptimePercent: number;
  components: Component[];
  circuitBreakers: Record<string, CircuitBreaker>;
  sla: SLAData;
  activeIncidents: Array<{
    id: string;
    title: string;
    status: string;
    severity: string;
    affectedComponents: string[];
    startedAt: string;
  }>;
  metrics?: {
    database: DetailedMetrics;
    redis: DetailedMetrics;
    api: DetailedMetrics;
    search: DetailedMetrics;
    openai: DetailedMetrics;
  };
}

interface RawData {
  database: HealthCheck[];
  redis: HealthCheck[];
  api: HealthCheck[];
  search: HealthCheck[];
  openai: HealthCheck[];
  searxng: HealthCheck[];
}

// Chart configs
const uptimeChartConfig: ChartConfig = {
  uptime: {
    label: "Uptime %",
    color: "hsl(var(--chart-1))",
  },
};

const latencyChartConfig: ChartConfig = {
  latency: {
    label: "Latency (ms)",
    color: "hsl(var(--chart-2))",
  },
};

function StatusDot({ status, size = "md" }: { status: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-1.5 h-1.5", md: "w-2 h-2", lg: "w-2.5 h-2.5" };
  const colors = {
    operational: "bg-emerald-500",
    degraded: "bg-amber-500",
    down: "bg-red-500",
  };

  return (
    <span className={`inline-block rounded-full ${sizes[size]} ${colors[status as keyof typeof colors] || colors.operational}`} />
  );
}

function CircuitBadge({ state }: { state: string }) {
  const styles = {
    CLOSED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    OPEN: "bg-red-500/10 text-red-600 dark:text-red-400",
    HALF_OPEN: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };

  const labels = {
    CLOSED: "Ok",
    OPEN: "Open",
    HALF_OPEN: "Testing",
  };

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${styles[state as keyof typeof styles] || styles.CLOSED}`}>
      {labels[state as keyof typeof labels] || state}
    </span>
  );
}

function UptimeBar({ percent }: { percent: number }) {
  const color = percent >= 99.9 ? "bg-emerald-500" : percent >= 99 ? "bg-emerald-400" : percent >= 95 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
      <span className={`text-xs font-mono font-medium w-14 text-right ${
        percent >= 99.9 ? "text-emerald-600 dark:text-emerald-400" :
        percent >= 99 ? "text-emerald-500" :
        percent >= 95 ? "text-amber-500" : "text-red-500"
      }`}>
        {percent.toFixed(3)}%
      </span>
    </div>
  );
}

function MetricPill({ label, value, unit = "ms" }: { label: string; value: number; unit?: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold font-mono text-foreground">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}

function ComponentCard({ component }: { component: Component }) {
  return (
    <div className={`bg-card border rounded-xl p-4 transition-all ${
      component.status === "down" ? "border-red-500/30 bg-red-500/5" :
      component.status === "degraded" ? "border-amber-500/30 bg-amber-500/5" :
      "border-border hover:border-border/80"
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusDot status={component.status} />
          <span className="text-sm font-medium text-foreground">{component.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {component.circuitState && <CircuitBadge state={component.circuitState} />}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            component.status === "operational" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
          }`}>
            {component.status === "operational" ? "Up" : "Down"}
          </span>
        </div>
      </div>

      <UptimeBar percent={component.uptimePercent} />

      {component.latencyMs !== undefined && (
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Response</span>
          <span className="text-sm font-mono font-medium text-foreground">{component.latencyMs}ms</span>
        </div>
      )}
    </div>
  );
}

function SLACard({ sla }: { sla: SLAData }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-xs text-muted-foreground mb-3">30-Day SLA</div>
      <div className="flex items-end gap-4">
        <div>
          <div className="text-2xl font-bold font-mono text-foreground">{sla.uptimePercent.toFixed(3)}%</div>
          <div className="text-[10px] text-muted-foreground uppercase">Uptime</div>
        </div>
        <div className="flex-1" />
        <div className="text-right">
          <div className="text-sm font-mono text-foreground">{sla.totalIncidents}</div>
          <div className="text-[10px] text-muted-foreground">Incidents</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-mono text-foreground">{sla.mttrMinutes}m</div>
          <div className="text-[10px] text-muted-foreground">MTTR</div>
        </div>
      </div>
    </div>
  );
}

function UptimeChart({ data }: { data: HealthCheck[] }) {
  if (!data || data.length === 0) {
    return <div className="h-[100px] flex items-center justify-center text-xs text-muted-foreground">No data available</div>;
  }

  const hourlyData = data.reduce((acc, d) => {
    const hour = d.timestamp.substring(0, 13) + ":00";
    if (!acc[hour]) {
      acc[hour] = { uptimeSum: 0, count: 0, status: "up" as const };
    }
    acc[hour].uptimeSum += d.uptimePercent;
    acc[hour].count += 1;
    if (d.status === "down") acc[hour].status = "down";
    return acc;
  }, {} as Record<string, { uptimeSum: number; count: number; status: "up" | "down" }>);

  const chartData = Object.entries(hourlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-24)
    .map(([hour, { uptimeSum, count, status }]) => ({
      time: new Date(hour).toLocaleTimeString("en-US", { hour: "numeric", hour12: true }),
      fullTime: hour,
      uptime: Math.round(uptimeSum / count * 100) / 100,
      status,
    }));

  return (
    <ChartContainer config={uptimeChartConfig} className="h-[100px] w-full">
      <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={30}
        />
        <YAxis
          domain={[96, 100]}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}%`}
          width={35}
        />
        <ReferenceLine y={99.9} stroke="hsl(var(--emerald-500))" strokeDasharray="2 2" />
        <Tooltip
          content={<ChartTooltipContent
            indicator="dot"
            formatter={(value) => [`${Number(value).toFixed(3)}%`, "Uptime"]}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime || ""}
          />}
        />
        <Line
          type="monotone"
          dataKey="uptime"
          stroke="hsl(var(--chart-1))"
          strokeWidth={2}
          dot={(props) => {
            const { cx, cy, payload } = props;
            return payload.status === "down"
              ? <circle key={props.key} cx={cx} cy={cy} r={4} fill="hsl(var(--destructive))" />
              : <circle key={props.key} cx={cx} cy={cy} r={2} fill="hsl(var(--chart-1))" />;
          }}
          activeDot={{ r: 4, fill: "hsl(var(--chart-1))" }}
        />
      </LineChart>
    </ChartContainer>
  );
}

function LatencyChart({ data }: { data: HealthCheck[] }) {
  if (!data || data.length === 0) {
    return <div className="h-[80px] flex items-center justify-center text-xs text-muted-foreground">No data available</div>;
  }

  const hourlyData = data.reduce((acc, d) => {
    const hour = d.timestamp.substring(0, 13) + ":00";
    if (!acc[hour]) {
      acc[hour] = { latencySum: 0, count: 0 };
    }
    acc[hour].latencySum += d.latencyMs || 0;
    acc[hour].count += 1;
    return acc;
  }, {} as Record<string, { latencySum: number; count: number }>);

  const chartData = Object.entries(hourlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-24)
    .map(([hour, { latencySum, count }]) => ({
      time: new Date(hour).toLocaleTimeString("en-US", { hour: "numeric", hour12: true }),
      fullTime: hour,
      latency: Math.round(latencySum / count),
    }));

  return (
    <ChartContainer config={latencyChartConfig} className="h-[80px] w-full">
      <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={30}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}ms`}
          width={40}
        />
        <Tooltip
          content={<ChartTooltipContent
            indicator="dot"
            formatter={(value) => [`${value}ms`, "Latency"]}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime || ""}
          />}
        />
        <Line
          type="monotone"
          dataKey="latency"
          stroke="hsl(var(--chart-2))"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "hsl(var(--chart-2))" }}
        />
      </LineChart>
    </ChartContainer>
  );
}

function LatencyDistribution({ metrics }: { metrics: DetailedMetrics }) {
  const { avg, p50, p95, p99 } = metrics.latency;
  const max = Math.max(avg * 2, p99 * 1.2, 100);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-xs text-muted-foreground mb-3">Latency Distribution</div>

      <div className="space-y-2">
        {[
          { label: "p99", value: p99, color: "bg-red-500" },
          { label: "p95", value: p95, color: "bg-amber-500" },
          { label: "p50", value: p50, color: "bg-emerald-500" },
          { label: "avg", value: avg, color: "bg-blue-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-8 font-mono">{label}</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
            </div>
            <span className="text-xs font-mono font-medium text-foreground w-12 text-right">{value}ms</span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-3 gap-2">
        <MetricPill label="min" value={metrics.latency.min} />
        <MetricPill label="avg" value={avg} />
        <MetricPill label="max" value={metrics.latency.max} />
      </div>
    </div>
  );
}

function IncidentBanner({ incident }: { incident: StatusData["activeIncidents"][0] }) {
  const severityColors = {
    critical: "border-red-500/50 bg-red-500/10",
    major: "border-amber-500/50 bg-amber-500/10",
    minor: "border-blue-500/50 bg-blue-500/10",
  };

  const statusColors = {
    investigating: "text-red-600 dark:text-red-400",
    identified: "text-amber-600 dark:text-amber-400",
    monitoring: "text-blue-600 dark:text-blue-400",
    resolved: "text-emerald-600 dark:text-emerald-400",
  };

  return (
    <div className={`border rounded-xl p-4 ${severityColors[incident.severity as keyof typeof severityColors]}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold uppercase ${
              incident.severity === "critical" ? "text-red-600 dark:text-red-400" :
              incident.severity === "major" ? "text-amber-600 dark:text-amber-400" :
              "text-blue-600 dark:text-blue-400"
            }`}>
              {incident.severity}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className={`text-xs font-medium ${statusColors[incident.status as keyof typeof statusColors]}`}>
              {incident.status}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-foreground">{incident.title}</h4>
        </div>
        <time className="text-xs text-muted-foreground">
          {new Date(incident.startedAt).toLocaleString()}
        </time>
      </div>
    </div>
  );
}

function LiveIndicator() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Live</span>
    </div>
  );
}

function ServiceSection({
  name,
  uptimeData,
  latencyData,
  metrics,
}: {
  name: string;
  uptimeData: HealthCheck[];
  latencyData: HealthCheck[];
  metrics: DetailedMetrics;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">{name}</h3>
        <span className="text-xs text-muted-foreground">Last 24 hours</span>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="text-xs text-muted-foreground mb-3">Uptime</div>
        <UptimeChart data={uptimeData} />
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Response Time</span>
          <span className="text-xs font-mono text-muted-foreground">Avg: {metrics.latency.avg}ms</span>
        </div>
        <LatencyChart data={latencyData} />
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex justify-center">
        <div className="h-10 w-56 bg-muted rounded-full" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-card border border-border rounded-xl p-4">
            <div className="h-3 w-16 bg-muted rounded mb-3" />
            <div className="h-6 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <div className="h-5 w-32 bg-muted rounded" />
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="h-24 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}

export function StatusContent() {
  const [data, setData] = useState<StatusData | null>(null);
  const [rawData, setRawData] = useState<RawData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const [statusRes, rawRes] = await Promise.all([
        fetch("/api/health?detailed=true"),
        fetch("/api/health?raw=true&hours=24"),
      ]);

      if (statusRes.ok && rawRes.ok) {
        const statusJson = await statusRes.json();
        const rawJson = await rawRes.json();
        setData(statusJson);
        setRawData(rawJson);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error("Failed to fetch status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // SSE for real-time updates
  useEffect(() => {
    fetchStatus();

    const pollInterval = setInterval(fetchStatus, 30000);

    const connectSSE = () => {
      const es = new EventSource("/api/status/stream");
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "health_update" || msg.type === "connected") {
            fetchStatus();
          }
        } catch {
          // Ignore
        }
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    return () => {
      clearInterval(pollInterval);
      eventSourceRef.current?.close();
    };
  }, [fetchStatus]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Unable to load status</p>
      </div>
    );
  }

  const isDetailedFormat = data && "overall" in data;

  const overallData = isDetailedFormat ? (data as { overall?: { status?: string; components?: unknown; sla?: unknown; activeIncidents?: unknown; circuitBreakers?: unknown } }).overall || {} : {};

  const { status: overallStatus, components, sla, activeIncidents, circuitBreakers } = overallData;
  const { status: dataStatus, sla: dataSla, ...rest } = isDetailedFormat ? {} : (data as { status?: string; sla?: unknown }) || {};
  const actualStatus = overallStatus || dataStatus || "operational";
  const actualSla = (sla || dataSla || { uptimePercent: 100, totalIncidents: 0, mttrMinutes: 0, lastIncidentAt: null }) as { uptimePercent: number; totalIncidents: number; mttrMinutes: number; lastIncidentAt: string | null };
  const safeActiveIncidents = (activeIncidents || []) as Array<{ id: string; title: string; status: string; severity?: string; affectedComponents?: string[]; startedAt?: string; message?: string; [key: string]: unknown }>;

  const dbData = rawData?.database || [];
  const redisData = rawData?.redis || [];
  const openaiData = rawData?.openai || [];

  const safeComponents = (components || []) as Array<{ id?: string; name?: string; status?: string; uptimePercent?: number; incidents?: number; category?: string; [key: string]: unknown }>;
  const coreComponents = safeComponents.filter((c) => c.category === "core");
  const aiComponents = safeComponents.filter((c) => c.category === "ai");

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <StatusDot status={actualStatus} size="lg" />
          <h2 className={`text-2xl font-bold ${
            actualStatus === "operational" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          }`}>
            {actualStatus === "operational" ? "All Systems Operational" :
             "Service Disruption"}
          </h2>
        </div>

        <div className="flex items-center justify-center gap-6">
          <LiveIndicator />
          <span className="text-xs text-muted-foreground">
            Updated {lastUpdate ? lastUpdate.toLocaleTimeString() : "—"}
          </span>
        </div>
      </div>

      {/* Active Incidents */}
      {safeActiveIncidents.length > 0 && (
        <div className="space-y-3">
          {safeActiveIncidents.map((incident) => (
            <IncidentBanner key={incident.id} incident={incident as { id: string; title: string; status: string; severity: string; affectedComponents: string[]; startedAt: string; message?: string }} />
          ))}
        </div>
      )}

      {/* SLA Card */}
      <SLACard sla={actualSla} />

      {/* Core Services */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Core Services</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {coreComponents.map((component) => (
            <ComponentCard key={component.id || String(Math.random())} component={component as Component} />
          ))}
        </div>
      </div>

      {/* AI Services */}
      {aiComponents.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">AI Services</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {aiComponents.map((component) => (
              <ComponentCard key={component.id || String(Math.random())} component={component as Component} />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center space-y-2 pt-4 border-t border-border">
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span>30-day uptime SLA</span>
          <span className="font-mono">•</span>
          <span>{actualSla.uptimePercent.toFixed(2)}% achieved</span>
          <span className="font-mono">•</span>
          <Link href="/status/history" className="text-primary hover:underline">View history →</Link>
        </div>
        <p className="text-[10px] text-muted-foreground/60">
          Health checks run every 5 minutes • Subscribe to updates via SSE
        </p>
      </div>
    </div>
  );
}
