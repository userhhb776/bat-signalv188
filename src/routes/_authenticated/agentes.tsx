import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PageHeader, head } from "@/components/AppShell";
import { channelLabel, useRemove, useRows, useSave, type Row } from "@/lib/db";
import { chatWithAgent } from "@/lib/actions.functions";

export const Route = createFileRoute("/_authenticated/agentes")({
  head: () => head("Chatbots e agentes de IA", "Crie agentes de IA para suporte e recuperação de vendas."),
  component: Agents,
});

function Agents() {
  const agents = useRows("agents");
  const save = useSave("agents");
  const [sel, setSel] = useState<string | null>(null);
  const current = agents.data?.find((a) => a.id === sel) ?? agents.data?.[0];

  const create = async () => {
    const a = await save.mutateAsync({ name: "Novo agente", role: "recuperacao", prompt: "Você é um consultor de vendas simpático. Ajude o cliente a concluir a compra. Seja breve.", channels: ["whatsapp"], active: true });
    setSel(a.id);
  };

  return (
    <>
      <PageHeader title="Chatbots / Agentes de IA" subtitle="Eles respondem clientes no WhatsApp e Telegram e escrevem mensagens nas automações"
        action={<Button onClick={create}><Plus className="h-4 w-4" /> Novo agente</Button>} />
      {!agents.data?.length ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">Nenhum agente. Clique em “Novo agente”.</Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr_1fr]">
          <Card className="p-2">
            {agents.data.map((a) => (
              <button key={a.id} onClick={() => setSel(a.id)} className={`w-full rounded-md px-3 py-2 text-left text-sm ${current?.id === a.id ? "bg-accent" : "hover:bg-accent/50"}`}>
                {a.name}<span className="block text-xs text-muted-foreground">{a.role === "suporte" ? "Suporte" : "Recuperação"} · {a.active ? "ativo" : "pausado"}</span>
              </button>
            ))}
          </Card>
          {current && <Editor key={current.id} agent={current} />}
          {current && <TestChat key={"c" + current.id} prompt={current.prompt} />}
        </div>
      )}
    </>
  );
}

function Editor({ agent }: { agent: Row<"agents"> }) {
  const [a, setA] = useState(agent);
  const save = useSave("agents");
  const remove = useRemove("agents");
  const toggle = (c: string) => setA({ ...a, channels: a.channels.includes(c) ? a.channels.filter((x) => x !== c) : [...a.channels, c] });
  return (
    <Card className="space-y-3 p-4">
      <div className="space-y-1"><Label>Nome</Label><Input value={a.name} onChange={(e) => setA({ ...a, name: e.target.value })} /></div>
      <div className="space-y-1"><Label>Função</Label>
        <select value={a.role} onChange={(e) => setA({ ...a, role: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="recuperacao">Recuperação de vendas</option><option value="suporte">Suporte</option>
        </select></div>
      <div className="space-y-1"><Label>Instruções (prompt)</Label><Textarea rows={8} value={a.prompt} onChange={(e) => setA({ ...a, prompt: e.target.value })} /></div>
      <div className="space-y-1"><Label>Atende em</Label>
        <div className="flex flex-wrap gap-2">{Object.entries(channelLabel).map(([k, v]) => (
          <button key={k} onClick={() => toggle(k)} className={`rounded-full border px-3 py-1 text-xs ${a.channels.includes(k) ? "border-primary bg-primary/15 text-primary" : "border-border"}`}>{v}</button>
        ))}</div></div>
      <div className="flex items-center gap-2"><Switch checked={a.active} onCheckedChange={(v) => setA({ ...a, active: v })} /><span className="text-sm">Ativo</span></div>
      <div className="flex gap-2">
        <Button onClick={() => save.mutate(a, { onSuccess: () => toast.success("Agente salvo"), onError: (e) => toast.error(e.message) })}>Salvar</Button>
        <Button variant="ghost" onClick={() => remove.mutate(a.id)}><Trash2 className="h-4 w-4" /> Excluir</Button>
      </div>
    </Card>
  );
}

function TestChat({ prompt }: { prompt: string }) {
  const chat = useServerFn(chatWithAgent);
  const [msgs, setMsgs] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next); setText(""); setBusy(true);
    const r = await chat({ data: { prompt, messages: next } });
    setBusy(false);
    if (r.ok) setMsgs([...next, { role: "assistant", content: r.reply }]); else toast.error(r.error);
  };
  return (
    <Card className="flex h-[520px] flex-col p-4">
      <p className="mb-2 font-medium">Testar conversa</p>
      <div className="flex-1 space-y-2 overflow-y-auto">
        {msgs.map((m, i) => <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}>{m.content}</div>)}
        {busy && <p className="text-xs text-muted-foreground">digitando...</p>}
      </div>
      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text) send(); }}>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva como se fosse o cliente" />
        <Button size="icon" disabled={busy || !text}><Send className="h-4 w-4" /></Button>
      </form>
    </Card>
  );
}
