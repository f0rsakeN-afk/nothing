"use client";

import { memo, useMemo, useState, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  BackgroundVariant,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import {
  Monitor,
  Server,
  Database,
  Zap,
  Layers,
  Globe,
  GitBranch,
  Shield,
  HardDrive,
  Cpu,
  ExternalLink as ExternalLinkIcon,
  Maximize2,
  Columns2,
  Network,
  X,
  Smartphone,
  Key,
  Lock,
  Search,
  Mail,
  Cloud,
  Archive,
  Activity,
  BarChart2,
  FileText,
  Clock,
  Bell,
  Box,
  Package,
  Wifi,
  CreditCard,
  MessageSquare,
  Code2,
  Users,
  RefreshCw,
  Image,
  PlayCircle,
  BrainCircuit,
  ScrollText,
  Radio,
  Webhook,
  Fingerprint,
  PlugZap,
  FlaskConical,
  Gauge,
  GitMerge,
  Terminal,
  TableProperties,
  Pyramid,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";
import { useSplitView } from "../split-view-context";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTitle,
} from "@/components/ui/dialog";

// ── Node type configuration ────────────────────────────────────────────────

type NodeConfig = {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  border: string;
  bg: string;
  label: string;
};

const NODE_CONFIG: Record<string, NodeConfig> = {
  // ── Clients & Frontend ──────────────────────────────────────────────────
  client:           { icon: Monitor,          color: "#3b82f6", border: "rgba(59,130,246,0.4)",   bg: "rgba(59,130,246,0.08)",   label: "Client" },
  browser:          { icon: Globe,            color: "#3b82f6", border: "rgba(59,130,246,0.4)",   bg: "rgba(59,130,246,0.08)",   label: "Browser" },
  web:              { icon: Globe,            color: "#3b82f6", border: "rgba(59,130,246,0.4)",   bg: "rgba(59,130,246,0.08)",   label: "Web App" },
  mobile:           { icon: Smartphone,       color: "#60a5fa", border: "rgba(96,165,250,0.4)",   bg: "rgba(96,165,250,0.08)",   label: "Mobile App" },
  app:              { icon: Smartphone,       color: "#60a5fa", border: "rgba(96,165,250,0.4)",   bg: "rgba(96,165,250,0.08)",   label: "App" },
  iot:              { icon: PlugZap,          color: "#22d3ee", border: "rgba(34,211,238,0.4)",   bg: "rgba(34,211,238,0.08)",   label: "IoT Device" },
  desktop:          { icon: Monitor,          color: "#7dd3fc", border: "rgba(125,211,252,0.4)",  bg: "rgba(125,211,252,0.08)",  label: "Desktop App" },

  // ── Servers & Services ──────────────────────────────────────────────────
  server:           { icon: Server,           color: "#10b981", border: "rgba(16,185,129,0.4)",   bg: "rgba(16,185,129,0.08)",   label: "Server" },
  service:          { icon: Server,           color: "#10b981", border: "rgba(16,185,129,0.4)",   bg: "rgba(16,185,129,0.08)",   label: "Service" },
  microservice:     { icon: Server,           color: "#34d399", border: "rgba(52,211,153,0.4)",   bg: "rgba(52,211,153,0.08)",   label: "Microservice" },
  worker:           { icon: Cpu,              color: "#ec4899", border: "rgba(236,72,153,0.4)",   bg: "rgba(236,72,153,0.08)",   label: "Worker" },
  scheduler:        { icon: Clock,            color: "#a78bfa", border: "rgba(167,139,250,0.4)",  bg: "rgba(167,139,250,0.08)",  label: "Scheduler" },
  cron:             { icon: Clock,            color: "#a78bfa", border: "rgba(167,139,250,0.4)",  bg: "rgba(167,139,250,0.08)",  label: "Cron Job" },
  batch:            { icon: Layers,           color: "#818cf8", border: "rgba(129,140,248,0.4)",  bg: "rgba(129,140,248,0.08)",  label: "Batch Job" },
  lambda:           { icon: Zap,              color: "#f97316", border: "rgba(249,115,22,0.4)",   bg: "rgba(249,115,22,0.08)",   label: "Lambda" },
  function:         { icon: Zap,              color: "#f97316", border: "rgba(249,115,22,0.4)",   bg: "rgba(249,115,22,0.08)",   label: "Function" },
  serverless:       { icon: Cloud,            color: "#c084fc", border: "rgba(192,132,252,0.4)",  bg: "rgba(192,132,252,0.08)",  label: "Serverless" },
  graphql:          { icon: Code2,            color: "#e879f9", border: "rgba(232,121,249,0.4)",  bg: "rgba(232,121,249,0.08)",  label: "GraphQL" },
  grpc:             { icon: PlugZap,          color: "#4ade80", border: "rgba(74,222,128,0.4)",   bg: "rgba(74,222,128,0.08)",   label: "gRPC" },
  websocket:        { icon: Wifi,             color: "#38bdf8", border: "rgba(56,189,248,0.4)",   bg: "rgba(56,189,248,0.08)",   label: "WebSocket" },
  ws:               { icon: Wifi,             color: "#38bdf8", border: "rgba(56,189,248,0.4)",   bg: "rgba(56,189,248,0.08)",   label: "WebSocket" },

  // ── Gateways, Proxies & Networking ─────────────────────────────────────
  apigateway:       { icon: Shield,           color: "#6366f1", border: "rgba(99,102,241,0.4)",   bg: "rgba(99,102,241,0.08)",   label: "API Gateway" },
  gateway:          { icon: Shield,           color: "#6366f1", border: "rgba(99,102,241,0.4)",   bg: "rgba(99,102,241,0.08)",   label: "API Gateway" },
  loadbalancer:     { icon: GitBranch,        color: "#14b8a6", border: "rgba(20,184,166,0.4)",   bg: "rgba(20,184,166,0.08)",   label: "Load Balancer" },
  lb:               { icon: GitBranch,        color: "#14b8a6", border: "rgba(20,184,166,0.4)",   bg: "rgba(20,184,166,0.08)",   label: "Load Balancer" },
  cdn:              { icon: Globe,            color: "#06b6d4", border: "rgba(6,182,212,0.4)",    bg: "rgba(6,182,212,0.08)",    label: "CDN" },
  proxy:            { icon: GitMerge,         color: "#0ea5e9", border: "rgba(14,165,233,0.4)",   bg: "rgba(14,165,233,0.08)",   label: "Proxy" },
  reverseproxy:     { icon: GitMerge,         color: "#0ea5e9", border: "rgba(14,165,233,0.4)",   bg: "rgba(14,165,233,0.08)",   label: "Reverse Proxy" },
  dns:              { icon: Network,          color: "#67e8f9", border: "rgba(103,232,249,0.4)",  bg: "rgba(103,232,249,0.08)",  label: "DNS" },
  firewall:         { icon: Shield,           color: "#ef4444", border: "rgba(239,68,68,0.4)",    bg: "rgba(239,68,68,0.08)",    label: "Firewall" },
  nginx:            { icon: Server,           color: "#4ade80", border: "rgba(74,222,128,0.4)",   bg: "rgba(74,222,128,0.08)",   label: "Nginx" },

  // ── Databases ───────────────────────────────────────────────────────────
  database:         { icon: Database,         color: "#8b5cf6", border: "rgba(139,92,246,0.4)",   bg: "rgba(139,92,246,0.08)",   label: "Database" },
  db:               { icon: Database,         color: "#8b5cf6", border: "rgba(139,92,246,0.4)",   bg: "rgba(139,92,246,0.08)",   label: "Database" },
  postgres:         { icon: Database,         color: "#336791", border: "rgba(51,103,145,0.4)",   bg: "rgba(51,103,145,0.08)",   label: "PostgreSQL" },
  postgresql:       { icon: Database,         color: "#336791", border: "rgba(51,103,145,0.4)",   bg: "rgba(51,103,145,0.08)",   label: "PostgreSQL" },
  mysql:            { icon: Database,         color: "#f97316", border: "rgba(249,115,22,0.4)",   bg: "rgba(249,115,22,0.08)",   label: "MySQL" },
  mongodb:          { icon: Database,         color: "#10b981", border: "rgba(16,185,129,0.4)",   bg: "rgba(16,185,129,0.08)",   label: "MongoDB" },
  mongo:            { icon: Database,         color: "#10b981", border: "rgba(16,185,129,0.4)",   bg: "rgba(16,185,129,0.08)",   label: "MongoDB" },
  cassandra:        { icon: Database,         color: "#1d9bf0", border: "rgba(29,155,240,0.4)",   bg: "rgba(29,155,240,0.08)",   label: "Cassandra" },
  dynamodb:         { icon: Database,         color: "#f59e0b", border: "rgba(245,158,11,0.4)",   bg: "rgba(245,158,11,0.08)",   label: "DynamoDB" },
  sqlite:           { icon: Database,         color: "#64748b", border: "rgba(100,116,139,0.4)",  bg: "rgba(100,116,139,0.08)",  label: "SQLite" },
  clickhouse:       { icon: Database,         color: "#facc15", border: "rgba(250,204,21,0.4)",   bg: "rgba(250,204,21,0.08)",   label: "ClickHouse" },
  neo4j:            { icon: Network,          color: "#4f8ef7", border: "rgba(79,142,247,0.4)",   bg: "rgba(79,142,247,0.08)",   label: "Neo4j" },
  timeseries:       { icon: BarChart2,        color: "#f43f5e", border: "rgba(244,63,94,0.4)",    bg: "rgba(244,63,94,0.08)",    label: "Time Series DB" },
  influxdb:         { icon: BarChart2,        color: "#22d3ee", border: "rgba(34,211,238,0.4)",   bg: "rgba(34,211,238,0.08)",   label: "InfluxDB" },
  vectordb:         { icon: Pyramid,          color: "#a855f7", border: "rgba(168,85,247,0.4)",   bg: "rgba(168,85,247,0.08)",   label: "Vector DB" },
  vector:           { icon: Pyramid,          color: "#a855f7", border: "rgba(168,85,247,0.4)",   bg: "rgba(168,85,247,0.08)",   label: "Vector DB" },

  // ── Cache ───────────────────────────────────────────────────────────────
  cache:            { icon: Zap,              color: "#f59e0b", border: "rgba(245,158,11,0.4)",   bg: "rgba(245,158,11,0.08)",   label: "Cache" },
  redis:            { icon: Zap,              color: "#ef4444", border: "rgba(239,68,68,0.4)",    bg: "rgba(239,68,68,0.08)",    label: "Redis" },
  memcached:        { icon: Zap,              color: "#60a5fa", border: "rgba(96,165,250,0.4)",   bg: "rgba(96,165,250,0.08)",   label: "Memcached" },

  // ── Message Queues & Streaming ──────────────────────────────────────────
  queue:            { icon: Layers,           color: "#f97316", border: "rgba(249,115,22,0.4)",   bg: "rgba(249,115,22,0.08)",   label: "Queue" },
  broker:           { icon: Layers,           color: "#f97316", border: "rgba(249,115,22,0.4)",   bg: "rgba(249,115,22,0.08)",   label: "Broker" },
  kafka:            { icon: Layers,           color: "#1e293b", border: "rgba(30,41,59,0.5)",     bg: "rgba(30,41,59,0.08)",     label: "Kafka" },
  rabbitmq:         { icon: Layers,           color: "#f97316", border: "rgba(249,115,22,0.4)",   bg: "rgba(249,115,22,0.08)",   label: "RabbitMQ" },
  sqs:              { icon: Layers,           color: "#ff9900", border: "rgba(255,153,0,0.4)",    bg: "rgba(255,153,0,0.08)",    label: "SQS" },
  pubsub:           { icon: Radio,            color: "#3b82f6", border: "rgba(59,130,246,0.4)",   bg: "rgba(59,130,246,0.08)",   label: "Pub/Sub" },
  eventbus:         { icon: Radio,            color: "#8b5cf6", border: "rgba(139,92,246,0.4)",   bg: "rgba(139,92,246,0.08)",   label: "Event Bus" },
  stream:           { icon: RefreshCw,        color: "#06b6d4", border: "rgba(6,182,212,0.4)",    bg: "rgba(6,182,212,0.08)",    label: "Stream" },
  webhook:          { icon: Webhook,          color: "#7c3aed", border: "rgba(124,58,237,0.4)",   bg: "rgba(124,58,237,0.08)",   label: "Webhook" },

  // ── Storage & Files ─────────────────────────────────────────────────────
  storage:          { icon: HardDrive,        color: "#64748b", border: "rgba(100,116,139,0.4)",  bg: "rgba(100,116,139,0.08)",  label: "Storage" },
  objectstorage:    { icon: Cloud,            color: "#f97316", border: "rgba(249,115,22,0.4)",   bg: "rgba(249,115,22,0.08)",   label: "Object Storage" },
  s3:               { icon: Cloud,            color: "#f97316", border: "rgba(249,115,22,0.4)",   bg: "rgba(249,115,22,0.08)",   label: "S3" },
  bucket:           { icon: Cloud,            color: "#f97316", border: "rgba(249,115,22,0.4)",   bg: "rgba(249,115,22,0.08)",   label: "Bucket" },
  fileserver:       { icon: Archive,          color: "#78716c", border: "rgba(120,113,108,0.4)",  bg: "rgba(120,113,108,0.08)",  label: "File Server" },
  blobstorage:      { icon: Cloud,            color: "#0ea5e9", border: "rgba(14,165,233,0.4)",   bg: "rgba(14,165,233,0.08)",   label: "Blob Storage" },

  // ── Infrastructure & Cloud ──────────────────────────────────────────────
  vm:               { icon: Server,           color: "#94a3b8", border: "rgba(148,163,184,0.4)",  bg: "rgba(148,163,184,0.08)",  label: "VM" },
  ec2:              { icon: Server,           color: "#f97316", border: "rgba(249,115,22,0.4)",   bg: "rgba(249,115,22,0.08)",   label: "EC2" },
  container:        { icon: Package,          color: "#2563eb", border: "rgba(37,99,235,0.4)",    bg: "rgba(37,99,235,0.08)",    label: "Container" },
  docker:           { icon: Package,          color: "#2563eb", border: "rgba(37,99,235,0.4)",    bg: "rgba(37,99,235,0.08)",    label: "Docker" },
  kubernetes:       { icon: Box,              color: "#326ce5", border: "rgba(50,108,229,0.4)",   bg: "rgba(50,108,229,0.08)",   label: "Kubernetes" },
  k8s:              { icon: Box,              color: "#326ce5", border: "rgba(50,108,229,0.4)",   bg: "rgba(50,108,229,0.08)",   label: "Kubernetes" },
  pod:              { icon: Box,              color: "#60a5fa", border: "rgba(96,165,250,0.4)",   bg: "rgba(96,165,250,0.08)",   label: "Pod" },
  cluster:          { icon: Network,          color: "#6366f1", border: "rgba(99,102,241,0.4)",   bg: "rgba(99,102,241,0.08)",   label: "Cluster" },

  // ── Auth & Security ─────────────────────────────────────────────────────
  auth:             { icon: Key,              color: "#f59e0b", border: "rgba(245,158,11,0.4)",   bg: "rgba(245,158,11,0.08)",   label: "Auth Service" },
  oauth:            { icon: Key,              color: "#f59e0b", border: "rgba(245,158,11,0.4)",   bg: "rgba(245,158,11,0.08)",   label: "OAuth" },
  jwt:              { icon: Lock,             color: "#a78bfa", border: "rgba(167,139,250,0.4)",  bg: "rgba(167,139,250,0.08)",  label: "JWT" },
  vault:            { icon: Lock,             color: "#ef4444", border: "rgba(239,68,68,0.4)",    bg: "rgba(239,68,68,0.08)",    label: "Vault" },
  idp:              { icon: Fingerprint,      color: "#8b5cf6", border: "rgba(139,92,246,0.4)",   bg: "rgba(139,92,246,0.08)",   label: "Identity Provider" },
  sso:              { icon: Users,            color: "#0ea5e9", border: "rgba(14,165,233,0.4)",   bg: "rgba(14,165,233,0.08)",   label: "SSO" },

  // ── Observability ───────────────────────────────────────────────────────
  monitoring:       { icon: Activity,         color: "#10b981", border: "rgba(16,185,129,0.4)",   bg: "rgba(16,185,129,0.08)",   label: "Monitoring" },
  logging:          { icon: ScrollText,       color: "#94a3b8", border: "rgba(148,163,184,0.4)",  bg: "rgba(148,163,184,0.08)",  label: "Logging" },
  tracing:          { icon: GitBranch,        color: "#c084fc", border: "rgba(192,132,252,0.4)",  bg: "rgba(192,132,252,0.08)",  label: "Tracing" },
  alerting:         { icon: Bell,             color: "#ef4444", border: "rgba(239,68,68,0.4)",    bg: "rgba(239,68,68,0.08)",    label: "Alerting" },
  metrics:          { icon: Gauge,            color: "#f59e0b", border: "rgba(245,158,11,0.4)",   bg: "rgba(245,158,11,0.08)",   label: "Metrics" },
  dashboard:        { icon: BarChart2,        color: "#3b82f6", border: "rgba(59,130,246,0.4)",   bg: "rgba(59,130,246,0.08)",   label: "Dashboard" },
  prometheus:       { icon: Activity,         color: "#e05c2e", border: "rgba(224,92,46,0.4)",    bg: "rgba(224,92,46,0.08)",    label: "Prometheus" },
  grafana:          { icon: BarChart2,        color: "#f57c00", border: "rgba(245,124,0,0.4)",    bg: "rgba(245,124,0,0.08)",    label: "Grafana" },

  // ── Search ──────────────────────────────────────────────────────────────
  search:           { icon: Search,           color: "#f59e0b", border: "rgba(245,158,11,0.4)",   bg: "rgba(245,158,11,0.08)",   label: "Search" },
  elasticsearch:    { icon: Search,           color: "#f0bf1a", border: "rgba(240,191,26,0.4)",   bg: "rgba(240,191,26,0.08)",   label: "Elasticsearch" },
  elastic:          { icon: Search,           color: "#f0bf1a", border: "rgba(240,191,26,0.4)",   bg: "rgba(240,191,26,0.08)",   label: "Elasticsearch" },
  opensearch:       { icon: Search,           color: "#003b6f", border: "rgba(0,59,111,0.4)",     bg: "rgba(0,59,111,0.08)",     label: "OpenSearch" },

  // ── AI & ML ─────────────────────────────────────────────────────────────
  ai:               { icon: BrainCircuit,     color: "#a855f7", border: "rgba(168,85,247,0.4)",   bg: "rgba(168,85,247,0.08)",   label: "AI Model" },
  ml:               { icon: BrainCircuit,     color: "#a855f7", border: "rgba(168,85,247,0.4)",   bg: "rgba(168,85,247,0.08)",   label: "ML Model" },
  model:            { icon: BrainCircuit,     color: "#a855f7", border: "rgba(168,85,247,0.4)",   bg: "rgba(168,85,247,0.08)",   label: "Model" },
  llm:              { icon: BrainCircuit,     color: "#7c3aed", border: "rgba(124,58,237,0.4)",   bg: "rgba(124,58,237,0.08)",   label: "LLM" },
  embedding:        { icon: Pyramid,          color: "#8b5cf6", border: "rgba(139,92,246,0.4)",   bg: "rgba(139,92,246,0.08)",   label: "Embeddings" },
  featurestore:     { icon: TableProperties,  color: "#10b981", border: "rgba(16,185,129,0.4)",   bg: "rgba(16,185,129,0.08)",   label: "Feature Store" },
  experiment:       { icon: FlaskConical,     color: "#f43f5e", border: "rgba(244,63,94,0.4)",    bg: "rgba(244,63,94,0.08)",    label: "Experiment" },

  // ── Communication Services ──────────────────────────────────────────────
  email:            { icon: Mail,             color: "#3b82f6", border: "rgba(59,130,246,0.4)",   bg: "rgba(59,130,246,0.08)",   label: "Email Service" },
  smtp:             { icon: Mail,             color: "#3b82f6", border: "rgba(59,130,246,0.4)",   bg: "rgba(59,130,246,0.08)",   label: "SMTP" },
  sms:              { icon: MessageSquare,    color: "#10b981", border: "rgba(16,185,129,0.4)",   bg: "rgba(16,185,129,0.08)",   label: "SMS" },
  notification:     { icon: Bell,             color: "#f59e0b", border: "rgba(245,158,11,0.4)",   bg: "rgba(245,158,11,0.08)",   label: "Notifications" },
  push:             { icon: Bell,             color: "#6366f1", border: "rgba(99,102,241,0.4)",   bg: "rgba(99,102,241,0.08)",   label: "Push Service" },

  // ── Payments & Third-party ──────────────────────────────────────────────
  payment:          { icon: CreditCard,       color: "#10b981", border: "rgba(16,185,129,0.4)",   bg: "rgba(16,185,129,0.08)",   label: "Payment" },
  external:         { icon: ExternalLinkIcon, color: "#9ca3af", border: "rgba(156,163,175,0.4)",  bg: "rgba(156,163,175,0.08)",  label: "External" },
  thirdparty:       { icon: ExternalLinkIcon, color: "#9ca3af", border: "rgba(156,163,175,0.4)",  bg: "rgba(156,163,175,0.08)",  label: "3rd Party" },

  // ── Data & ETL ──────────────────────────────────────────────────────────
  etl:              { icon: RefreshCw,        color: "#f97316", border: "rgba(249,115,22,0.4)",   bg: "rgba(249,115,22,0.08)",   label: "ETL" },
  pipeline:         { icon: RefreshCw,        color: "#06b6d4", border: "rgba(6,182,212,0.4)",    bg: "rgba(6,182,212,0.08)",    label: "Pipeline" },
  datawarehouse:    { icon: Database,         color: "#6366f1", border: "rgba(99,102,241,0.4)",   bg: "rgba(99,102,241,0.08)",   label: "Data Warehouse" },
  datalake:         { icon: Database,         color: "#0ea5e9", border: "rgba(14,165,233,0.4)",   bg: "rgba(14,165,233,0.08)",   label: "Data Lake" },
  analytics:        { icon: BarChart2,        color: "#8b5cf6", border: "rgba(139,92,246,0.4)",   bg: "rgba(139,92,246,0.08)",   label: "Analytics" },

  // ── Media ───────────────────────────────────────────────────────────────
  media:            { icon: PlayCircle,       color: "#ef4444", border: "rgba(239,68,68,0.4)",    bg: "rgba(239,68,68,0.08)",    label: "Media Server" },
  imageprocessor:   { icon: Image,            color: "#a855f7", border: "rgba(168,85,247,0.4)",   bg: "rgba(168,85,247,0.08)",   label: "Image Processor" },
  transcoder:       { icon: PlayCircle,       color: "#f97316", border: "rgba(249,115,22,0.4)",   bg: "rgba(249,115,22,0.08)",   label: "Transcoder" },

  // ── Dev Tools ───────────────────────────────────────────────────────────
  ci:               { icon: RefreshCw,        color: "#10b981", border: "rgba(16,185,129,0.4)",   bg: "rgba(16,185,129,0.08)",   label: "CI/CD" },
  registry:         { icon: Archive,          color: "#64748b", border: "rgba(100,116,139,0.4)",  bg: "rgba(100,116,139,0.08)",  label: "Registry" },
  cli:              { icon: Terminal,         color: "#94a3b8", border: "rgba(148,163,184,0.4)",  bg: "rgba(148,163,184,0.08)",  label: "CLI" },
  sdk:              { icon: Code2,            color: "#7dd3fc", border: "rgba(125,211,252,0.4)",  bg: "rgba(125,211,252,0.08)",  label: "SDK" },
  docs:             { icon: FileText,         color: "#94a3b8", border: "rgba(148,163,184,0.4)",  bg: "rgba(148,163,184,0.08)",  label: "Docs" },
};

const DEFAULT_CONFIG: NodeConfig = {
  icon: Network,
  color: "#6b7280",
  border: "rgba(107,114,128,0.4)",
  bg: "rgba(107,114,128,0.08)",
  label: "Service",
};

function getNodeConfig(type?: string): NodeConfig {
  return NODE_CONFIG[(type ?? "").toLowerCase()] ?? DEFAULT_CONFIG;
}

// ── Handle style helper ────────────────────────────────────────────────────

function handleStyle(color: string) {
  return {
    background: color,
    width: 7,
    height: 7,
    border: "2px solid hsl(var(--background))",
    minWidth: 0,
    minHeight: 0,
  };
}

// ── Custom node — handles on all 4 sides ───────────────────────────────────

const SystemNode = memo(function SystemNode({ data }: NodeProps) {
  const cfg = getNodeConfig(data.nodeType as string);
  const Icon = cfg.icon;
  const hs = handleStyle(cfg.color);

  return (
    <div
      className="rounded-xl border px-3 py-2.5 min-w-[120px] max-w-[175px] shadow-sm backdrop-blur-sm cursor-grab active:cursor-grabbing select-none"
      style={{ borderColor: cfg.border, backgroundColor: cfg.bg }}
    >
      {/* Four target handles */}
      <Handle id="target-top"    type="target" position={Position.Top}    style={hs} />
      <Handle id="target-right"  type="target" position={Position.Right}  style={hs} />
      <Handle id="target-bottom" type="target" position={Position.Bottom} style={hs} />
      <Handle id="target-left"   type="target" position={Position.Left}   style={hs} />

      <div className="flex items-center gap-2">
        <div
          className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center"
          style={{ backgroundColor: `${cfg.color}22` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
        </div>
        <span className="text-[11.5px] font-semibold text-foreground leading-tight line-clamp-2">
          {data.label as string}
        </span>
      </div>

      {!!data.description && (
        <p className="text-[10.5px] text-muted-foreground/60 mt-1.5 leading-tight line-clamp-2 pl-8">
          {String(data.description)}
        </p>
      )}

      {/* Four source handles */}
      <Handle id="source-top"    type="source" position={Position.Top}    style={hs} />
      <Handle id="source-right"  type="source" position={Position.Right}  style={hs} />
      <Handle id="source-bottom" type="source" position={Position.Bottom} style={hs} />
      <Handle id="source-left"   type="source" position={Position.Left}   style={hs} />
    </div>
  );
});

const nodeTypes = { systemNode: SystemNode };

// ── Resolve a CSS custom property to its actual computed value ────────────
//
// `hsl(var(--border))` does NOT resolve inside SVG <marker> or <path> fill/
// stroke attributes — they render as solid black. We read the actual value
// via getComputedStyle so we can pass concrete color strings to ReactFlow.

function useCssColors() {
  const { resolvedTheme } = useTheme();
  return useMemo(() => {
    if (typeof document === "undefined") {
      return { border: "#e2e8f0", primary: "#6366f1", mutedFg: "#71717a", bg: "#ffffff", card: "#ffffff" };
    }
    const s = getComputedStyle(document.documentElement);
    const get = (v: string) => s.getPropertyValue(v).trim();
    return {
      border:   get("--border")            || "#e2e8f0",
      primary:  get("--primary")           || "#6366f1",
      mutedFg:  get("--muted-foreground")  || "#71717a",
      bg:       get("--background")        || "#ffffff",
      card:     get("--card")              || "#ffffff",
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTheme]);
}

// ── Flow canvas ────────────────────────────────────────────────────────────

const FlowCanvas = memo(function FlowCanvas({ rfNodes, rfEdges }: { rfNodes: Node[]; rfEdges: Edge[] }) {
  const [nodes, , onNodesChange] = useNodesState(rfNodes);
  const [edgeState, , onEdgesChange] = useEdgesState(rfEdges);
  const { resolvedTheme } = useTheme();
  const c = useCssColors();

  // Apply resolved colors to edges at render time (CSS vars don't work in SVG attrs)
  const coloredEdges = useMemo(
    () =>
      edgeState.map((e) => ({
        ...e,
        type: "smoothstep",
        style: { stroke: e.animated ? c.primary : c.border, strokeWidth: 1.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: e.animated ? c.primary : c.border,
          width: 14,
          height: 14,
        },
        labelStyle: { fontSize: 10, fill: c.mutedFg },
        labelShowBg: !!e.label,
        labelBgStyle: { fill: c.bg, fillOpacity: 0.85 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
      })),
    [edgeState, c],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={coloredEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      colorMode={resolvedTheme === "dark" ? "dark" : "light"}
      fitView
      fitViewOptions={{ padding: 0.25, maxZoom: 1.2 }}
      minZoom={0.2}
      maxZoom={3}
      proOptions={{ hideAttribution: true }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={20}
        size={1.5}
        color={c.border}
      />
      <Controls
        showInteractive={false}
        style={{
          background: c.card,
          border: `1px solid ${c.border}`,
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        }}
      />
      <MiniMap
        style={{
          background: c.card,
          border: `1px solid ${c.border}`,
          borderRadius: 8,
          overflow: "hidden",
        }}
        nodeColor={(node) => getNodeConfig(node.data?.nodeType as string).color}
        maskColor="rgba(0,0,0,0.15)"
        zoomable
        pannable
      />
    </ReactFlow>
  );
});

// ── Data parsing ────────────────────────────────────────────────────────────

interface RawNode {
  id: string;
  type?: string;
  label?: string;
  description?: string;
  x?: number;
  y?: number;
}

interface RawEdge {
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

interface DiagramData {
  title?: string;
  description?: string;
  nodes: RawNode[];
  edges?: RawEdge[];
}

/**
 * Picks the best source/target handle pair based on relative node positions,
 * so edges always exit and enter from the nearest side of each node.
 *
 *  dx dominant → horizontal: right→left or left→right
 *  dy dominant → vertical:   bottom→top or top→bottom
 */
function bestHandles(
  srcPos: { x: number; y: number },
  tgtPos: { x: number; y: number },
): { sourceHandle: string; targetHandle: string } {
  const dx = tgtPos.x - srcPos.x;
  const dy = tgtPos.y - srcPos.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    // Horizontal dominant
    return dx >= 0
      ? { sourceHandle: "source-right", targetHandle: "target-left" }
      : { sourceHandle: "source-left",  targetHandle: "target-right" };
  } else {
    // Vertical dominant
    return dy >= 0
      ? { sourceHandle: "source-bottom", targetHandle: "target-top" }
      : { sourceHandle: "source-top",    targetHandle: "target-bottom" };
  }
}

function buildFlowData(parsed: DiagramData) {
  const posMap = new Map<string, { x: number; y: number }>();
  parsed.nodes.forEach((n) => posMap.set(n.id, { x: n.x ?? 0, y: n.y ?? 0 }));

  const rfNodes: Node[] = parsed.nodes.map((n) => ({
    id: n.id,
    type: "systemNode",
    position: { x: n.x ?? 0, y: n.y ?? 0 },
    data: {
      label: n.label ?? n.id,
      nodeType: n.type ?? "service",
      description: n.description,
    },
  }));

  const rfEdges: Edge[] = (parsed.edges ?? []).map((e, i) => {
    const src = posMap.get(e.source) ?? { x: 0, y: 0 };
    const tgt = posMap.get(e.target) ?? { x: 0, y: 0 };
    const { sourceHandle, targetHandle } = bestHandles(src, tgt);

    return {
      id: `${e.source}→${e.target}-${i}`,
      source: e.source,
      target: e.target,
      sourceHandle,
      targetHandle,
      label: e.label,
      animated: e.animated ?? false,
    };
  });

  return { rfNodes, rfEdges };
}

// ── Legend ─────────────────────────────────────────────────────────────────

const NodeLegend = memo(function NodeLegend({ nodes }: { nodes: RawNode[] }) {
  const usedTypes = useMemo(() => {
    const seen = new Set<string>();
    nodes.forEach((n) => seen.add((n.type ?? "service").toLowerCase()));
    return Array.from(seen);
  }, [nodes]);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2 border-b border-border/40 bg-muted/10">
      {usedTypes.map((type) => {
        const cfg = getNodeConfig(type);
        const Icon = cfg.icon;
        return (
          <div key={type} className="flex items-center gap-1.5">
            <Icon className="w-3 h-3 shrink-0" style={{ color: cfg.color }} />
            <span className="text-[10.5px] text-muted-foreground">{cfg.label}</span>
          </div>
        );
      })}
      <div className="flex items-center gap-x-3 gap-y-1 ml-auto">
        <div className="flex items-center gap-1">
          <div className="w-5" style={{ borderTop: "1.5px solid hsl(var(--border))" }} />
          <span className="text-[10px] text-muted-foreground/60">sync</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-5" style={{ borderTop: "1.5px dashed hsl(var(--primary))" }} />
          <span className="text-[10px] text-muted-foreground/60">async</span>
        </div>
      </div>
    </div>
  );
});

// ── Panel canvas — used by both fullscreen overlay and split panel ─────────

export function SystemDesignCanvas({
  data,
  nodes,
}: {
  data: string;
  nodes: RawNode[];
}) {
  const parsed = useMemo((): DiagramData | null => {
    try {
      const p = JSON.parse(data);
      if (!Array.isArray(p?.nodes)) return null;
      return p as DiagramData;
    } catch {
      return null;
    }
  }, [data]);

  const { rfNodes, rfEdges } = useMemo(() => {
    if (!parsed) return { rfNodes: [], rfEdges: [] };
    return buildFlowData(parsed);
  }, [parsed]);

  if (!parsed) return null;

  return (
    <div className="flex flex-col h-full">
      <NodeLegend nodes={nodes} />
      <div className="flex-1 min-h-0">
        <FlowCanvas rfNodes={rfNodes} rfEdges={rfEdges} />
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────

export const SystemDesignDiagram = memo(function SystemDesignDiagram({
  data,
}: {
  data: string;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const splitView = useSplitView();

  const parsed = useMemo((): DiagramData | null => {
    try {
      const p = JSON.parse(data);
      if (!Array.isArray(p?.nodes)) return null;
      return p as DiagramData;
    } catch {
      return null;
    }
  }, [data]);

  const { rfNodes, rfEdges } = useMemo(() => {
    if (!parsed) return { rfNodes: [], rfEdges: [] };
    return buildFlowData(parsed);
  }, [parsed]);

  if (!parsed) return <CodeBlock language="json">{data}</CodeBlock>;

  const isSplit =
    splitView?.splitView?.rawData === data;

  const toggleSplitView = useCallback(() => {
    if (!splitView) return;
    if (isSplit) {
      splitView.closeSplitView();
    } else {
      splitView.openSplitView({
        title: parsed.title,
        description: parsed.description,
        rawData: data,
      });
    }
  }, [splitView, isSplit, parsed]);

  const openFullscreen = useCallback(() => {
    setFullscreen(true);
  }, []);

  return (
    <>
      {/* ── Inline card ─────────────────────────────────────── */}
      <div className="my-6 rounded-xl border border-border bg-card/50 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
              <Network className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[13px] font-semibold text-foreground leading-tight truncate">
                {parsed.title || "System Design"}
              </h4>
              {parsed.description && (
                <p className="text-[11px] text-muted-foreground/70 leading-tight mt-0.5 truncate">
                  {parsed.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-3">
            {/* Split button — only shown when context is available */}
            {splitView && (
              <button
                onClick={toggleSplitView}
                className={cn(
                  "flex items-center gap-1.5",
                  "text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors",
                  isSplit
                    ? "text-primary bg-primary/10 hover:bg-primary/15"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                <Columns2 className="w-3.5 h-3.5" />
                {isSplit ? "Close Split" : "Split"}
              </button>
            )}

            <button
              onClick={openFullscreen}
              className={cn(
                "flex items-center gap-1.5",
                "text-[11px] font-medium text-muted-foreground hover:text-foreground",
                "px-2.5 py-1.5 rounded-lg hover:bg-muted/60 transition-colors",
              )}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Expand
            </button>
          </div>
        </div>

        <NodeLegend nodes={parsed.nodes} />

        <div className="h-[460px] w-full">
          <FlowCanvas rfNodes={rfNodes} rfEdges={rfEdges} />
        </div>
      </div>

      {/* ── Fullscreen dialog ───────────────────────────────── */}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Popup className="fixed inset-0 z-50 flex flex-col bg-background/96 backdrop-blur-md outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card/60 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Network className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-sm font-semibold text-foreground truncate">
                    {parsed.title || "System Design"}
                  </DialogTitle>
                  {parsed.description && (
                    <p className="text-xs text-muted-foreground/70 truncate">
                      {parsed.description}
                    </p>
                  )}
                </div>
              </div>
              <DialogClose
                className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                aria-label="Close fullscreen"
              >
                <X className="w-4 h-4" />
              </DialogClose>
            </div>

            <SystemDesignCanvas data={data} nodes={parsed.nodes} />
          </DialogPrimitive.Popup>
        </DialogPortal>
      </Dialog>
    </>
  );
});
