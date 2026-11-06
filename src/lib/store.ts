import { useSyncExternalStore } from "react";

export type Channel = "whatsapp" | "telegram" | "sms" | "email";
export type CartStatus = "abandonado" | "recuperado" | "perdido";

export type Cart = {
  id: string;
  customer: string;
  phone: string;
  email: string;
  product: string;
  value: number;
  gateway: string;
  status: CartStatus;
  createdAt: string;
  messages: number;
};

export type Agent = {
  id: string;
  name: string;
  role: "suporte" | "recuperacao";
  model: string;
  prompt: string;
  channels: Channel[];
  active: boolean;
};

export type FlowStep =
  | { id: string; type: "wait"; minutes: number }
  | { id: string; type: "send"; channel: Channel; text: string }
  | { id: string; type: "agent"; agentId: string };

export type Flow = {
  id: string;
  name: string;
  trigger: "carrinho_abandonado" | "pix_gerado" | "boleto_gerado" | "compra_aprovada" | "reembolso";
  active: boolean;
  steps: FlowStep[];
};

export type Gateway = { id: string; name: string; token: string; createdAt: string };

export type Settings = {
  telegramToken: string;
  whatsappUrl: string;
  whatsappKey: string;
  smsUrl: string;
  emailUrl: string;
  aiBaseUrl: string;
  aiKey: string;
  aiModel: string;
};

export type State = {
  carts: Cart[];
  agents: Agent[];
  flows: Flow[];
  gateways: Gateway[];
  settings: Settings;
};

const uid = () => Math.random().toString(36).slice(2, 10);
export { uid };

const names = ["Ana Souza", "Bruno Lima", "Carla Dias", "Diego Rocha", "Elisa Prado", "Felipe Nunes", "Gabi Torres", "Hugo Martins", "Isabela Reis", "João Pedro"];
const products = ["Curso Tráfego Pago", "Mentoria Vendas", "Ebook Receitas Fit", "Kit Skincare", "Plano Anual Pro"];
const gws = ["Kirvano", "Lastlink", "PerfectPay", "Cakto"];
const statuses: CartStatus[] = ["abandonado", "recuperado", "abandonado", "perdido", "recuperado", "abandonado"];

const seed: State = {
  carts: names.map((n, i) => ({
    id: uid(),
    customer: n,
    phone: `5511999${String(100000 + i * 7311).slice(0, 6)}`,
    email: n.toLowerCase().replace(" ", ".") + "@email.com",
    product: products[i % products.length]!,
    value: [197, 497, 47, 289, 997][i % 5]!,
    gateway: gws[i % gws.length]!,
    status: statuses[i % statuses.length]!,
    createdAt: new Date(Date.UTC(2026, 10, 6 - (i % 7), 10 + i)).toISOString(),
    messages: (i % 4) + 1,
  })),
  agents: [
    {
      id: "ag1",
      name: "Lia — Recuperação",
      role: "recuperacao",
      model: "llama3.1",
      prompt: "Você é a Lia, consultora simpática. Ajude o cliente a concluir a compra, tire dúvidas e ofereça o link de pagamento. Seja breve.",
      channels: ["whatsapp", "telegram"],
      active: true,
    },
    {
      id: "ag2",
      name: "Max — Suporte",
      role: "suporte",
      model: "llama3.1",
      prompt: "Você é o Max, atendente de suporte. Responda dúvidas sobre acesso, entrega e reembolso com educação.",
      channels: ["whatsapp"],
      active: true,
    },
  ],
  flows: [
    {
      id: "fl1",
      name: "Recuperação de carrinho",
      trigger: "carrinho_abandonado",
      active: true,
      steps: [
        { id: "s1", type: "wait", minutes: 15 },
        { id: "s2", type: "send", channel: "whatsapp", text: "Oi {nome}! Vi que você não finalizou {produto}. Posso ajudar? {link}" },
        { id: "s3", type: "wait", minutes: 60 },
        { id: "s4", type: "send", channel: "email", text: "Seu carrinho ainda está te esperando 🛒" },
        { id: "s5", type: "agent", agentId: "ag1" },
      ],
    },
    {
      id: "fl2",
      name: "Pix gerado não pago",
      trigger: "pix_gerado",
      active: false,
      steps: [
        { id: "p1", type: "wait", minutes: 10 },
        { id: "p2", type: "send", channel: "whatsapp", text: "{nome}, seu Pix está pronto! Copie o código: {pix}" },
      ],
    },
  ],
  gateways: [{ id: "gw_" + "demo1234", name: "Kirvano", token: "", createdAt: new Date(Date.UTC(2026, 10, 1)).toISOString() }],
  settings: {
    telegramToken: "",
    whatsappUrl: "",
    whatsappKey: "",
    smsUrl: "",
    emailUrl: "",
    aiBaseUrl: "http://localhost:11434",
    aiKey: "",
    aiModel: "llama3.1",
  },
};

const KEY = "vendas-em-conversa:v1";
let state: State = seed;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...seed, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
}

export function setState(fn: (s: State) => State) {
  load();
  state = fn(state);
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      if (!loaded) {
        load();
        cb();
      }
      return () => listeners.delete(cb);
    },
    () => sel(state),
    () => sel(seed),
  );
}

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const channelLabel: Record<Channel, string> = { whatsapp: "WhatsApp", telegram: "Telegram", sms: "SMS", email: "E-mail" };
export const triggerLabel: Record<Flow["trigger"], string> = {
  carrinho_abandonado: "Carrinho abandonado",
  pix_gerado: "Pix gerado",
  boleto_gerado: "Boleto gerado",
  compra_aprovada: "Compra aprovada",
  reembolso: "Reembolso",
};
