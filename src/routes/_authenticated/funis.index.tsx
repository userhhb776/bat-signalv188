import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader, head } from "@/components/AppShell";
import { useRemove, useRows, useSave } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/funis/")({
  head: () => head("Funis PV", "Construtor visual de funis de oferta: página, order bump, upsell, downsell e recuperação."),
  component: Funnels,
});

const base = [
  { id: "p", type: "pagina", position: { x: 0, y: 160 }, data: { title: "Página de vendas", url: "" } },
  { id: "c", type: "checkout", position: { x: 280, y: 160 }, data: { title: "Checkout", url: "" } },
  { id: "b", type: "bump", position: { x: 560, y: 40 }, data: { title: "Order bump", url: "" } },
  { id: "u", type: "upsell", position: { x: 560, y: 280 }, data: { title: "Upsell", url: "" } },
  { id: "o", type: "obrigado", position: { x: 840, y: 160 }, data: { title: "Obrigado", url: "" } },
];
const baseEdges = [
  { id: "e1", source: "p", target: "c" }, { id: "e2", source: "c", target: "b" }, { id: "e3", source: "c", target: "u" },
  { id: "e4", source: "u", target: "o", sourceHandle: "yes" }, { id: "e5", source: "b", target: "o" },
];

function Funnels() {
  const list = useRows("funnels");
  const save = useSave("funnels");
  const remove = useRemove("funnels");
  const nav = useNavigate();
  const create = async (blank: boolean) => {
    const f = await save.mutateAsync({ name: blank ? "Novo funil" : "Funil completo", nodes: (blank ? [base[0]] : base) as never, edges: (blank ? [] : baseEdges) as never });
    nav({ to: "/funis/$id", params: { id: f.id } });
  };
  return (
    <>
      <PageHeader title="Funis PV" subtitle="Monte o caminho das suas ofertas: página, checkout, order bump, upsell, downsell e recuperação" />
      <div className="mb-6 flex flex-wrap gap-2">
        <Button onClick={() => create(false)}><Plus className="h-4 w-4" /> Funil completo (modelo)</Button>
        <Button variant="outline" onClick={() => create(true)}><Plus className="h-4 w-4" /> Em branco</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {(list.data ?? []).map((f) => (
          <Card key={f.id} className="flex items-center justify-between p-4">
            <Link to="/funis/$id" params={{ id: f.id }} className="min-w-0">
              <p className="truncate font-semibold">{f.name}</p>
              <p className="text-xs text-muted-foreground">{(f.nodes as unknown[]).length} etapas</p>
            </Link>
            <Button size="icon" variant="ghost" onClick={() => remove.mutate(f.id)}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
        {list.data?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum funil ainda.</p>}
      </div>
    </>
  );
}
