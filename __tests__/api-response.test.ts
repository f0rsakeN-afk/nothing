/**
 * Unit Tests for API Response Utilities
 */

import {
  unauthorizedError,
  notFoundError,
  badRequestError,
  validationError,
  rateLimitError,
  internalError,
  successResponse,
  listResponse,
  createdResponse,
} from "@/lib/api-response";

// Mock NextResponse
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      headers: new Map(Object.entries(init?.headers || {})),
      body,
    })),
  },
}));

describe("Error Responses", () => {
  describe("unauthorizedError", () => {
    it("returns 401 with default message", () => {
      const response = unauthorizedError();
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHORIZED");
      expect(response.body.error.message).toBe("Authentication required");
    });

    it("returns 401 with custom message", () => {
      const response = unauthorizedError("Custom auth message");
      expect(response.status).toBe(401);
      expect(response.body.error.message).toBe("Custom auth message");
    });
  });

  describe("notFoundError", () => {
    it("returns 404 with resource name", () => {
      const response = notFoundError("Chat");
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
      expect(response.body.error.message).toBe("Chat not found");
    });

    it("returns 404 with custom message", () => {
      const response = notFoundError("Chat", "This chat was deleted");
      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe("This chat was deleted");
    });
  });

  describe("badRequestError", () => {
    it("returns 400 with message", () => {
      const response = badRequestError("Invalid input");
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("BAD_REQUEST");
      expect(response.body.error.message).toBe("Invalid input");
    });

    it("includes details when provided", () => {
      const details = { field: "email", issue: "invalid format" };
      const response = badRequestError("Validation failed", details);
      expect(response.body.error.details).toEqual(details);
    });
  });

  describe("validationError", () => {
    it("returns 400 with validation details", () => {
      const issues = [{ path: "email", message: "invalid" }];
      const response = validationError(issues);
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      expect(response.body.error.details).toEqual(issues);
    });
  });

  describe("rateLimitError", () => {
    it("returns 429 with retry-after header", () => {
      const response = rateLimitError(60);
      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe("RATE_LIMITED");
      expect(response.body.error.details.retryAfter).toBe(60);
    });
  });

  describe("internalError", () => {
    it("returns 500 with default message", () => {
      const response = internalError();
      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe("INTERNAL_ERROR");
    });
  });
});

describe("Success Responses", () => {
  describe("successResponse", () => {
    it("returns 200 with data", () => {
      const response = successResponse({ id: "123", name: "Test" });
      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({ id: "123", name: "Test" });
      expect(response.body.meta.timestamp).toBeDefined();
    });

    it("includes requestId when provided", () => {
      const response = successResponse({ id: "123" }, { requestId: "req-456" });
      expect(response.body.meta.requestId).toBe("req-456");
    });
  });

  describe("listResponse", () => {
    it("returns array data with meta", () => {
      const items = [{ id: "1" }, { id: "2" }];
      const response = listResponse(items);
      expect(response.body.data).toEqual(items);
      expect(response.body.meta.timestamp).toBeDefined();
    });

    it("includes pagination when provided", () => {
      const items = [{ id: "1" }];
      const pagination = { nextCursor: "cursor-123", hasMore: true };
      const response = listResponse(items, pagination);
      expect(response.body.pagination).toEqual(pagination);
    });
  });

  describe("createdResponse", () => {
    it("returns 201 with data", () => {
      const response = createdResponse({ id: "123" });
      expect(response.status).toBe(201);
      expect(response.body).toEqual({ id: "123" });
    });

    it("includes Location header when provided", () => {
      const response = createdResponse({ id: "123" }, "/api/chats/123");
      expect(response.headers.get("Location")).toBe("/api/chats/123");
    });
  });
});
