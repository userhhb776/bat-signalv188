import { createFileRoute } from "@tanstack/react-router";

// Called every minute by an external scheduler (e.g. cron-job.org) with ?secret=<chave da sua conta>.
async function handle(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret") ?? request.headers.get("x-cron-secret") ?? "";
  if (!/^[0-9a-f]{32}$/.test(secret)) return new Response("Unauthorized", { status: 401 });
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data: s } = await db.from("settings").select("user_id").eq("cron_secret", secret).maybeSingle();
  if (!s) return new Response("Unauthorized", { status: 401 });
  const { processDue } = await import("@/lib/engine.server");
  const done = await processDue(db, s.user_id);
  return Response.json({ ok: true, processed: done });
}

export const Route = createFileRoute("/api/public/cron")({
  server: { handlers: { GET: ({ request }) => handle(request), POST: ({ request }) => handle(request) } },
});
