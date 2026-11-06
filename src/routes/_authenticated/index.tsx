import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart } from "recharts";
import {
  Banknote, Barcode, CreditCard, DollarSign, Maximize, Megaphone, Package, Percent, Printer, QrCode, RefreshCw, Scale, ShoppingCart,
  Tag, Trophy, Users, Clock, CheckCircle2, RotateCcw, XCircle, MessageCircle, TrendingUp, TrendingDown, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { brl, useRows, useSettings, type Row } from "@/lib/db";
import { head } from "@/components/AppShell";
import { runDueSteps } from "@/lib/actions.functions";

export const Route = createFileRoute("/_authenticated/")({
  head: () => head("Painel", "Visão geral, financeiro e logística da sua loja em tempo real."),
  component: Dashboard,
});

const ranges = [
  { v: 1, l: "Hoje" }, { v: 7, l: "Últimos 7 dias" }, { v: 15, l: "Últimos 15 dias" }, { v: 30, l: "Últimos 30 dias" }, { v: 90, l: "Últimos 90 dias" },
];
type Order = Row<"orders">;

function calc(orders: Order[], cfg: { cost: number; tax: number; mkt: number }) {
  const approved = orders.filter((o) => o.status === "approved");
  const pending = orders.filter((o) => o.status === "pending");
  const gross = approved.reduce((a, o) => a + Number(o.value), 0);
  const fees = approved.reduce((a, o) => a + Number(o.fee), 0);
  const revenue = gross - fees;
  const cost = (gross * cfg.cost) / 100;
  const taxes = (gross * cfg.tax) / 100 + fees;
  const profit = gross - cost - cfg.mkt - taxes;
  return {
    approved, pending, gross, revenue, cost, taxes, profit, mkt: cfg.mkt,
    pendingValue: pending.reduce((a, o) => a + Number(o.value), 0),
    ticket: approved.length ? gross / approved.length : 0,
    margin: gross ? (profit / gross) * 100 : 0,
    cac: approved.length ? cfg.mkt / approved.length : 0,
    roi: cfg.mkt ? (profit / cfg.mkt) * 100 : 0,
  };
}

function Dashboard() {
  const [days, setDays] = useState(7);
  const [tab, setTab] = useState<"geral" | "fin" | "log">("fin");
  const since = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (days * 2 - 1)); return d.toISOString(); }, [days]);
  const orders = useRows("orders", { since });
  const messages = useRows("messages", { since });
  const settings = useSettings();
  const qc = useQueryClient();
  const runDue = useServerFn(runDueSteps);
  const s = settings.data;

  const cut = new Date(); cut.setHours(0, 0, 0, 0); cut.setDate(cut.getDate() - (days - 1));
  const all = orders.data ?? [];
  const cur = all.filter((o) => new Date(o.created_at) >= cut);
  const prev = all.filter((o) => new Date(o.created_at) < cut);
  const mktDaily = Number(s?.marketing_spend ?? 0) / 30;
  const cfg = (n: number) => ({ cost: Number(s?.product_cost_percent ?? 0), tax: Number(s?.tax_percent ?? 0), mkt: mktDaily * n });
  const c = calc(cur, cfg(days));
  const p = calc(prev, cfg(days));

  const chart = Array.from({ length: days }, (_, i) => {
    const d = new Date(cut); d.setDate(d.getDate() + i);
    const key = d.toDateString();
    const r = calc(cur.filter((o) => new Date(o.created_at).toDateString() === key), cfg(1));
    return { dia: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }), receita: r.revenue, custo: -r.cost, marketing: -r.mkt, taxas: -r.taxes, lucro: r.profit };
  });

  const ranking = Object.values(c.approved.reduce<Record<string, { n: string; v: number; q: number }>>((a, o) => {
    const k = o.product || "Sem nome"; a[k] ??= { n: k, v: 0, q: 0 }; a[k].v += Number(o.value); a[k].q++; return a;
  }, {})).sort((a, b) => b.v - a.v).slice(0, 5);

  const byMethod = (m: string) => { const l = c.approved.filter((o) => o.payment_method === m); return { v: l.reduce((a, o) => a + Number(o.value), 0), n: l.length }; };
  const abandoned = cur.filter((o) => o.status === "abandoned" || o.recovered);
  const recovered = cur.filter((o) => o.recovered);
  const curMsgs = (messages.data ?? []).filter((m) => new Date(m.created_at) >= cut);

  const refresh = async () => {
    await runDue().catch(() => null);
    await qc.invalidateQueries();
    toast.success("Painel atualizado");
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="no-print mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-3">
          <Button onClick={refresh} className="rounded-full px-5 font-semibold uppercase tracking-wide"><RefreshCw className="h-4 w-4" /> Atualizar</Button>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="block w-72 rounded-md border border-input bg-card px-3 py-2 text-sm">
            {ranges.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
          </select>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-full uppercase tracking-wide" onClick={() => document.documentElement.requestFullscreen?.()}><Maximize className="h-4 w-4" /> Tela cheia</Button>
          <Button className="rounded-full bg-warning font-semibold uppercase tracking-wide text-warning-foreground hover:bg-warning/90" onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimir</Button>
        </div>
      </div>

      <div className="mb-5 flex gap-2 border-b border-border">
        {([["geral", "Visão geral"], ["fin", "Financeiro"], ["log", "Logística"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`border-b-2 px-4 py-3 text-sm font-medium uppercase tracking-wide ${tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{l}</button>
        ))}
      </div>

      {all.length === 0 && !orders.isLoading && (
        <div className="mb-5 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Nenhum pedido ainda. Cadastre seu gateway em <b>Integrações</b> e cole o link do webhook no painel dele — os pedidos aparecem aqui assim que chegarem.
        </div>
      )}

      {tab === "fin" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi icon={DollarSign} tone="text-success bg-success/15" label="Receita líquida" value={brl(c.revenue)} d={pct(c.revenue, p.revenue)} />
            <Kpi icon={Package} tone="text-chart-2 bg-chart-2/15" label="Custo dos produtos" value={brl(c.cost)} d={pct(c.cost, p.cost)} />
            <Kpi icon={Megaphone} tone="text-chart-3 bg-chart-3/15" label="Marketing" value={brl(c.mkt)} d={pct(c.mkt, p.mkt)} />
            <Kpi icon={Scale} tone="text-chart-4 bg-chart-4/15" label="Taxas e impostos" value={brl(c.taxes)} d={pct(c.taxes, p.taxes)} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
            <Panel icon={BarChart3} title="Resumo financeiro" sub="Acompanhe o resumo financeiro do seu negócio no período selecionado.">
              <div className="h-80">
                <ResponsiveContainer>
                  <ComposedChart data={chart} stackOffset="sign">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}K` : v)} />
                    <Tooltip formatter={(v: number) => brl(Math.abs(v))} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="receita" name="Receita líquida" stackId="a" fill="var(--chart-1)" />
                    <Bar dataKey="custo" name="Custo dos produtos" stackId="a" fill="var(--chart-2)" />
                    <Bar dataKey="marketing" name="Marketing" stackId="a" fill="var(--chart-3)" />
                    <Bar dataKey="taxas" name="Taxas e impostos" stackId="a" fill="var(--chart-4)" />
                    <Line dataKey="lucro" name="Lucro líquido" stroke="var(--chart-5)" strokeWidth={2} dot />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-muted-foreground">Lucro líquido</p>
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className={`text-2xl font-bold ${c.profit >= 0 ? "text-success" : "text-destructive"}`}>{brl(c.profit)} <Delta d={pct(c.profit, p.profit)} /></p>
                    <p className="text-xs text-muted-foreground">no período</p>
                  </div>
                  <div className="h-16 w-28">
                    <ResponsiveContainer><BarChart data={chart}><Bar dataKey="lucro" fill="var(--success)" radius={2} /></BarChart></ResponsiveContainer>
                  </div>
                </div>
              </div>
              <Panel icon={Trophy} title="Ranking de produtos">
                {ranking.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Sem vendas no período</p> : ranking.map((r) => (
                  <div key={r.n} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted"><Package className="h-5 w-5 text-muted-foreground" /></div>
                    <div className="min-w-0"><p className="truncate text-sm">{r.n}</p><p className="text-xs text-muted-foreground">{brl(r.v)} ({r.q})</p></div>
                  </div>
                ))}
              </Panel>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Kpi icon={Banknote} label="Pedidos aprovados" value={`${brl(c.gross)} (${c.approved.length})`} d={pct(c.gross, p.gross)} />
            <Kpi icon={Clock} label="Pedidos pendentes" value={`${brl(c.pendingValue)} (${c.pending.length})`} d={pct(c.pendingValue, p.pendingValue)} invert />
            <Kpi icon={Tag} label="Ticket médio" value={brl(c.ticket)} d={pct(c.ticket, p.ticket)} />
            <Kpi icon={ShoppingCart} label="Margem de lucro" value={`${c.margin.toFixed(0)}%`} d={c.margin - p.margin} />
            <Kpi icon={Users} label="CAC" value={brl(c.cac)} d={pct(c.cac, p.cac)} invert />
            <Kpi icon={RotateCcw} label="ROI" value={`${c.roi.toFixed(0)}%`} d={c.roi - p.roi} />
            <Kpi icon={CreditCard} label="Cartão de crédito" value={`${brl(byMethod("cartao").v)} (${byMethod("cartao").n})`} />
            <Kpi icon={Barcode} label="Boleto bancário" value={`${brl(byMethod("boleto").v)} (${byMethod("boleto").n})`} />
            <Kpi icon={QrCode} label="Pix" value={`${brl(byMethod("pix").v)} (${byMethod("pix").n})`} />
          </div>
        </>
      )}

      {tab === "geral" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi icon={ShoppingCart} tone="text-warning bg-warning/15" label="Carrinhos abandonados" value={`${abandoned.length}`} />
          <Kpi icon={CheckCircle2} tone="text-success bg-success/15" label="Vendas recuperadas" value={`${brl(recovered.reduce((a, o) => a + Number(o.value), 0))} (${recovered.length})`} />
          <Kpi icon={Percent} label="Taxa de recuperação" value={`${abandoned.length ? ((recovered.length / abandoned.length) * 100).toFixed(1) : "0"}%`} />
          <Kpi icon={MessageCircle} label="Mensagens enviadas" value={`${curMsgs.filter((m) => m.ok && !m.recipient.startsWith("←")).length}`} />
          <Kpi icon={Banknote} label="Faturamento" value={brl(c.gross)} d={pct(c.gross, p.gross)} />
          <Kpi icon={Tag} label="Pedidos no período" value={`${cur.length}`} d={pct(cur.length, prev.length)} />
          <Kpi icon={XCircle} label="Falhas de envio" value={`${curMsgs.filter((m) => !m.ok).length}`} />
          <Kpi icon={Users} label="Clientes únicos" value={`${new Set(cur.map((o) => o.customer_email || o.customer_phone)).size}`} />
        </div>
      )}

      {tab === "log" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(["approved", "pending", "abandoned", "canceled", "refunded", "chargeback"] as const).map((st) => {
            const l = cur.filter((o) => o.status === st);
            const lbl = { approved: "Aprovados", pending: "Aguardando pagamento", abandoned: "Carrinhos abandonados", canceled: "Cancelados", refunded: "Reembolsados", chargeback: "Chargebacks" }[st];
            return <Kpi key={st} icon={Package} label={lbl} value={`${l.length} — ${brl(l.reduce((a, o) => a + Number(o.value), 0))}`} />;
          })}
        </div>
      )}
    </div>
  );
}

const pct = (a: number, b: number) => (b ? ((a - b) / Math.abs(b)) * 100 : a ? 100 : 0);

function Delta({ d, invert }: { d?: number | undefined; invert?: boolean | undefined }) {
  if (d === undefined || !Number.isFinite(d)) return null;
  const good = invert ? d <= 0 : d >= 0;
  const I = d >= 0 ? TrendingUp : TrendingDown;
  return <span className={`ml-1 inline-flex items-center gap-0.5 text-xs font-medium ${good ? "text-success" : "text-destructive"}`}>{d >= 0 ? "+" : ""}{d.toFixed(0)}% <I className="h-3.5 w-3.5" /></span>;
}

function Kpi({ icon: I, label, value, d, tone = "text-chart-5 bg-chart-5/15", invert }: { icon: React.ElementType; label: string; value: string; d?: number; tone?: string; invert?: boolean }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg ${tone}`}><I className="h-5 w-5" /></div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold">{value}<Delta d={d} invert={invert} /></p>
      </div>
    </div>
  );
}

function Panel({ icon: I, title, sub, children }: { icon: React.ElementType; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-warning/15 text-warning"><I className="h-5 w-5" /></div>
        <div><p className="font-medium">{title}</p>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</div>
      </div>
      {children}
    </div>
  );
}
