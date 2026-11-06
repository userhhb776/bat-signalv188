import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bot, Clock, MessageSquare, Plus, Trash2, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/AppShell";
import { channelLabel, setState, triggerLabel, uid, useStore, type Channel, type Flow, type FlowStep } from "@/lib/store";

export const Route = createFileRoute("/automacoes")({
  head: () => ({
    meta: [
      { title: "Automações — Vendas em Conversa" },
      { name: "description", content: "Fluxos automáticos de mensagens por evento de venda." },
      { property: "og:title", content: "Automações — Vendas em Conversa" },
      { property: "og:description", content: "Fluxos automáticos de mensagens por evento de venda." },
    ],
  }),
  component: Flows,
});

function Flows() {
  const flows = useStore((s) => s.flows);
  const agents = useStore((s) => s.agents);
  const [sel, setSel] = useState<string | null>(null);
  const flow = flows.find((f) => f.id === (sel ?? flows[0]?.id));

  const update = (patch: Partial<Flow>) => flow && setState((s) => ({ ...s, flows: s.flows.map((f) => (f.id === flow.id ? { ...f, ...patch } : f)) }));
  const setStep = (id: string, patch: Partial<FlowStep>) => flow && update({ steps: flow.steps.map((st) => (st.id === id ? ({ ...st, ...patch } as FlowStep) : st)) });
  const addStep = (st: FlowStep) => flow && update({ steps: [...flow.steps, st] });
  const create = () => {
    const id = uid();
    setState((s) => ({ ...s, flows: [...s.flows, { id, name: "Nova automação", trigger: "carrinho_abandonado", active: false, steps: [] }] }));
    setSel(id);
  };

  return (
    <>
      <PageHeader title="Automações" subtitle="Quando algo acontece no gateway, dispare mensagens em sequência" action={<Button onClick={create}><Plus className="h-4 w-4" /> Nova automação</Button>} />
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <div className="space-y-2">
          {flows.map((f) => (
            <button key={f.id} onClick={() => setSel(f.id)} className={`w-full rounded-lg border p-3 text-left text-sm ${f.id === flow?.id ? "border-primary bg-accent" : "border-border hover:bg-accent/50"}`}>
              <div className="font-semibold">{f.name}</div>
              <div className="text-xs text-muted-foreground">{triggerLabel[f.trigger]} · {f.steps.length} etapas</div>
            </button>
          ))}
        </div>
        {flow && (
          <div>
            <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
              <Input value={flow.name} onChange={(e) => update({ name: e.target.value })} className="max-w-xs" />
              <div className="flex items-center gap-2 text-sm">Ligada <Switch checked={flow.active} onCheckedChange={(v) => update({ active: v })} /></div>
              <Button variant="ghost" className="ml-auto text-destructive" onClick={() => { setState((s) => ({ ...s, flows: s.flows.filter((f) => f.id !== flow.id) })); setSel(null); }}><Trash2 className="h-4 w-4" /></Button>
            </Card>
            <div className="mx-auto max-w-xl">
              <Card className="border-primary/60 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary"><Zap className="h-4 w-4" /> Gatilho</div>
                <select value={flow.trigger} onChange={(e) => update({ trigger: e.target.value as Flow["trigger"] })} className="mt-2 w-full rounded-md border border-input bg-background p-2 text-sm">
                  {Object.entries(triggerLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Card>
              {flow.steps.map((st) => (
                <div key={st.id}>
                  <div className="mx-auto h-6 w-px bg-border" />
                  <Card className="p-4">
                    <div className="mb-2 flex items-center justify-between text-sm font-semibold">
                      <span className="flex items-center gap-2">
                        {st.type === "wait" ? <><Clock className="h-4 w-4 text-warning" /> Esperar</> : st.type === "send" ? <><MessageSquare className="h-4 w-4 text-chart-2" /> Enviar mensagem</> : <><Bot className="h-4 w-4 text-primary" /> Passar para agente de IA</>}
                      </span>
                      <button onClick={() => update({ steps: flow.steps.filter((x) => x.id !== st.id) })} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    {st.type === "wait" && <div className="flex items-center gap-2 text-sm"><Input type="number" min={1} value={st.minutes} onChange={(e) => setStep(st.id, { minutes: Number(e.target.value) })} className="w-24" /> minutos</div>}
                    {st.type === "send" && (
                      <div className="space-y-2">
                        <select value={st.channel} onChange={(e) => setStep(st.id, { channel: e.target.value as Channel })} className="w-full rounded-md border border-input bg-background p-2 text-sm">
                          {Object.entries(channelLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        <Textarea rows={3} value={st.text} onChange={(e) => setStep(st.id, { text: e.target.value })} />
                        <p className="text-xs text-muted-foreground">Variáveis: {"{nome}"} {"{produto}"} {"{valor}"} {"{link}"} {"{pix}"}</p>
                      </div>
                    )}
                    {st.type === "agent" && (
                      <select value={st.agentId} onChange={(e) => setStep(st.id, { agentId: e.target.value })} className="w-full rounded-md border border-input bg-background p-2 text-sm">
                        {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    )}
                  </Card>
                </div>
              ))}
              <div className="mx-auto h-6 w-px bg-border" />
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => addStep({ id: uid(), type: "wait", minutes: 30 })}><Clock className="h-4 w-4" /> Esperar</Button>
                <Button size="sm" variant="secondary" onClick={() => addStep({ id: uid(), type: "send", channel: "whatsapp", text: "Olá {nome}!" })}><MessageSquare className="h-4 w-4" /> Mensagem</Button>
                <Button size="sm" variant="secondary" onClick={() => addStep({ id: uid(), type: "agent", agentId: agents[0]?.id ?? "" })}><Bot className="h-4 w-4" /> Agente</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
