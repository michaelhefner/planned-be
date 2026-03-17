// Minimal Cloudflare Module Worker entry for the project.
// This file intentionally avoids importing any Node built-ins or Express.
// It provides a small shim with a default export (module worker) so Wrangler
// will treat this package as an ES Module Worker instead of a Service Worker.

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url)

    // Simple health endpoint to mirror the Express /health route.
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Fallback response with guidance. Replace this with real handlers or
    // use a lightweight Worker framework (Hono, Miniflare-compatible frameworks).
    const body = `This is a Cloudflare Worker entry. The repository also contains an Express app
which cannot run inside a Worker. Port endpoints here or deploy the Express app
to a Node runtime (e.g. Cloud Run, Vercel, Fly).`;

    return new Response(body, { status: 200 })
  }
}

/*
Notes and next steps to port your API to a Worker:
- Replace Express routers with direct Request handlers, or use a Worker-first
  framework like Hono (https://hono.dev/) which has an Express-like API.
- Move only code that doesn't rely on Node builtins (fs, net, http, etc.) into
  the worker bundle. Prisma and many Node-only libs won't run in Workers.
- If you need Prisma, keep the Express app and deploy it to a Node platform (Cloud Run, Vercel Serverless Functions, Fly, etc.).
*/
