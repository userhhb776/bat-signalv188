import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/AppShell";
import { setState, uid, useStore, type Channel, type Settings } from "@/lib/store";
import { sendTestMessage } from "@/lib/actions.functions";

export const Route = createFileRoute("/conexoes")({
  head: () => ({
    meta: [
      { title: "Conexões — Vendas em Conversa" },
      { name: "description", content: "Gateways, WhatsApp, Telegram, SMS, e-mail e IA." },
      { property: "og:title", content: "Conexões — Vendas em Conversa" },
      { property: "og:description", content: "Gateways, WhatsApp, Telegram, SMS, e-mail e IA." },
    ],
  }),
  component: Connections,
});

const gatewayOptions = ["Kirvano", "Lastlink", "PerfectPay", "Cakto", "Hotmart", "Kiwify", "Yampi", "Cartpanda", "Outro"];

function Connections() {
  const gateways = useStore((s) => s.gateways);
  const settings = useStore((s) => s.settings);
  const [origin, setOrigin] = useState("");
  const [gwName, setGwName] = useState("Kirvano");
  const [gwToken, setGwToken] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const set = (patch: Partial<Settings>) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  const addGw = () => {
    setState((s) => ({ ...s, gateways: [...s.gateways, { id: "gw_" + uid(), name: gwName, token: gwToken, createdAt: new Date().toISOString() }] }));
    setGwToken("");
    toast.success(`${gwName} adicionado`);
  };

  return (
    <>
      <PageHeader title="Conexões" subtitle="Ligue seus gateways, canais de mensagem e a IA" />
      <Card className="mb-6 p-5">
        <h2 className="font-display text-lg font-bold">Gateways de pagamento</h2>
        <p className="mb-4 text-sm text-muted-foreground">Cada gateway recebe um link de webhook próprio. Cole esse link no painel do gateway. O token é opcional.</p>
        <div className="mb-4 flex flex-wrap gap-2">
          <select value={gwName} onChange={(e) => setGwName(e.target.value)} className="rounded-md border border-input bg-background px-3 text-sm">
            {gatewayOptions.map((g) => <option key={g}>{g}</option>)}
          </select>
          <Input value={gwToken} onChange={(e) => setGwToken(e.target.value)} placeholder="Token do webhook (opcional)" className="max-w-xs" />
          <Button onClick={addGw}><Plus className="h-4 w-4" /> Adicionar</Button>
        </div>
        <div className="space-y-2">
          {gateways.map((g) => {
            const url = `${origin}/api/public/webhook/${g.id}`;
            return (
              <div key={g.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3 text-sm">
                <span className="w-28 font-semibold">{g.name}</span>
                <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{url}</code>
                <span className="text-xs text-muted-foreground">{g.token ? "com token" : "sem token"}</span>
                <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copiado"); }}><Copy className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setState((s) => ({ ...s, gateways: s.gateways.filter((x) => x.id !== g.id) }))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <ChannelCard title="Telegram" desc="Token do bot criado no @BotFather." channel="telegram" toLabel="Chat ID">
          <Field label="Token do bot" value={settings.telegramToken} onChange={(v) => set({ telegramToken: v })} secret />
        </ChannelCard>
        <ChannelCard title="WhatsApp (Render)" desc="URL do seu servidor no Render que envia as mensagens." channel="whatsapp" toLabel="Número (5511...)">
          <Field label="URL de envio" value={settings.whatsappUrl} onChange={(v) => set({ whatsappUrl: v })} placeholder="https://seu-app.onrender.com/send" />
          <Field label="Chave de acesso" value={settings.whatsappKey} onChange={(v) => set({ whatsappKey: v })} secret />
        </ChannelCard>
        <ChannelCard title="SMS" desc="Endpoint que dispara SMS (Render ou provedor)." channel="sms" toLabel="Número">
          <Field label="URL de envio" value={settings.smsUrl} onChange={(v) => set({ smsUrl: v })} />
        </ChannelCard>
        <ChannelCard title="E-mail marketing" desc="Endpoint que dispara e-mails." channel="email" toLabel="E-mail">
          <Field label="URL de envio" value={settings.emailUrl} onChange={(v) => set({ emailUrl: v })} />
        </ChannelCard>
        <Card className="space-y-3 p-5 md:col-span-2">
          <h2 className="font-display text-lg font-bold">Inteligência artificial</h2>
          <p className="text-sm text-muted-foreground">Ollama ou qualquer IA compatível com OpenAI (Groq, OpenRouter...). O Ollama precisa estar acessível pela internet, não só no seu computador.</p>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Endereço" value={settings.aiBaseUrl} onChange={(v) => set({ aiBaseUrl: v })} />
            <Field label="Modelo padrão" value={settings.aiModel} onChange={(v) => set({ aiModel: v })} />
            <Field label="Chave (opcional)" value={settings.aiKey} onChange={(v) => set({ aiKey: v })} secret />
          </div>
        </Card>
      </div>
    </>
  );
}

function Field({ label, value, onChange, placeholder, secret }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; secret?: boolean }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type={secret ? "password" : "text"} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ChannelCard({ title, desc, channel, toLabel, children }: { title: string; desc: string; channel: Channel; toLabel: string; children: React.ReactNode }) {
  const settings = useStore((s) => s.settings);
  const send = useServerFn(sendTestMessage);
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const url = channel === "whatsapp" ? settings.whatsappUrl : channel === "sms" ? settings.smsUrl : channel === "email" ? settings.emailUrl : undefined;

  const test = async () => {
    setBusy(true);
    const r = await send({ data: { channel, to, text: "Teste do Vendas em Conversa ✅", telegramToken: settings.telegramToken || undefined, url: url || undefined, apiKey: channel === "whatsapp" ? settings.whatsappKey || undefined : undefined } });
    setBusy(false);
    r.ok ? toast.success("Mensagem enviada") : toast.error(r.error);
  };

  return (
    <Card className="space-y-3 p-5">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <p className="text-sm text-muted-foreground">{desc}</p>
      {children}
      <div className="flex gap-2 pt-2">
        <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder={toLabel} />
        <Button variant="secondary" disabled={!to || busy} onClick={test}>Testar</Button>
      </div>
    </Card>
  );
}
