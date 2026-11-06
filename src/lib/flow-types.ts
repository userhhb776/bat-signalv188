export type NodeKind = "trigger" | "email" | "whatsapp" | "sms" | "telegram" | "webhook" | "condition" | "random" | "ai" | "wait";

export type FlowNode = {
  id: string;
  type: NodeKind;
  position: { x: number; y: number };
  data: {
    text?: string | undefined;
    subject?: string | undefined;
    url?: string | undefined;
    minutes?: number | undefined;
    field?: "status" | "payment_method" | "value" | "recovered" | undefined;
    op?: "eq" | "neq" | "gt" | "lt" | undefined;
    value?: string | undefined;
    agentId?: string | undefined;
    channel?: "whatsapp" | "telegram" | "sms" | "email" | undefined;
    percent?: number | undefined;
  };
};

export type FlowEdge = { id: string; source: string; target: string; sourceHandle?: string | null };

export const triggerLabel: Record<string, string> = {
  carrinho_abandonado: "Carrinho abandonado criado",
  pix_gerado: "Pix gerado",
  boleto_gerado: "Boleto gerado",
  pedido_pendente: "Pedido pendente",
  compra_aprovada: "Compra aprovada",
  pedido_cancelado: "Pedido cancelado",
  reembolso: "Reembolso / chargeback",
};
