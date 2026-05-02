/**
 * Metrics Dashboard Page
 * /admin/metrics - Prometheus metrics visualization
 */

import { MetricsDashboard } from "@/components/admin/metrics-dashboard";

export const dynamic = "force-dynamic";

export default function MetricsPage() {
  return <MetricsDashboard />;
}
