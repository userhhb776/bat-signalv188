import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { brl, methodLabel, statusLabel, useRows } from "@/lib/db";

export function OrdersTable({ only }: { only?: (o: { status: string; recovered: boolean }) => boolean }) {
  const orders = useRows("orders");
  const gws = useRows("gateways");
  const [q, setQ] = useState("");
  const [st, setSt] = useState("");
  const list = (orders.data ?? []).filter((o) => (!only || only(o)) && (!st || o.status === st) &&
    (!q || `${o.customer_name} ${o.customer_email} ${o.customer_phone} ${o.product}`.toLowerCase().includes(q.toLowerCase())));
  const gwName = (id: string | null) => gws.data?.find((g) => g.id === id)?.name ?? "—";
  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        <Input placeholder="Buscar cliente, e-mail, telefone ou produto" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        <select value={st} onChange={(e) => setSt(e.target.value)} className="rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Todos os status</option>
          {Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground"><tr>{["Data", "Cliente", "Contato", "Produto", "Valor", "Pagamento", "Gateway", "Status"].map((h) => <th key={h} className="p-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {list.map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="p-2 whitespace-nowrap">{new Date(o.created_at).toLocaleString("pt-BR")}</td>
                <td className="p-2">{o.customer_name || "—"}</td>
                <td className="p-2 text-xs text-muted-foreground">{o.customer_email}<br />{o.customer_phone}</td>
                <td className="p-2">{o.product}</td>
                <td className="p-2 whitespace-nowrap">{brl(Number(o.value))}</td>
                <td className="p-2">{methodLabel[o.payment_method]}</td>
                <td className="p-2">{gwName(o.gateway_id)}</td>
                <td className="p-2"><Badge variant={o.status === "approved" ? "default" : "secondary"}>{statusLabel[o.status] ?? o.status}</Badge>{o.recovered && <Badge className="ml-1 bg-success text-background">Recuperado</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <p className="py-10 text-center text-sm text-muted-foreground">{orders.isLoading ? "Carregando..." : "Nenhum pedido encontrado."}</p>}
      </div>
    </Card>
  );
}

