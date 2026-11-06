import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Plus, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, head } from "@/components/AppShell";
import { useRemove, useRows, useSave, useSaveSettings, useSettings } from "@/lib/db";
import { connectTelegram, sendTestMessage } from "@/lib/actions.functions";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => head("Configurações", "IA (DeepSeek ou Ollama), servidores Render, Telegram e custos."),
  component: SettingsPage,
});

type S = Database["public"]["Tables"]["settings"]["Row"];
const providers = {
  deepseek: { url: "https://api.deepseek.com", model: "deepseek-chat" },
  ollama: { url: "https://seu-ollama.exemplo.com", model: "llama3.1" },
  outro: { url: "", model: "" },
} as const;

function SettingsPage() {
  const q = useSettings();
  if (!q.data) return <p className="text-muted-foreground">Carregando...</p>;
  return <Form initial={q.data} />;
}

function Form({ initial }: { initial: S }) {
  const [s, setS] = useState(initial);
  const save = useSaveSettings();
  const servers = useRows("render_servers");
  const tg = useServerFn(connectTelegram);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const set = (p: Partial<S>) => setS({ ...s, ...p });
  const { user_id: _u, cron_secret: _c, updated_at: _t, ...patch } = s;
  const submit = () => save.mutate(patch, { onSuccess: () => toast.success("Configurações salvas"), onError: (e) => toast.error(e.message) });
  const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("Copiado"); };

  const sel = (key: "whatsapp_server_id" | "sms_server_id" | "email_server_id") => (
    <select value={s[key] ?? ""} onChange={(e) => set({ [key]: e.target.value || null })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
      <option value="">Nenhum</option>
      {(servers.data ?? []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
    </select>
  );

  return (
    <>
      <PageHeader title="Configurações" subtitle="Tudo que é técnico fica aqui" action={<Button onClick={submit}>Salvar configurações</Button>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3 p-5">
          <h2 className="font-display text-lg font-bold">Loja</h2>
          <F label="Nome da loja" v={s.store_name} on={(v) => set({ store_name: v })} />
          <div className="grid grid-cols-3 gap-2">
            <F label="Custo produto (%)" type="number" v={String(s.product_cost_percent)} on={(v) => set({ product_cost_percent: Number(v) })} />
            <F label="Impostos (%)" type="number" v={String(s.tax_percent)} on={(v) => set({ tax_percent: Number(v) })} />
            <F label="Marketing/mês (R$)" type="number" v={String(s.marketing_spend)} on={(v) => set({ marketing_spend: Number(v) })} />
          </div>
          <p className="text-xs text-muted-foreground">Usados no painel Financeiro para calcular lucro, margem, CAC e ROI.</p>
        </Card>

        <Card className="space-y-3 p-5">
          <h2 className="font-display text-lg font-bold">Inteligência artificial</h2>
          <div className="flex gap-2">
            {(Object.keys(providers) as (keyof typeof providers)[]).map((k) => (
              <Button key={k} variant={s.ai_provider === k ? "default" : "outline"} size="sm"
                onClick={() => set({ ai_provider: k, ai_base_url: providers[k].url || s.ai_base_url, ai_model: providers[k].model || s.ai_model })}>
                {k === "deepseek" ? "DeepSeek" : k === "ollama" ? "Ollama" : "Outra (compatível OpenAI)"}
              </Button>
            ))}
          </div>
          <F label="Endereço da API" v={s.ai_base_url} on={(v) => set({ ai_base_url: v })} />
          <div className="grid grid-cols-2 gap-2">
            <F label="Modelo" v={s.ai_model} on={(v) => set({ ai_model: v })} />
            <F label="Chave da API" type="password" v={s.ai_key} on={(v) => set({ ai_key: v })} />
          </div>
          <div className="space-y-1"><Label className="text-xs">Chaves reserva (uma por linha — usadas se a principal falhar ou acabar o crédito)</Label>
            <textarea rows={3} value={s.ai_backup_keys} onChange={(e) => set({ ai_backup_keys: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs" /></div>
          <p className="text-xs text-muted-foreground">O Ollama precisa estar acessível pela internet (não só no seu computador).</p>
        </Card>

        <RenderServers />

        <Card className="space-y-3 p-5">
          <h2 className="font-display text-lg font-bold">Canais de envio</h2>
          <div className="space-y-1"><Label>Servidor do WhatsApp</Label>{sel("whatsapp_server_id")}</div>
          <div className="space-y-1"><Label>Servidor do SMS</Label>{sel("sms_server_id")}</div>
          <div className="space-y-1"><Label>Servidor do E-mail</Label>{sel("email_server_id")}</div>
          <F label="Token do bot do Telegram (@BotFather)" type="password" v={s.telegram_token} on={(v) => set({ telegram_token: v })} />
          <Button variant="secondary" size="sm" onClick={async () => {
            await save.mutateAsync(patch);
            const r = await tg({ data: { origin } });
            r.ok ? toast.success("Bot do Telegram ligado aos agentes") : toast.error(r.error);
          }}>Salvar e ativar respostas no Telegram</Button>
          <TestSend />
        </Card>

        <Card className="space-y-3 p-5 lg:col-span-2">
          <h2 className="font-display text-lg font-bold">Avançado</h2>
          <Copyable label="Receber WhatsApp no agente (seu servidor Render envia POST com {from, text} e cabeçalho x-batsignal-secret)" value={`${origin}/api/public/inbox/${s.user_id}/whatsapp`} copy={copy} />
          <Copyable label="Chave secreta (x-batsignal-secret)" value={initial.cron_secret} copy={copy} />
          <Copyable label="Agendador: chame este link a cada minuto (ex.: cron-job.org) para os blocos “Aguardar” continuarem sozinhos" value={`${origin}/api/public/cron?secret=${initial.cron_secret}`} copy={copy} />
          <p className="text-xs text-muted-foreground">O botão Atualizar do painel também processa os passos pendentes.</p>
        </Card>
      </div>
    </>
  );
}

function RenderServers() {
  const servers = useRows("render_servers");
  const save = useSave("render_servers");
  const remove = useRemove("render_servers");
  const [n, setN] = useState({ name: "", url: "", api_key: "" });
  return (
    <Card className="space-y-3 p-5">
      <h2 className="font-display text-lg font-bold">Servidores Render</h2>
      <p className="text-xs text-muted-foreground">Recebem POST com {"{ channel, to, message, subject }"} e enviam a mensagem.</p>
      {(servers.data ?? []).map((x) => (
        <div key={x.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
          <span className="font-medium">{x.name}</span><span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{x.url}</span>
          <Button size="icon" variant="ghost" onClick={() => remove.mutate(x.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <div className="grid gap-2 md:grid-cols-3">
        <Input placeholder="Nome" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} />
        <Input placeholder="https://app.onrender.com/send" value={n.url} onChange={(e) => setN({ ...n, url: e.target.value })} />
        <Input placeholder="Chave (opcional)" type="password" value={n.api_key} onChange={(e) => setN({ ...n, api_key: e.target.value })} />
      </div>
      <Button size="sm" disabled={!n.name || !/^https?:\/\//.test(n.url)} onClick={() => save.mutate(n, { onSuccess: () => { setN({ name: "", url: "", api_key: "" }); toast.success("Servidor cadastrado"); }, onError: (e) => toast.error(e.message) })}>
        <Plus className="h-4 w-4" /> Cadastrar servidor
      </Button>
    </Card>
  );
}

function TestSend() {
  const send = useServerFn(sendTestMessage);
  const [ch, setCh] = useState<"whatsapp" | "telegram" | "sms" | "email">("whatsapp");
  const [to, setTo] = useState("");
  return (
    <div className="flex gap-2 border-t border-border pt-3">
      <select value={ch} onChange={(e) => setCh(e.target.value as typeof ch)} className="rounded-md border border-input bg-background px-2 text-sm">
        <option value="whatsapp">WhatsApp</option><option value="telegram">Telegram</option><option value="sms">SMS</option><option value="email">E-mail</option>
      </select>
      <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Destino para teste" />
      <Button variant="secondary" disabled={!to} onClick={async () => { const r = await send({ data: { channel: ch, to, text: "Teste do BatSignal ✅" } }); r.ok ? toast.success("Enviado") : toast.error(r.error); }}>Testar</Button>
    </div>
  );
}

function F({ label, v, on, type = "text" }: { label: string; v: string; on: (v: string) => void; type?: string }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label><Input type={type} value={v} onChange={(e) => on(e.target.value)} /></div>;
}

function Copyable({ label, value, copy }: { label: string; value: string; copy: (t: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2"><code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-2 text-xs">{value}</code>
        <Button size="icon" variant="ghost" onClick={() => copy(value)}><Copy className="h-4 w-4" /></Button></div>
    </div>
  );
}
