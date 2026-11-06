import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { fillTemplate, triggerFor, type NormalizedOrder } from "./normalize";
import type { FlowEdge, FlowNode } from "./flow-types";

type DB = SupabaseClient<Database>;
type Settings = Database["public"]["Tables"]["settings"]["Row"];
type Order = Database["public"]["Tables"]["orders"]["Row"];
export type Channel = "whatsapp" | "telegram" | "sms" | "email";

export async function getSettings(db: DB, userId: string): Promise<Settings> {
  const { data } = await db.from("settings").select("*").eq("user_id", userId).maybeSingle();
  if (data) return data;
  const { data: created, error } = await db.from("settings").insert({ user_id: userId }).select("*").single();
  if (error || !created) throw new Error(error?.message ?? "Sem configurações");
  return created;
}

async function serverFor(db: DB, id: string | null) {
  if (!id) return null;
  const { data } = await db.from("render_servers").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function sendMessage(
  db: DB,
  s: Settings,
  p: { channel: Channel; to: string; text: string; subject?: string | undefined; renderServerId?: string | null | undefined; orderId?: string | null | undefined; flowId?: string | null | undefined },
): Promise<{ ok: boolean; error: string }> {
  let ok = false;
  let error = "";
  try {
    if (!p.to) throw new Error("Cliente sem contato para este canal");
    if (p.channel === "telegram") {
      if (!s.telegram_token) throw new Error("Configure o token do bot do Telegram em Configurações");
      const r = await fetch(`https://api.telegram.org/bot${s.telegram_token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: p.to, text: p.text }),
      });
      if (!r.ok) throw new Error(`Telegram ${r.status}: ${(await r.text()).slice(0, 200)}`);
    } else if (p.channel === "email" && !(p.renderServerId ?? s.email_server_id) && process.env["BREVO_API_KEY"]) {
      const lk = process.env["LOVABLE_API_KEY"];
      if (!lk) throw new Error("LOVABLE_API_KEY ausente");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.to)) throw new Error("E-mail do cliente inválido");
      const html = p.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>");
      const r = await fetch("https://connector-gateway.lovable.dev/brevo/smtp/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": process.env["BREVO_API_KEY"] },
        body: JSON.stringify({
          sender: { name: "Marketing Geral", email: "marketinggeralconta@gmail.com" },
          to: [{ email: p.to }],
          subject: p.subject || "Mensagem",
          htmlContent: `<p>${html}</p>`,
        }),
      });
      if (!r.ok) throw new Error(`Brevo ${r.status}: ${(await r.text()).slice(0, 200)}`);
    } else {
      const defaultId = p.channel === "whatsapp" ? s.whatsapp_server_id : p.channel === "sms" ? s.sms_server_id : s.email_server_id;
      const srv = await serverFor(db, p.renderServerId ?? defaultId);
      if (!srv) throw new Error(`Escolha um servidor Render para ${p.channel} em Configurações`);
      const r = await fetch(srv.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(srv.api_key ? { Authorization: `Bearer ${srv.api_key}` } : {}) },
        body: JSON.stringify({ channel: p.channel, to: p.to, message: p.text, subject: p.subject ?? "" }),
      });
      if (!r.ok) throw new Error(`Render ${r.status}: ${(await r.text()).slice(0, 200)}`);
    }
    ok = true;
  } catch (e) {
    error = e instanceof Error ? e.message : "Falha no envio";
  }
  await db.from("messages").insert({
    user_id: s.user_id, channel: p.channel, recipient: p.to || "-", body: p.text, ok, error, order_id: p.orderId ?? null, flow_id: p.flowId ?? null,
  });
  return { ok, error };
}

export async function askAI(s: Settings, messages: { role: "system" | "user" | "assistant"; content: string }[], model?: string) {
  if (!s.ai_base_url) throw new Error("Configure a IA em Configurações");
  const base = s.ai_base_url.replace(/\/$/, "");
  const url = base + (/\/v1$/.test(base) ? "" : "/v1") + "/chat/completions";
  const keys = [s.ai_key, ...String((s as { ai_backup_keys?: string }).ai_backup_keys ?? "").split(/\s+/)].filter((k, i, a) => k && a.indexOf(k) === i);
  if (!keys.length) keys.push("");
  let last = "";
  for (const key of keys) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify({ model: model || s.ai_model, messages, stream: false }),
    });
    const t = await r.text();
    if (r.ok) return String(JSON.parse(t).choices?.[0]?.message?.content ?? "");
    last = `IA ${r.status}: ${t.slice(0, 200)}`;
  }
  throw new Error(last);
}

const recipient = (o: Order, ch: Channel) => (ch === "email" ? o.customer_email : o.customer_phone);

function nextNodes(edges: FlowEdge[], from: string, handle?: string) {
  return edges.filter((e) => e.source === from && (handle === undefined || (e.sourceHandle ?? "out") === handle)).map((e) => e.target);
}

function checkCondition(n: FlowNode, o: Order) {
  const f = n.data.field ?? "status";
  const left = String(o[f as keyof Order] ?? "");
  const right = n.data.value ?? "";
  switch (n.data.op ?? "eq") {
    case "eq": return left === right;
    case "neq": return left !== right;
    case "gt": return Number(left) > Number(right);
    case "lt": return Number(left) < Number(right);
  }
}

// Runs a flow from a node until it hits waits (which are scheduled) or the end.
export async function runFrom(db: DB, s: Settings, flow: { id: string; nodes: FlowNode[]; edges: FlowEdge[] }, orderId: string, startIds: string[], budget = 30) {
  const queue = [...startIds];
  while (queue.length && budget-- > 0) {
    const id = queue.shift()!;
    const n = flow.nodes.find((x) => x.id === id);
    if (!n) continue;
    const { data: o } = await db.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (!o) return;
    switch (n.type) {
      case "trigger":
        queue.push(...nextNodes(flow.edges, n.id));
        break;
      case "wait": {
        const resume = new Date(Date.now() + Math.max(1, n.data.minutes ?? 60) * 60_000).toISOString();
        for (const t of nextNodes(flow.edges, n.id)) {
          await db.from("flow_runs").insert({ user_id: s.user_id, flow_id: flow.id, order_id: orderId, node_id: t, resume_at: resume });
        }
        break;
      }
      case "condition":
        queue.push(...nextNodes(flow.edges, n.id, checkCondition(n, o) ? "yes" : "no"));
        break;
      case "random":
        queue.push(...nextNodes(flow.edges, n.id, Math.random() * 100 < (n.data.percent ?? 50) ? "a" : "b"));
        break;
      case "webhook":
        try {
          await fetch(n.data.url ?? "", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: o }) });
        } catch { /* ignore */ }
        queue.push(...nextNodes(flow.edges, n.id));
        break;
      case "ai": {
        const ch = n.data.channel ?? "whatsapp";
        let text = "";
        try {
          const { data: ag } = n.data.agentId ? await db.from("agents").select("*").eq("id", n.data.agentId).maybeSingle() : { data: null };
          text = await askAI(s, [
            { role: "system", content: ag?.prompt ?? "Você é um vendedor educado. Escreva uma mensagem curta de recuperação de venda." },
            { role: "user", content: `Escreva UMA mensagem curta para o cliente ${o.customer_name} sobre o produto "${o.product}" (${o.value} reais, status ${o.status}). Link: ${o.checkout_url}. ${n.data.text ?? ""}` },
          ]);
        } catch (e) {
          await db.from("messages").insert({ user_id: s.user_id, channel: ch, recipient: "-", body: "(IA)", ok: false, error: e instanceof Error ? e.message : "IA falhou", order_id: o.id, flow_id: flow.id });
        }
        if (text) await sendMessage(db, s, { channel: ch, to: recipient(o, ch), text, orderId: o.id, flowId: flow.id });
        queue.push(...nextNodes(flow.edges, n.id));
        break;
      }
      default: {
        const ch = n.type as Channel;
        await sendMessage(db, s, {
          channel: ch, to: ch === "telegram" ? (n.data.value ?? "") : recipient(o, ch), text: fillTemplate(n.data.text ?? "", o),
          subject: n.data.subject ? fillTemplate(n.data.subject, o) : undefined, orderId: o.id, flowId: flow.id,
        });
        queue.push(...nextNodes(flow.edges, n.id));
      }
    }
  }
}

export async function startFlowsForOrder(db: DB, userId: string, order: Order) {
  const trig = triggerFor(order as unknown as NormalizedOrder);
  if (!trig) return;
  const { data: flows } = await db.from("flows").select("*").eq("user_id", userId).eq("trigger", trig).eq("active", true);
  if (!flows?.length) return;
  const s = await getSettings(db, userId);
  for (const f of flows) {
    const nodes = f.nodes as unknown as FlowNode[];
    const start = nodes.filter((n) => n.type === "trigger").map((n) => n.id);
    await runFrom(db, s, { id: f.id, nodes, edges: f.edges as unknown as FlowEdge[] }, order.id, start);
  }
}

// Picks up scheduled steps whose wait has passed.
export async function processDue(db: DB, userId?: string) {
  let q = db.from("flow_runs").select("*").eq("status", "waiting").lte("resume_at", new Date().toISOString()).limit(50);
  if (userId) q = q.eq("user_id", userId);
  const { data: runs } = await q;
  let done = 0;
  for (const r of runs ?? []) {
    const { data: claimed } = await db.from("flow_runs").update({ status: "done" }).eq("id", r.id).eq("status", "waiting").select("id");
    if (!claimed?.length || !r.order_id || !r.node_id) continue;
    const { data: f } = await db.from("flows").select("*").eq("id", r.flow_id).maybeSingle();
    if (!f?.active) continue;
    const s = await getSettings(db, r.user_id);
    await runFrom(db, s, { id: f.id, nodes: f.nodes as unknown as FlowNode[], edges: f.edges as unknown as FlowEdge[] }, r.order_id, [r.node_id]);
    done++;
  }
  return done;
}

// Two-way chat: an incoming message from Telegram/WhatsApp gets an AI agent reply.
export async function replyWithAgent(db: DB, userId: string, channel: Channel, from: string, text: string) {
  const s = await getSettings(db, userId);
  const { data: agents } = await db.from("agents").select("*").eq("user_id", userId).eq("active", true).contains("channels", [channel]);
  const agent = agents?.[0];
  await db.from("messages").insert({ user_id: userId, channel, recipient: `← ${from}`, body: text, ok: true });
  if (!agent) return;
  const { data: hist } = await db.from("messages").select("recipient, body").eq("user_id", userId).eq("channel", channel)
    .in("recipient", [from, `← ${from}`]).order("created_at", { ascending: false }).limit(12);
  const history = (hist ?? []).reverse().map((m) => ({ role: (m.recipient.startsWith("←") ? "user" : "assistant") as "user" | "assistant", content: m.body }));
  try {
    const reply = await askAI(s, [{ role: "system", content: agent.prompt }, ...history]);
    await sendMessage(db, s, { channel, to: from, text: reply });
  } catch (e) {
    await db.from("messages").insert({ user_id: userId, channel, recipient: from, body: "(IA)", ok: false, error: e instanceof Error ? e.message : "IA falhou" });
  }
}
