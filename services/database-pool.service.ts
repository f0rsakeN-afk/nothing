/**
 * Database Connection Pool Configuration
 *
 * For Prisma with PostgreSQL, connection pool is configured via DATABASE_URL:
 * postgresql://user:pass@host:5432/db?connection_limit=N&pool_timeout=M&connection_timeout=C
 *
 * Default Prisma pool settings work for development, but production needs tuning.
 */

/**
 * Recommended pool settings by deployment size:
 *
 * Small (1x 2GB RAM):
 *   connection_limit=10
 *   pool_timeout=10
 *   connection_timeout=30
 *
 * Medium (2x 4GB RAM):
 *   connection_limit=20
 *   pool_timeout=15
 *   connection_timeout=30
 *
 * Large (4x 8GB RAM +):
 *   connection_limit=50
 *   pool_timeout=20
 *   connection_timeout=30
 *
 * Kubernetes (auto-scaling):
 *   connection_limit=5 (per pod, be conservative)
 *   pool_timeout=10
 *   connection_timeout=15
 */

/**
 * Parse current DATABASE_URL and return pool configuration
 */
export interface PoolConfig {
  connectionLimit: number;
  poolTimeout: number;
  connectionTimeout: number;
  host: string;
  port: number;
  database: string;
  user: string;
}

export function parsePoolConfig(databaseUrl?: string): PoolConfig {
  const url = databaseUrl || process.env.DATABASE_URL || "";

  try {
    const parsed = new URL(url);

    return {
      connectionLimit: parseInt(parsed.searchParams.get("connection_limit") || "5", 10),
      poolTimeout: parseInt(parsed.searchParams.get("pool_timeout") || "10", 10),
      connectionTimeout: parseInt(parsed.searchParams.get("connection_timeout") || "30", 10),
      host: parsed.hostname || "localhost",
      port: parseInt(parsed.port || "5432", 10),
      database: parsed.pathname.replace("/", "") || "postgres",
      user: parsed.username || "postgres",
    };
  } catch {
    return {
      connectionLimit: 5,
      poolTimeout: 10,
      connectionTimeout: 30,
      host: "localhost",
      port: 5432,
      database: "postgres",
      user: "postgres",
    };
  }
}

/**
 * Build DATABASE_URL with pool settings
 */
export function buildDatabaseUrl(config: {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  connectionLimit?: number;
  poolTimeout?: number;
  connectionTimeout?: number;
}): string {
  const url = new URL(`postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`);

  if (config.connectionLimit) {
    url.searchParams.set("connection_limit", String(config.connectionLimit));
  }
  if (config.poolTimeout) {
    url.searchParams.set("pool_timeout", String(config.poolTimeout));
  }
  if (config.connectionTimeout) {
    url.searchParams.set("connection_timeout", String(config.connectionTimeout));
  }

  return url.toString();
}

/**
 * Validate database connectivity and pool health
 * Returns stats that can be used for monitoring
 */
export async function getPoolHealth(): Promise<{
  healthy: boolean;
  config: PoolConfig;
  timestamp: string;
}> {
  const config = parsePoolConfig();

  try {
    // Simple connectivity check
    const start = Date.now();
    const response = await fetch(`${process.env.DATABASE_URL?.replace(/\?.*/, "")}/health`, {
      signal: AbortSignal.timeout(5000),
    }).catch(() => null);

    return {
      healthy: response?.ok ?? false,
      config,
      timestamp: new Date().toISOString(),
    };
  } catch {
    return {
      healthy: false,
      config,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Recommended settings for different use cases
 */
export interface PoolPreset {
  connectionLimit: number;
  poolTimeout: number;
  connectionTimeout: number;
}

export const POOL_PRESETS: Record<string, PoolPreset> = {
  development: {
    connectionLimit: 5,
    poolTimeout: 10,
    connectionTimeout: 30,
  },
  smallProduction: {
    connectionLimit: 10,
    poolTimeout: 10,
    connectionTimeout: 30,
  },
  mediumProduction: {
    connectionLimit: 20,
    poolTimeout: 15,
    connectionTimeout: 30,
  },
  largeProduction: {
    connectionLimit: 50,
    poolTimeout: 20,
    connectionTimeout: 30,
  },
  kubernetes: {
    connectionLimit: 5,
    poolTimeout: 10,
    connectionTimeout: 15,
  },
};

/**
 * Get environment-appropriate preset
 */
export function getPoolPreset(): PoolPreset {
  const env = process.env.NODE_ENV || "development";

  if (env === "production") {
    const replicas = parseInt(process.env.KUBERNETES_REPLICAS || "1", 10);
    if (replicas > 2) {
      return POOL_PRESETS.kubernetes;
    }
    if (replicas > 1) {
      return POOL_PRESETS.smallProduction;
    }
    return POOL_PRESETS.mediumProduction;
  }

  return POOL_PRESETS.development;
}
