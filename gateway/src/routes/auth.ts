import { Hono } from 'hono';
import { config } from '../config';

const authProxy = new Hono();

/**
 * Auth Service Proxy Router
 * Forwards all /auth/* requests to the Python microservice.
 */
authProxy.all('/*', async (c) => {
  const url = new URL(c.req.url);
  // We want to preserve the segment after /auth
  const targetUrl = `${config.authServiceUrl}${url.pathname}${url.search}`;
  
  console.log(`[Proxy] Routing to Auth Service: ${targetUrl}`);

  try {
    const requestId = c.req.header('x-request-id') || 'gen-' + Date.now();
    const response = await fetch(targetUrl, {
      method: c.req.method,
      headers: {
        ...c.req.raw.headers,
        'X-Request-ID': requestId,
      },
      body: (c.req.method === 'GET' || c.req.method === 'HEAD') ? undefined : c.req.raw.body,
      // @ts-ignore - duplex is needed for streaming but type check may vary by environment
      duplex: 'half',
    } as any);

    return new Response(response.body, response);
  } catch (error: unknown) {
    console.error('[Proxy Error]:', error);
    const message = error instanceof Error ? error.message : 'Unknown proxy error';
    return c.json({ 
      error: 'Upstream Service Unavailable', 
      service: 'auth',
      message
    }, 503);
  }
});

export default authProxy;
