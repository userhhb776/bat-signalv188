import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/AppShell";
import { brl, setState, useStore, type CartStatus } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/carrinhos")({
  head: () => ({
    meta: [
      { title: "Carrinhos abandonados — Vendas em Conversa" },
      { name: "description", content: "Clientes que iniciaram a compra e não finalizaram." },
      { property: "og:title", content: "Carrinhos abandonados — Vendas em Conversa" },
      { property: "og:description", content: "Clientes que iniciaram a compra e não finalizaram." },
    ],
  }),
  component: Carts,
});

const filters: (CartStatus | "todos")[] = ["todos", "abandonado", "recuperado", "perdido"];

function Carts() {
  const carts = useStore((s) => s.carts);
  const [f, setF] = useState<(typeof filters)[number]>("todos");
  const [q, setQ] = useState("");
  const list = carts.filter((c) => (f === "todos" || c.status === f) && (c.customer + c.product).toLowerCase().includes(q.toLowerCase()));

  const mark = (id: string, status: CartStatus) => setState((s) => ({ ...s, carts: s.carts.map((c) => (c.id === id ? { ...c, status } : c)) }));
  const resend = (id: string) => {
    setState((s) => ({ ...s, carts: s.carts.map((c) => (c.id === id ? { ...c, messages: c.messages + 1 } : c)) }));
    toast.success("Mensagem de recuperação colocada na fila");
  };

  return (
    <>
      <PageHeader title="Carrinhos abandonados" subtitle="Chegam automaticamente pelos webhooks dos seus gateways" />
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((x) => (
          <Button key={x} size="sm" variant={f === x ? "default" : "secondary"} onClick={() => setF(x)} className="capitalize">{x}</Button>
        ))}
        <Input placeholder="Buscar cliente ou produto" value={q} onChange={(e) => setQ(e.target.value)} className="ml-auto max-w-xs" />
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-b border-border">
              <th className="p-3">Cliente</th><th className="p-3">Produto</th><th className="p-3">Valor</th><th className="p-3">Gateway</th><th className="p-3">Status</th><th className="p-3">Msgs</th><th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-b border-border/60 last:border-0">
                <td className="p-3"><div className="font-medium">{c.customer}</div><div className="text-xs text-muted-foreground">{c.phone}</div></td>
                <td className="p-3">{c.product}</td>
                <td className="p-3 font-semibold">{brl(c.value)}</td>
                <td className="p-3">{c.gateway}</td>
                <td className="p-3">
                  <Badge variant={c.status === "recuperado" ? "default" : c.status === "perdido" ? "destructive" : "secondary"} className="capitalize">{c.status}</Badge>
                </td>
                <td className="p-3">{c.messages}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  {c.status === "abandonado" && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => resend(c.id)}>Reenviar</Button>{" "}
                      <Button size="sm" onClick={() => mark(c.id, "recuperado")}>Recuperado</Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum carrinho encontrado</td></tr>}
          </tbody>
        </table>
      </Card>
    </>
  );
}
