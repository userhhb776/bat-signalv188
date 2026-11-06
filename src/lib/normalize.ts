// Pure helpers to turn any gateway webhook payload into a BatSignal order.
export type OrderStatus = "approved" | "pending" | "abandoned" | "refunded" | "chargeback" | "canceled";
export type PayMethod = "cartao" | "boleto" | "pix" | "outro";

export type NormalizedOrder = {
  external_id: string;
  event: string;
  status: OrderStatus;
  payment_method: PayMethod;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  product: string;
  value: number;
  fee: number;
  checkout_url: string;
  pix_code: string;
};

type Obj = Record<string, unknown>;

// Depth-first search for the first key (case-insensitive) that holds a primitive value.
function find(o: unknown, keys: string[], depth = 0): unknown {
  if (!o || typeof o !== "object" || depth > 6) return undefined;
  const entries = Object.entries(o as Obj);
  for (const k of keys) {
    const hit = entries.find(([ek, v]) => ek.toLowerCase() === k && v !== null && v !== "" && typeof v !== "object");
    if (hit) return hit[1];
  }
  for (const [, v] of entries) {
    if (v && typeof v === "object") {
      const r = find(v, keys, depth + 1);
      if (r !== undefined) return r;
    }
  }
  return undefined;
}

const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));

function toNumber(v: unknown, centsHint: boolean): number {
  if (typeof v === "number") return centsHint && Number.isInteger(v) && v > 1000 ? v / 100 : v;
  const s = str(v).replace(/[^\d,.-]/g, "");
  if (!s) return 0;
  const n = s.includes(",") && !s.includes(".") ? Number(s.replace(",", ".")) : Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function detectStatus(text: string): OrderStatus {
  const t = text.toLowerCase();
  if (/(abandon|cart|carrinho|checkout_abandon)/.test(t)) return "abandoned";
  if (/(chargeback|disput)/.test(t)) return "chargeback";
  if (/(refund|reembols|estorn)/.test(t)) return "refunded";
  if (/(cancel|expired|expirad|recus|refused|declin)/.test(t)) return "canceled";
  if (/(approv|aprovad|paid|pago|complete|conclu|purchase_approved|order_approved|sale_approved)/.test(t)) return "approved";
  return "pending";
}

export function detectMethod(text: string): PayMethod {
  const t = text.toLowerCase();
  if (t.includes("pix")) return "pix";
  if (/(boleto|billet|bank_slip|ticket)/.test(t)) return "boleto";
  if (/(card|cartao|cartão|credit)/.test(t)) return "cartao";
  return "outro";
}

export function normalizeOrder(body: unknown): NormalizedOrder {
  const event = str(find(body, ["event", "webhook_event_type", "type", "event_type", "trigger"]));
  const statusRaw = str(find(body, ["status", "order_status", "sale_status", "payment_status"]));
  const methodRaw = str(find(body, ["payment_method", "paymentmethod", "payment_type", "method", "forma_pagamento"]));
  const cents = /(cents|centavos)/i.test(JSON.stringify(body ?? {}).slice(0, 4000));
  const value = toNumber(
    find(body, ["total_price", "amount", "total", "value", "price", "charge_amount", "full_price", "valor", "order_value", "sale_amount"]),
    cents,
  );
  const fee = toNumber(find(body, ["fee", "fees", "gateway_fee", "taxa", "commission_gateway"]), cents);
  const phoneRaw = str(find(body, ["phone", "mobile", "cellphone", "phone_number", "telefone", "celular", "mobile_phone"]));
  const status = detectStatus(`${event} ${statusRaw}`);
  return {
    external_id: str(find(body, ["order_id", "sale_id", "transaction", "transaction_id", "checkout_id", "cart_id", "id", "code"])),
    event: event || statusRaw,
    status,
    payment_method: ((m) => (m === "outro" ? detectMethod(JSON.stringify(body ?? {}).slice(0, 5000)) : m))(detectMethod(`${methodRaw} ${event}`)),
    customer_name: str(find(body, ["full_name", "customer_name", "name", "nome", "first_name"])),
    customer_email: str(find(body, ["email", "customer_email"])),
    customer_phone: phoneRaw.replace(/\D/g, ""),
    product: str(find(body, ["product_name", "offer_name", "plan_name", "title", "product", "produto", "item_name"])),
    value,
    fee,
    checkout_url: str(find(body, ["checkout_url", "abandoned_checkout_url", "recovery_url", "payment_url", "url"])),
    pix_code: str(find(body, ["pix_code", "pix_qrcode", "qr_code", "pix_copy_paste", "copy_paste", "emv"])),
  };
}

type Fillable = { customer_name?: string | null | undefined; product?: string | null | undefined; value?: number | null | undefined; checkout_url?: string | null | undefined; pix_code?: string | null | undefined; customer_email?: string | null | undefined; customer_phone?: string | null | undefined };
export function fillTemplate(text: string, o: Fillable): string {
  const first = (o.customer_name ?? "").split(" ")[0] ?? "";
  return text
    .replaceAll("{nome}", first)
    .replaceAll("{nome_completo}", o.customer_name ?? "")
    .replaceAll("{produto}", o.product ?? "")
    .replaceAll("{valor}", (o.value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }))
    .replaceAll("{link}", o.checkout_url ?? "")
    .replaceAll("{pix}", o.pix_code ?? "")
    .replaceAll("{email}", o.customer_email ?? "")
    .replaceAll("{telefone}", o.customer_phone ?? "");
}

// Which automation trigger an incoming order fires.
export function triggerFor(o: Pick<NormalizedOrder, "status" | "payment_method">): string | null {
  if (o.status === "abandoned") return "carrinho_abandonado";
  if (o.status === "approved") return "compra_aprovada";
  if (o.status === "refunded" || o.status === "chargeback") return "reembolso";
  if (o.status === "pending" && o.payment_method === "pix") return "pix_gerado";
  if (o.status === "pending" && o.payment_method === "boleto") return "boleto_gerado";
  if (o.status === "pending") return "pedido_pendente";
  if (o.status === "canceled") return "pedido_cancelado";
  return null;
}
