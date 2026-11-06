import { createFileRoute } from "@tanstack/react-router";

const UUID = /^[0-9a-f-]{36}$/i;

// Incoming customer messages. Telegram sends updates here (secret in X-Telegram-Bot-Api-Secret-Token);
// your Render WhatsApp server posts { from, text } with header x-batsignal-secret.
export const Route = createFileRoute("/api/public/inbox/$userId/$channel")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        if (!UUID.test(params.userId) || !["telegram", "whatsapp"].includes(params.channel)) return new Response("Not found", { status: 404 });
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const { data: s } = await db.from("settings").select("cron_secret").eq("user_id", params.userId).maybeSingle();
        const sent = request.headers.get("x-telegram-bot-api-secret-token") ?? request.headers.get("x-batsignal-secret") ?? "";
        if (!s || sent !== s.cron_secret) return new Response("Unauthorized", { status: 401 });
        const body = (await request.json().catch(() => ({}))) as { message?: any; edited_message?: any; from?: unknown; phone?: unknown; text?: unknown };
        let from = "";
        let text = "";
        if (params.channel === "telegram") {
          const m = body.message ?? body.edited_message;
          from = String(m?.chat?.id ?? "");
          text = String(m?.text ?? "");
        } else {
          from = String(body.from ?? body.phone ?? "").replace(/\D/g, "");
          text = String(body.text ?? body.message ?? "");
        }
        if (!from || !text) return Response.json({ ok: true, ignored: true });
        const { replyWithAgent } = await import("@/lib/engine.server");
        await replyWithAgent(db, params.userId, params.channel as "telegram" | "whatsapp", from, text.slice(0, 4000));
        return Response.json({ ok: true });
      },
    },
  },
});
