import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const chatInput = z.object({
  baseUrl: z.string().url(),
  apiKey: z.string().max(500).optional(),
  model: z.string().min(1).max(200),
  messages: z.array(z.object({ role: z.enum(["system", "user", "assistant"]), content: z.string().max(20000) })).max(100),
});

// Calls any OpenAI-compatible endpoint (Ollama, OpenRouter, Groq, etc.).
export const chatWithAgent = createServerFn({ method: "POST" })
  .inputValidator((d) => chatInput.parse(d))
  .handler(async ({ data }) => {
    const url = data.baseUrl.replace(/\/$/, "") + (data.baseUrl.includes("/v1") ? "" : "/v1") + "/chat/completions";
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(data.apiKey ? { Authorization: `Bearer ${data.apiKey}` } : {}) },
        body: JSON.stringify({ model: data.model, messages: data.messages, stream: false }),
      });
      const text = await res.text();
      if (!res.ok) return { ok: false as const, error: `Erro ${res.status}: ${text.slice(0, 300)}` };
      const json = JSON.parse(text);
      return { ok: true as const, reply: String(json.choices?.[0]?.message?.content ?? "") };
    } catch (e) {
      return { ok: false as const, error: `Não consegui acessar a IA em ${url}. ${e instanceof Error ? e.message : ""}` };
    }
  });

const sendInput = z.object({
  channel: z.enum(["telegram", "whatsapp", "sms", "email"]),
  to: z.string().min(1).max(200),
  text: z.string().min(1).max(4000),
  telegramToken: z.string().max(200).optional(),
  url: z.string().max(500).optional(),
  apiKey: z.string().max(500).optional(),
});

export const sendTestMessage = createServerFn({ method: "POST" })
  .inputValidator((d) => sendInput.parse(d))
  .handler(async ({ data }) => {
    try {
      let res: Response;
      if (data.channel === "telegram") {
        if (!data.telegramToken) return { ok: false, error: "Configure o token do bot do Telegram." };
        res = await fetch(`https://api.telegram.org/bot${data.telegramToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: data.to, text: data.text }),
        });
      } else {
        if (!data.url) return { ok: false, error: "Configure a URL do seu servidor no Render." };
        res = await fetch(data.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(data.apiKey ? { Authorization: `Bearer ${data.apiKey}` } : {}) },
          body: JSON.stringify({ channel: data.channel, to: data.to, message: data.text }),
        });
      }
      const body = await res.text();
      return res.ok ? { ok: true, error: "" } : { ok: false, error: `Erro ${res.status}: ${body.slice(0, 300)}` };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Falha no envio" };
    }
  });
