import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader, head } from "@/components/AppShell";
import { brl, useRows } from "@/lib/db";
import { OrdersTable } from "@/components/OrdersTable";

export const Route = createFileRoute("/_authenticated/recuperacao")({
  head: () => head("Recuperação de vendas", "Carrinhos abandonados, Pix e boletos não pagos e vendas recuperadas."),
  component: Recovery,
});

function Recovery() {
  const orders = useRows("orders");
  const all = orders.data ?? [];
  const open = all.filter((o) => o.status === "abandoned" || (o.status === "pending"));
  const rec = all.filter((o) => o.recovered);
  return (
    <>
      <PageHeader title="Recuperação de vendas" subtitle="Carrinhos abandonados, Pix e boletos gerados e não pagos"
        action={<Button asChild><Link to="/automacoes">Configurar disparos automáticos</Link></Button>} />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><p className="text-sm text-muted-foreground">Em aberto</p><p className="text-2xl font-bold">{open.length} · {brl(open.reduce((a, o) => a + Number(o.value), 0))}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted-foreground">Recuperadas</p><p className="text-2xl font-bold text-success">{rec.length} · {brl(rec.reduce((a, o) => a + Number(o.value), 0))}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted-foreground">Taxa de recuperação</p><p className="text-2xl font-bold">{open.length + rec.length ? ((rec.length / (open.length + rec.length)) * 100).toFixed(1) : 0}%</p></Card>
      </div>
      <OrdersTable only={(o) => o.status === "abandoned" || o.status === "pending" || o.recovered} />
    </>
  );
}
