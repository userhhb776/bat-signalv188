import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { askAI, getSettings, processDue, sendMessage } from "./engine.server";

export const chatWithAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      prompt: z.string().max(20000),
      messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(20000) })).max(100),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    try {
      const s = await getSettings(context.supabase, context.userId);
      const reply = await askAI(s, [{ role: "system", content: data.prompt }, ...data.messages]);
      return { ok: true as const, reply, error: "" };
    } catch (e) {
      return { ok: false as const, reply: "", error: e instanceof Error ? e.message : "Falha na IA" };
    }
  });

export const sendTestMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      channel: z.enum(["telegram", "whatsapp", "sms", "email"]),
      to: z.string().min(1).max(200),
      text: z.string().min(1).max(4000),
      renderServerId: z.string().uuid().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const s = await getSettings(context.supabase, context.userId);
    return sendMessage(context.supabase, s, data);
  });

export const runDueSteps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({ processed: await processDue(context.supabase, context.userId) }));

export const connectTelegram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ origin: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const s = await getSettings(context.supabase, context.userId);
    if (!s.telegram_token) return { ok: false, error: "Salve o token do bot primeiro" };
    const r = await fetch(`https://api.telegram.org/bot${s.telegram_token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: `${data.origin}/api/public/inbox/${context.userId}/telegram`, secret_token: s.cron_secret, allowed_updates: ["message"] }),
    });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    return j.ok ? { ok: true, error: "" } : { ok: false, error: j.description ?? `Erro ${r.status}` };
  });
