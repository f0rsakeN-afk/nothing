// Maps known MCP server URLs to their icon identifiers for the hugeicons library
export const MCP_COMPONENT_ICON_URLS = new Set([
  'https://api.githubcopilot.com/mcp',           // GitHub
  'https://mcp.linear.app/mcp',                   // Linear
  'https://mcp.notion.com/mcp',                   // Notion
  'https://mcp.slack.com/mcp',                    // Slack
  'https://mcp.supabase.com/mcp',                 // Supabase
  'https://mcp.stripe.com/',                       // Stripe
  'https://mcp.vercel.com',                       // Vercel
  'https://mcp.sentry.dev/sse',                   // Sentry
  'https://mcp.heroku.com/mcp',                   // Heroku
  'https://mcp.postgres.com/mcp',                 // Postgres
]);

export function getMcpCatalogIcon(url: string): string | null {
  const normalized = url.toLowerCase().replace(/\/$/, '');
  return null; // We rely on favicons and the MCP_COMPONENT_ICON_URLS set for now
}
