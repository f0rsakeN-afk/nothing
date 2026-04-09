/**
 * OpenAPI 3.0 Specification
 * API documentation for Eryx
 */

export const openAPISpec = {
  openapi: "3.0.3",
  info: {
    title: "Eryx API",
    description: "API for the Eryx chat platform",
    version: "1.0.0",
    contact: {
      email: "support@eryx.ai",
    },
  },
  servers: [
    {
      url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      description: "Production server",
    },
  ],
  tags: [
    { name: "chats", description: "Chat management" },
    { name: "projects", description: "Project management" },
    { name: "messages", description: "Message operations" },
    { name: "search", description: "Web search" },
    { name: "health", description: "Health checks" },
  ],
  paths: {
    "/api/health": {
      get: {
        tags: ["health"],
        summary: "Health check",
        description: "Check API health status",
        responses: {
          "200": {
            description: "Healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "operational" },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
          "503": {
            description: "Service unavailable",
          },
        },
      },
    },
    "/api/chats": {
      get: {
        tags: ["chats"],
        summary: "List user's chats",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 50, default: 20 },
          },
          {
            name: "cursor",
            in: "query",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "List of chats",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    chats: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Chat" },
                    },
                    nextCursor: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["chats"],
        summary: "Create a new chat",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  projectId: { type: "string" },
                  firstMessage: { type: "string", maxLength: 10000 },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Chat created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Chat" },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "429": { description: "Rate limited" },
        },
      },
    },
    "/api/chats/{id}": {
      get: {
        tags: ["chats"],
        summary: "Get a chat by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Chat details" },
          "401": { description: "Unauthorized" },
          "404": { description: "Chat not found" },
        },
      },
      patch: {
        tags: ["chats"],
        summary: "Update a chat",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string", maxLength: 200 },
                  archivedAt: { type: "string", format: "date-time", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Chat updated" },
          "401": { description: "Unauthorized" },
          "404": { description: "Chat not found" },
        },
      },
      delete: {
        tags: ["chats"],
        summary: "Delete a chat",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Chat deleted" },
          "401": { description: "Unauthorized" },
          "404": { description: "Chat not found" },
        },
      },
    },
    "/api/chats/{id}/messages": {
      get: {
        tags: ["messages"],
        summary: "Get chat messages",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
          { name: "cursor", in: "query", schema: { type: "string" } },
          {
            name: "direction",
            in: "query",
            schema: { type: "string", enum: ["before", "after"] },
          },
        ],
        responses: {
          "200": { description: "Messages list" },
          "401": { description: "Unauthorized" },
          "404": { description: "Chat not found" },
        },
      },
      post: {
        tags: ["messages"],
        summary: "Add message to chat",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["role", "content"],
                properties: {
                  role: { type: "string", enum: ["user", "assistant"] },
                  content: { type: "string", maxLength: 100000 },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Message created" },
          "401": { description: "Unauthorized" },
          "404": { description: "Chat not found" },
        },
      },
    },
    "/api/search": {
      post: {
        tags: ["search"],
        summary: "Perform web search",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["query"],
                properties: {
                  query: { type: "string", maxLength: 1000 },
                  webSearch: { type: "boolean", default: true },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Search results" },
          "401": { description: "Unauthorized" },
          "429": { description: "Rate limited" },
        },
      },
    },
    "/api/projects": {
      get: {
        tags: ["projects"],
        summary: "List user's projects",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "List of projects" },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["projects"],
        summary: "Create a project",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", minLength: 2, maxLength: 50 },
                  description: { type: "string", maxLength: 1000 },
                  instruction: { type: "string", maxLength: 5000 },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Project created" },
          "401": { description: "Unauthorized" },
          "429": { description: "Rate limited" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Chat: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          projectId: { type: "string", nullable: true },
          messageCount: { type: "integer" },
          firstMessagePreview: { type: "string", nullable: true },
        },
      },
      Message: {
        type: "object",
        properties: {
          id: { type: "string" },
          role: { type: "string", enum: ["user", "assistant"] },
          content: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Project: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          instruction: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
};
