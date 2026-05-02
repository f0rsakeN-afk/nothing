/**
 * Common Validation Schemas
 * Shared Zod schemas for input validation, SQL injection prevention, and sanitization
 */

import { z } from "zod";

// ================== SQL / NoSQL Injection Prevention ==================

// Dangerous SQL patterns that indicate injection attempts
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|GRANT|REVOKE)\b)/i,
  /(--|;|'|"|\/\*|\*\/|@@|@)/,
  /(\bOR\b.*=|\bAND\b.*=)/i,
  /\bOR\b\s+\d+\s*=\s*\d+/i,
  /\bAND\b\s+\d+\s*=\s*\d+/i,
  /(\bUNION\s+SELECT\b)/i,
  /(HAVING\s+[\w\s]+=)/i,
  /(\bIF\b\s*\()/i,
];

// Patterns for XSS and script injection
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<[^>]*>/gi,
  /&lt;script|&gt;/gi,
  /&#x?[0-9a-f]+;/gi,
];

// Control characters and null bytes
const DANGEROUS_CHARS = /[\x00-\x1F\x7F]/g;

// ================== String Sanitization ==================

/**
 * Sanitize a string to remove potentially dangerous content
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") return "";

  return input
    .replace(DANGEROUS_CHARS, "") // Remove control characters
    .replace(/<script[^>]*>.*?<\/script>/gi, "") // Remove script tags
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, "") // Remove iframes
    .replace(/javascript:/gi, "") // Remove JS protocol
    .replace(/on\w+\s*=/gi, "") // Remove event handlers
    .replace(/&lt;/gi, "&lt;")
    .replace(/&gt;/gi, "&gt;")
    .trim();
}

/**
 * Check if string contains SQL injection patterns
 */
export function containsSqlInjection(input: string): boolean {
  if (typeof input !== "string") return false;

  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) return true;
  }
  return false;
}

/**
 * Check if string contains XSS patterns
 */
export function containsXSS(input: string): boolean {
  if (typeof input !== "string") return false;

  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) return true;
  }
  return false;
}

/**
 * Validate and sanitize a generic string input
 */
export function validateSafeString(
  input: unknown,
  options: {
    minLength?: number;
    maxLength?: number;
    allowEmpty?: boolean;
    trim?: boolean;
  } = {}
): { valid: boolean; sanitized?: string; error?: string } {
  if (typeof input !== "string") {
    return { valid: false, error: "Expected string" };
  }

  let value = options.trim !== false ? input.trim() : input;

  if (!options.allowEmpty && value.length === 0) {
    return { valid: false, error: "String cannot be empty" };
  }

  if (options.minLength && value.length < options.minLength) {
    return { valid: false, error: `Minimum length is ${options.minLength}` };
  }

  if (options.maxLength && value.length > options.maxLength) {
    return { valid: false, error: `Maximum length is ${options.maxLength}` };
  }

  // Sanitize dangerous content
  value = sanitizeString(value);

  return { valid: true, sanitized: value };
}

// ================== Common Schemas ==================

export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const idParamSchema = z.object({
  id: z.string().min(1),
});

// UUID schema for path parameters
export const uuidSchema = z.string().uuid("Invalid ID format");

// Email schema
export const emailSchema = z.string().email("Invalid email").max(255);

// Search query schema
export const searchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  chatId: uuidSchema.optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

// Generic ID with optional UUID validation
export const stringIdSchema = z.union([
  z.string().uuid(),
  z.string().min(1).max(100),
]);

// ================== Validation Result Types ==================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

/**
 * Format Zod validation errors into a consistent structure
 */
export function formatZodErrors<T>(
  result: { success: true; data: T } | { success: false; error: { issues: unknown[] } }
): ValidationResult<T> {
  if (result.success) {
    return { success: true, data: result.data };
  }

  const issues = result.error.issues as Array<{ path: (string | number)[]; message: string }>;
  const errors: ValidationError[] = issues.map((e) => ({
    field: e.path.map(String).join("."),
    message: e.message,
  }));

  return { success: false, errors };
}

// ================== Chat/Message Schemas ==================

export const createChatSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  projectId: uuidSchema.optional(),
  modelId: z.string().optional(),
  systemPromptId: uuidSchema.optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(100000),
  attachments: z.array(z.object({
    fileId: uuidSchema,
    type: z.string(),
  })).max(10).optional(),
  parentMessageId: uuidSchema.optional(),
  chatBranching: z.boolean().optional(),
});

export const updateChatSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  archived: z.boolean().optional(),
});

// ================== Settings Schemas ==================

export const settingsUpdateSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  language: z.string().length(2).optional(),
  timezone: z.string().max(50).optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
  }).optional(),
});
