import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageHeader, head } from "@/components/AppShell";
import { useRemove, useRows, useSave } from "@/lib/db";
import { triggerLabel, type FlowEdge, type FlowNode } from "@/lib/flow-types";

export const Route = createFileRoute("/_authenticated/automacoes/")({
  head: () => head("Automações", "Fluxos automáticos de e-mail, WhatsApp, SMS e IA."),
  component: Flows,
});

const templates: { name: string; trigger: string; nodes: FlowNode[]; edges: FlowEdge[] }[] = [
  {
    name: "Recuperação de carrinhos (Teste A/B)", trigger: "carrinho_abandonado",
    nodes: [
      { id: "t", type: "trigger", position: { x: 0, y: 200 }, data: {} },
      { id: "r", type: "random", position: { x: 260, y: 200 }, data: { percent: 50 } },
      { id: "a1", type: "whatsapp", position: { x: 520, y: 60 }, data: { text: "Oi {nome}! Vi que você não finalizou {produto}. Posso ajudar? {link}" } },
      { id: "b1", type: "email", position: { x: 520, y: 340 }, data: { subject: "{nome}, seu carrinho está te esperando", text: "Finalize sua compra de {produto}: {link}" } },
      { id: "w", type: "wait", position: { x: 820, y: 200 }, data: { minutes: 1440 } },
      { id: "c", type: "condition", position: { x: 1080, y: 200 }, data: { field: "status", op: "neq", value: "approved" } },
      { id: "ai", type: "ai", position: { x: 1340, y: 120 }, data: { channel: "whatsapp", text: "Ofereça ajuda e reforce o link." } },
    ],
    edges: [
      { id: "e1", source: "t", target: "r" }, { id: "e2", source: "r", target: "a1", sourceHandle: "a" }, { id: "e3", source: "r", target: "b1", sourceHandle: "b" },
      { id: "e4", source: "a1", target: "w" }, { id: "e5", source: "b1", target: "w" }, { id: "e6", source: "w", target: "c" }, { id: "e7", source: "c", target: "ai", sourceHandle: "yes" },
    ],
  },
  {
    name: "Pix gerado não pago", trigger: "pix_gerado",
    nodes: [
      { id: "t", type: "trigger", position: { x: 0, y: 100 }, data: {} },
      { id: "w", type: "wait", position: { x: 260, y: 100 }, data: { minutes: 10 } },
      { id: "c", type: "condition", position: { x: 520, y: 100 }, data: { field: "status", op: "neq", value: "approved" } },
      { id: "s", type: "whatsapp", position: { x: 780, y: 40 }, data: { text: "{nome}, seu Pix de {valor} está pronto! Copia e cola: {pix}" } },
    ],
    edges: [{ id: "e1", source: "t", target: "w" }, { id: "e2", source: "w", target: "c" }, { id: "e3", source: "c", target: "s", sourceHandle: "yes" }],
  },
  { name: "Em branco", trigger: "compra_aprovada", nodes: [{ id: "t", type: "trigger", position: { x: 0, y: 100 }, data: {} }], edges: [] },
];

function Flows() {
  const flows = useRows("flows");
  const save = useSave("flows");
  const remove = useRemove("flows");
  const nav = useNavigate();
  const create = async (t: (typeof templates)[number]) => {
    const f = await save.mutateAsync({ name: t.name, trigger: t.trigger, nodes: t.nodes as never, edges: t.edges as never, active: false });
    nav({ to: "/automacoes/$id", params: { id: f.id } });
  };
  return (
    <>
      <PageHeader title="Automações" subtitle="Disparos automáticos quando algo acontece no seu gateway" />
      <p className="mb-2 text-sm font-medium text-muted-foreground">Criar a partir de um modelo</p>
      <div className="mb-6 flex flex-wrap gap-2">
        {templates.map((t) => <Button key={t.name} variant="outline" onClick={() => create(t)}><Plus className="h-4 w-4" /> {t.name}</Button>)}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {(flows.data ?? []).map((f) => (
          <Card key={f.id} className="flex items-center gap-3 p-4">
            <Link to="/automacoes/$id" params={{ id: f.id }} className="min-w-0 flex-1">
              <p className="truncate font-medium">{f.name}</p>
              <p className="text-xs text-muted-foreground">{triggerLabel[f.trigger]} · {(f.nodes as unknown[]).length} blocos</p>
            </Link>
            <Switch checked={f.active} onCheckedChange={(v) => save.mutate({ id: f.id, active: v })} />
            <Button size="icon" variant="ghost" onClick={() => remove.mutate(f.id)}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
        {!flows.data?.length && <Card className="p-10 text-center text-sm text-muted-foreground md:col-span-2">Nenhuma automação ainda.</Card>}
      </div>
    </>
  );
}
