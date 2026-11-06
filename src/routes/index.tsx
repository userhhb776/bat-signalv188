import { createFileRoute, Link } from "@tanstack/react-router";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/AppShell";
import { brl, useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel — Vendas em Conversa" },
      { name: "description", content: "Resumo de carrinhos, vendas recuperadas e agentes de IA." },
      { property: "og:title", content: "Painel — Vendas em Conversa" },
      { property: "og:description", content: "Resumo de carrinhos, vendas recuperadas e agentes de IA." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const carts = useStore((s) => s.carts);
  const agents = useStore((s) => s.agents);
  const flows = useStore((s) => s.flows);
  const rec = carts.filter((c) => c.status === "recuperado");
  const ab = carts.filter((c) => c.status === "abandonado");
  const recValue = rec.reduce((a, c) => a + c.value, 0);
  const rate = carts.length ? Math.round((rec.length / carts.length) * 100) : 0;
  const msgs = carts.reduce((a, c) => a + c.messages, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 10, 6 - (6 - i)));
    const key = d.toISOString().slice(0, 10);
    const day = carts.filter((c) => c.createdAt.slice(0, 10) === key);
    return {
      dia: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }),
      recuperado: day.filter((c) => c.status === "recuperado").reduce((a, c) => a + c.value, 0),
      abandonado: day.filter((c) => c.status !== "recuperado").reduce((a, c) => a + c.value, 0),
    };
  });

  const stats = [
    { label: "Vendas recuperadas", value: brl(recValue), hint: `${rec.length} pedidos` },
    { label: "Taxa de recuperação", value: `${rate}%`, hint: `${carts.length} carrinhos` },
    { label: "Em aberto", value: brl(ab.reduce((a, c) => a + c.value, 0)), hint: `${ab.length} carrinhos` },
    { label: "Mensagens enviadas", value: String(msgs), hint: "todos os canais" },
  ];

  return (
    <>
      <PageHeader title="Painel" subtitle="Como suas vendas estão sendo recuperadas" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-2 font-display text-2xl font-bold">{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-6 p-5">
        <p className="mb-4 font-semibold">Últimos 7 dias</p>
        <div className="h-64">
          <ResponsiveContainer>
            <AreaChart data={days}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => brl(v)} />
              <Area dataKey="abandonado" name="Não recuperado" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.15} />
              <Area dataKey="recuperado" name="Recuperado" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.25} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="flex justify-between"><p className="font-semibold">Agentes ativos</p><Link to="/agentes" className="text-sm text-primary">Ver todos</Link></div>
          <ul className="mt-3 space-y-2 text-sm">
            {agents.map((a) => <li key={a.id} className="flex justify-between"><span>{a.name}</span><span className={a.active ? "text-primary" : "text-muted-foreground"}>{a.active ? "Ativo" : "Pausado"}</span></li>)}
          </ul>
        </Card>
        <Card className="p-5">
          <div className="flex justify-between"><p className="font-semibold">Automações</p><Link to="/automacoes" className="text-sm text-primary">Ver todas</Link></div>
          <ul className="mt-3 space-y-2 text-sm">
            {flows.map((f) => <li key={f.id} className="flex justify-between"><span>{f.name}</span><span className={f.active ? "text-primary" : "text-muted-foreground"}>{f.active ? "Ligada" : "Desligada"}</span></li>)}
          </ul>
        </Card>
      </div>
    </>
  );
}
