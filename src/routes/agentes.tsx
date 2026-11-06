import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Bot, Plus, Send, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/AppShell";
import { channelLabel, setState, uid, useStore, type Agent, type Channel } from "@/lib/store";
import { chatWithAgent } from "@/lib/actions.functions";

export const Route = createFileRoute("/agentes")({
  head: () => ({
    meta: [
      { title: "Agentes de IA — Vendas em Conversa" },
      { name: "description", content: "Crie agentes de suporte e recuperação de vendas." },
      { property: "og:title", content: "Agentes de IA — Vendas em Conversa" },
      { property: "og:description", content: "Crie agentes de suporte e recuperação de vendas." },
    ],
  }),
  component: Agents,
});

const allChannels: Channel[] = ["whatsapp", "telegram", "sms", "email"];

function Agents() {
  const agents = useStore((s) => s.agents);
  const [sel, setSel] = useState<string | null>(null);
  const agent = agents.find((a) => a.id === (sel ?? agents[0]?.id));

  const update = (patch: Partial<Agent>) =>
    agent && setState((s) => ({ ...s, agents: s.agents.map((a) => (a.id === agent.id ? { ...a, ...patch } : a)) }));
  const create = () => {
    const id = uid();
    setState((s) => ({ ...s, agents: [...s.agents, { id, name: "Novo agente", role: "suporte", model: s.settings.aiModel, prompt: "Você é um atendente educado.", channels: ["whatsapp"], active: false }] }));
    setSel(id);
  };
  const remove = () => {
    if (!agent) return;
    setState((s) => ({ ...s, agents: s.agents.filter((a) => a.id !== agent.id) }));
    setSel(null);
  };

  return (
    <>
      <PageHeader title="Agentes de IA" subtitle="Atendem e recuperam vendas pelos seus canais" action={<Button onClick={create}><Plus className="h-4 w-4" /> Novo agente</Button>} />
      <div className="grid gap-4 lg:grid-cols-[220px_1fr_1fr]">
        <div className="space-y-2">
          {agents.map((a) => (
            <button key={a.id} onClick={() => setSel(a.id)} className={`w-full rounded-lg border p-3 text-left text-sm transition ${a.id === agent?.id ? "border-primary bg-accent" : "border-border hover:bg-accent/50"}`}>
              <div className="font-semibold">{a.name}</div>
              <div className="text-xs text-muted-foreground">{a.role === "suporte" ? "Suporte" : "Recuperação"} · {a.active ? "Ativo" : "Pausado"}</div>
            </button>
          ))}
        </div>
        {agent ? (
          <>
            <Card className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <Label>Ativo</Label>
                <Switch checked={agent.active} onCheckedChange={(v) => update({ active: v })} />
              </div>
              <div className="space-y-1"><Label>Nome</Label><Input value={agent.name} onChange={(e) => update({ name: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Função</Label>
                <div className="flex gap-2">
                  {(["suporte", "recuperacao"] as const).map((r) => (
                    <Button key={r} size="sm" variant={agent.role === r ? "default" : "secondary"} onClick={() => update({ role: r })}>{r === "suporte" ? "Suporte" : "Recuperação"}</Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1"><Label>Modelo</Label><Input value={agent.model} onChange={(e) => update({ model: e.target.value })} placeholder="llama3.1, gpt-4o-mini..." /></div>
              <div className="space-y-1"><Label>Instruções</Label><Textarea rows={6} value={agent.prompt} onChange={(e) => update({ prompt: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Canais</Label>
                <div className="flex flex-wrap gap-2">
                  {allChannels.map((c) => {
                    const on = agent.channels.includes(c);
                    return <Button key={c} size="sm" variant={on ? "default" : "secondary"} onClick={() => update({ channels: on ? agent.channels.filter((x) => x !== c) : [...agent.channels, c] })}>{channelLabel[c]}</Button>;
                  })}
                </div>
              </div>
              <Button variant="ghost" className="text-destructive" onClick={remove}><Trash2 className="h-4 w-4" /> Excluir agente</Button>
            </Card>
            <TestChat key={agent.id} agent={agent} />
          </>
        ) : (
          <p className="text-muted-foreground">Crie seu primeiro agente.</p>
        )}
      </div>
    </>
  );
}

function TestChat({ agent }: { agent: Agent }) {
  const settings = useStore((s) => s.settings);
  const chat = useServerFn(chatWithAgent);
  const [msgs, setMsgs] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const send = async () => {
    if (!text.trim() || busy) return;
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next);
    setText("");
    setBusy(true);
    setErr("");
    const r = await chat({ data: { baseUrl: settings.aiBaseUrl, apiKey: settings.aiKey || undefined, model: agent.model, messages: [{ role: "system", content: agent.prompt }, ...next] } });
    setBusy(false);
    if (r.ok) setMsgs([...next, { role: "assistant", content: r.reply }]);
    else setErr(r.error);
  };

  return (
    <Card className="flex h-[560px] flex-col p-0">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground"><Bot className="h-4 w-4" /></div>
        <div><p className="text-sm font-semibold">Testar {agent.name}</p><p className="text-xs text-muted-foreground">{settings.aiBaseUrl}</p></div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
        {!msgs.length && <p className="text-muted-foreground">Mande uma mensagem como se fosse um cliente.</p>}
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 ${m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary"}`}>{m.content}</div>
        ))}
        {busy && <div className="w-fit rounded-xl bg-secondary px-3 py-2 text-muted-foreground">digitando…</div>}
        {err && <div className="rounded-lg border border-destructive/50 p-3 text-destructive">{err}</div>}
      </div>
      <form className="flex gap-2 border-t border-border p-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <Input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva uma mensagem…" />
        <Button type="submit" size="icon" disabled={busy}><Send className="h-4 w-4" /></Button>
      </form>
    </Card>
  );
}
