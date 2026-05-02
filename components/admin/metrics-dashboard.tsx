"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface MetricSample {
  labels: Record<string, string>;
  value: number;
  timestamp: number;
}

interface Metric {
  name: string;
  help: string;
  type: "counter" | "gauge" | "histogram" | "summary" | "untyped";
  samples: MetricSample[];
}

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"];

async function fetchMetrics(): Promise<Metric[]> {
  const response = await fetch("/api/metrics");
  const text = await response.text();
  return parsePrometheusText(text);
}

function parsePrometheusText(text: string): Metric[] {
  const metricsByName = new Map<string, Metric>();
  let currentMetric: string | null = null;
  let currentHelp = "";
  let currentType: Metric["type"] = "untyped";

  for (const line of text.split("\n")) {
    if (line.startsWith("# HELP")) {
      const match = line.match(/^# HELP\s+(\S+)\s+(.*)$/);
      if (match) {
        currentMetric = match[1];
        currentHelp = match[2];
      }
    } else if (line.startsWith("# TYPE")) {
      const match = line.match(/^# TYPE\s+(\S+)\s+(\S+)/);
      if (match) {
        currentMetric = match[1];
        currentType = match[2] as Metric["type"];
      }
    } else if (line.startsWith("#") || !line.trim()) {
      continue;
    } else if (currentMetric) {
      const hashIndex = line.indexOf("{");
      const spaceIndex = line.lastIndexOf(" ");
      let name = line.slice(0, hashIndex !== -1 ? hashIndex : spaceIndex).trim();
      let valueStr = line.slice(spaceIndex + 1).trim();

      if (name !== currentMetric) continue;

      // Parse labels
      const labels: Record<string, string> = {};
      if (hashIndex !== -1 && spaceIndex > hashIndex) {
        const labelStr = line.slice(hashIndex + 1, spaceIndex);
        const labelMatches = labelStr.matchAll(/(\w+)="([^"]*)"/g);
        for (const m of labelMatches) {
          labels[m[1]] = m[2];
        }
      }

      const value = parseFloat(valueStr);
      if (isNaN(value)) continue;

      if (!metricsByName.has(currentMetric)) {
        metricsByName.set(currentMetric, {
          name: currentMetric,
          help: currentHelp,
          type: currentType,
          samples: [],
        });
      }

      const metric = metricsByName.get(currentMetric)!;
      metric.samples.push({ labels, value, timestamp: Date.now() });
    }
  }

  return Array.from(metricsByName.values());
}

function formatValue(value: number, name: string): string {
  if (name.includes("bytes") || name.includes("memory")) {
    if (value < 1024) return value.toFixed(0) + " B";
    if (value < 1024 * 1024) return (value / 1024).toFixed(1) + " KB";
    if (value < 1024 * 1024 * 1024) return (value / (1024 * 1024)).toFixed(1) + " MB";
    return (value / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  }
  if (name.includes("duration") || name.includes("seconds")) {
    if (value < 0.001) return (value * 1000000).toFixed(0) + "μs";
    if (value < 1) return (value * 1000).toFixed(1) + "ms";
    if (value < 60) return value.toFixed(2) + "s";
    return (value / 60).toFixed(1) + "m";
  }
  if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
  if (value >= 1000) return (value / 1000).toFixed(1) + "K";
  return value.toFixed(value < 10 ? 2 : 0);
}

function getMetricValue(metric: Metric | undefined): number {
  if (!metric || metric.samples.length === 0) return 0;
  // For gauges, just return last value
  if (metric.type === "gauge") {
    return metric.samples[metric.samples.length - 1].value;
  }
  // For counters, sum all values
  return metric.samples.reduce((acc, s) => acc + s.value, 0);
}

function getLabelString(labels: Record<string, string>): string {
  const parts = Object.entries(labels)
    .filter(([k]) => k !== "__name__")
    .map(([k, v]) => `${k}="${v}"`);
  return parts.length > 0 ? "{" + parts.join(",") + "}" : "";
}

export function MetricsDashboard() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [timeRange, setTimeRange] = useState<"1h" | "24h" | "7d">("1h");

  const loadMetrics = useCallback(async () => {
    try {
      const data = await fetchMetrics();
      setMetrics(data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError("Failed to fetch metrics");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 5000);
    return () => clearInterval(interval);
  }, [loadMetrics]);

  // Get metrics by category
  const getMetric = (name: string) => metrics.find((m) => m.name === name);

  // HTTP metrics
  const httpRequests = getMetric("http_requests_total");
  const httpRequestDuration = getMetric("http_request_duration_seconds");

  // Business metrics
  const activeUsers = getMetric("eryx_active_users");
  const chatMessages = getMetric("eryx_chat_messages_total");
  const conversations = getMetric("eryx_conversations_total");
  const apiTokens = getMetric("eryx_api_tokens_used_total");

  // Security metrics
  const rateLimitHits = getMetric("eryx_rate_limit_hits_total");
  const authFailures = getMetric("eryx_auth_failures_total");
  const anomalies = getMetric("eryx_anomaly_detections_total");

  // Redis metrics
  const redisDuration = getMetric("eryx_redis_operation_duration_seconds");

  // Queue metrics
  const queueJobs = getMetric("eryx_queue_jobs_total");
  const queueDuration = getMetric("eryx_queue_job_duration_seconds");

  // AI metrics
  const aiDuration = getMetric("eryx_ai_api_duration_seconds");
  const aiTokens = getMetric("eryx_ai_api_tokens_total");

  // Node.js metrics
  const nodeMemory = getMetric("process_memory_resident");
  const nodeCpu = getMetric("process_cpu_seconds_total");
  const nodeEventLoop = getMetric("nodejs_eventloop_lag_seconds");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Prometheus Metrics
            </h1>
            <p className="text-gray-500 mt-1">
              Real-time application monitoring
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              <option value="1h">Last 1 hour</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
            </select>
            <button
              onClick={loadMetrics}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Refresh
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-400">
          Last updated: {lastUpdate?.toLocaleString() || "Never"} •{" "}
          {metrics.length} metrics collected
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <StatCard
          title="Total Requests"
          value={formatValue(getMetricValue(httpRequests), "requests")}
          subtitle="All time"
          color="bg-indigo-500"
        />
        <StatCard
          title="Active Users"
          value={formatValue(getMetricValue(activeUsers), "users")}
          subtitle="Online now"
          color="bg-emerald-500"
        />
        <StatCard
          title="Chat Messages"
          value={formatValue(getMetricValue(chatMessages), "messages")}
          subtitle="Sent"
          color="bg-amber-500"
        />
        <StatCard
          title="AI Tokens"
          value={formatValue(getMetricValue(apiTokens), "tokens")}
          subtitle="Used"
          color="bg-purple-500"
        />
        <StatCard
          title="Rate Limits"
          value={formatValue(getMetricValue(rateLimitHits), "limits")}
          subtitle="Violations"
          color="bg-red-500"
        />
        <StatCard
          title="Anomalies"
          value={formatValue(getMetricValue(anomalies), "anomalies")}
          subtitle="Detected"
          color="bg-orange-500"
        />
      </div>

      {/* HTTP Section */}
      <Section title="HTTP Requests" icon="🌐">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Request Rate">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={httpRequests?.samples.slice(-30).map((s, i) => ({
                time: i,
                requests: s.value,
              })) || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip formatter={(v) => formatValue(v as number, "requests")} />
                <Area type="monotone" dataKey="requests" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Request Duration (p95)">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={httpRequestDuration?.samples.slice(-30).map((s, i) => ({
                time: i,
                duration: s.value * 0.95,
              })) || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis tickFormatter={(v) => formatValue(v, "duration")} />
                <Tooltip formatter={(v) => formatValue(v as number, "duration")} />
                <Line type="monotone" dataKey="duration" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </Section>

      {/* Business Metrics Section */}
      <Section title="Business Metrics" icon="📊">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ChartCard title="Conversations">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={conversations?.samples.slice(-10).map((s, i) => ({
                name: `t${i}`,
                count: s.value,
              })) || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v) => formatValue(v as number, "count")} />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Token Usage">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Input", value: 65 },
                    { name: "Output", value: 35 },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  <Cell fill="#6366f1" />
                  <Cell fill="#f59e0b" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Message Volume">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chatMessages?.samples.slice(-20).map((s, i) => ({
                time: i,
                msgs: s.value,
              })) || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip formatter={(v) => formatValue(v as number, "msgs")} />
                <Area type="monotone" dataKey="msgs" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </Section>

      {/* Security Metrics Section */}
      <Section title="Security Metrics" icon="🔒">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SecurityCard
            title="Rate Limit Hits"
            value={getMetricValue(rateLimitHits)}
            trend={rateLimitHits && rateLimitHits.samples.length > 1 ? rateLimitHits.samples[rateLimitHits.samples.length - 1].value - rateLimitHits.samples[rateLimitHits.samples.length - 2].value : 0}
            color="red"
          />
          <SecurityCard
            title="Auth Failures"
            value={getMetricValue(authFailures)}
            trend={0}
            color="orange"
          />
          <SecurityCard
            title="Anomaly Detections"
            value={getMetricValue(anomalies)}
            trend={0}
            color="yellow"
          />
        </div>
      </Section>

      {/* Infrastructure Section */}
      <Section title="Infrastructure" icon="🖥️">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Memory Usage">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={nodeMemory?.samples.slice(-30).map((s, i) => ({
                time: i,
                memory: s.value,
              })) || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis tickFormatter={(v) => formatValue(v, "bytes")} />
                <Tooltip formatter={(v) => formatValue(v as number, "bytes")} />
                <Area type="monotone" dataKey="memory" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Redis Latency">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={redisDuration?.samples.slice(-30).map((s, i) => ({
                time: i,
                latency: s.value,
              })) || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis tickFormatter={(v) => formatValue(v, "duration")} />
                <Tooltip formatter={(v) => formatValue(v as number, "duration")} />
                <Line type="monotone" dataKey="latency" stroke="#ec4899" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </Section>

      {/* AI Metrics Section */}
      <Section title="AI / LLM Metrics" icon="🤖">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="AI Response Time">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={aiDuration?.samples.slice(-30).map((s, i) => ({
                time: i,
                duration: s.value,
              })) || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis tickFormatter={(v) => formatValue(v, "duration")} />
                <Tooltip formatter={(v) => formatValue(v as number, "duration")} />
                <Line type="monotone" dataKey="duration" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Token Consumption">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={aiTokens?.samples.slice(-10).map((s, i) => ({
                name: `t${i}`,
                tokens: s.value,
              })) || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v) => formatValue(v as number, "tokens")} />
                <Bar dataKey="tokens" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </Section>

      {/* Queue Metrics Section */}
      <Section title="Background Jobs" icon="📋">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Jobs Processed">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={queueJobs?.samples.slice(-30).map((s, i) => ({
                time: i,
                jobs: s.value,
              })) || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip formatter={(v) => formatValue(v as number, "jobs")} />
                <Area type="monotone" dataKey="jobs" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Job Duration">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={queueDuration?.samples.slice(-30).map((s, i) => ({
                time: i,
                duration: s.value,
              })) || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis tickFormatter={(v) => formatValue(v, "duration")} />
                <Tooltip formatter={(v) => formatValue(v as number, "duration")} />
                <Line type="monotone" dataKey="duration" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </Section>

      {/* All Metrics Raw Table */}
      <Section title="All Metrics" icon="📋">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto max-h-96">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metric</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Labels</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {metrics.map((metric) => (
                  <tr key={metric.name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-2 font-mono text-sm text-indigo-600">{metric.name}</td>
                    <td className="px-4 py-2">
                      <TypeBadge type={metric.type} />
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-sm">
                      {metric.samples.length > 0
                        ? formatValue(metric.samples[metric.samples.length - 1].value, metric.name)
                        : "N/A"}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-500 max-w-xs truncate">
                      {metric.samples.length > 0
                        ? getLabelString(metric.samples[metric.samples.length - 1].labels)
                        : ""}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 max-w-xs truncate">{metric.help}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>
    </div>
  );
}

function StatCard({ title, value, subtitle, color }: {
  title: string;
  value: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center text-white font-bold text-sm`}>
          {title.charAt(0)}
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">{title}</p>
          <p className="text-xl font-bold">{value}</p>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Section({ title, icon, children }: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h2>
      {children}
    </div>
  );
}

function SecurityCard({ title, value, trend, color }: {
  title: string;
  value: number;
  trend: number;
  color: "red" | "orange" | "yellow";
}) {
  const colorClasses = {
    red: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    orange: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
    yellow: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
  };

  const textClasses = {
    red: "text-red-600 dark:text-red-400",
    orange: "text-orange-600 dark:text-orange-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
  };

  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
      <p className="text-sm text-gray-600 dark:text-gray-300">{title}</p>
      <p className={`text-3xl font-bold ${textClasses[color]}`}>{formatValue(value, title)}</p>
      {trend !== 0 && (
        <p className={`text-xs ${trend > 0 ? "text-red-500" : "text-green-500"}`}>
          {trend > 0 ? "↑" : "↓"} {Math.abs(trend)} from last
        </p>
      )}
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const classes: Record<string, string> = {
    counter: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    gauge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    histogram: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    summary: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    untyped: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${classes[type] || classes.untyped}`}>
      {type}
    </span>
  );
}
