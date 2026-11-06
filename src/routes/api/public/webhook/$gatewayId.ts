import { createFileRoute } from "@tanstack/react-router";
import { normalizeOrder } from "@/lib/normalize";

const UUID = /^[0-9a-f-]{36}$/i;

export const Route = createFileRoute("/api/public/webhook/$gatewayId")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        if (!UUID.test(params.gatewayId)) return new Response("Not found", { status: 404 });
        const raw = await request.text();
        if (raw.length > 500_000) return new Response("Too large", { status: 413 });
        let body: unknown;
        try {
          body = raw.trim().startsWith("{") || raw.trim().startsWith("[") ? JSON.parse(raw) : Object.fromEntries(new URLSearchParams(raw));
        } catch {
          return new Response("Invalid body", { status: 400 });
        }
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const { data: gw } = await db.from("gateways").select("*").eq("id", params.gatewayId).maybeSingle();
        if (!gw || !gw.active) return new Response("Not found", { status: 404 });

        // Platforms that send a token: it must match the one saved in BatSignal.
        if (gw.token) {
          const url = new URL(request.url);
          const h = request.headers;
          const sent = [
            url.searchParams.get("token"), h.get("x-webhook-token"), h.get("x-token"), h.get("x-hotmart-hottok"),
            h.get("authorization")?.replace(/^Bearer\s+/i, ""), h.get("x-api-key"),
            typeof body === "object" && body ? String((body as Record<string, unknown>).token ?? (body as Record<string, unknown>).hottok ?? (body as Record<string, unknown>).secret ?? "") : "",
          ];
          if (!sent.includes(gw.token)) return new Response("Invalid token", { status: 401 });
        }

        const n = normalizeOrder(body);
        const row = { ...n, user_id: gw.user_id, gateway_id: gw.id, raw: body as never, external_id: n.external_id || crypto.randomUUID() };
        const { data: existing } = await db.from("orders").select("id, status").eq("gateway_id", gw.id).eq("external_id", row.external_id).maybeSingle();
        // A previously abandoned / pending order that gets paid counts as recovered.
        const recovered = !!existing && existing.status !== "approved" && n.status === "approved";
        const { data: order, error } = existing
          ? await db.from("orders").update({ ...row, ...(recovered ? { recovered: true } : {}) }).eq("id", existing.id).select("*").single()
          : await db.from("orders").insert(row).select("*").single();
        if (error || !order) return Response.json({ ok: false }, { status: 500 });

        if (!existing || existing.status !== order.status) {
          const { startFlowsForOrder } = await import("@/lib/engine.server");
          await startFlowsForOrder(db, gw.user_id, order);
        }
        return Response.json({ ok: true });
      },
    },
  },
});
