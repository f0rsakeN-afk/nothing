/**
 * lib/index.ts — Shared utilities barrel export
 *
 * Import from here for convenience. Direct imports from submodules are also fine.
 * Prisma and Redis are always imported directly at usage sites to avoid circular issues.
 */

export * from "./admin";
export * from "./validations";

// Utilities
export { cn, randomUUID } from "./utils";
