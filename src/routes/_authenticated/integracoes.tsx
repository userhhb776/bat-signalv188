import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader, head } from "@/components/AppShell";
import { useRemove, useRows, useSave } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/integracoes")({
  head: () => head("Integrações", "Conecte seus gateways de pagamento ao BatSignal."),
  component: Integrations,
});

// Platforms that sign their webhooks with a token you copy from their dashboard.
const platforms: { name: string; token: boolean; hint: string }[] = [
  { name: "Hotmart", token: true, hint: "Hottok em Ferramentas → Webhook" },
  { name: "Kiwify", token: true, hint: "Token gerado ao criar o webhook" },
  { name: "Kirvano", token: true, hint: "Token em Integrações → Webhooks" },
  { name: "Eduzz", token: true, hint: "Chave do webhook" },
  { name: "Monetizze", token: true, hint: "Chave única em Ferramentas → Postback" },
  { name: "PerfectPay", token: true, hint: "Token do postback" },
  { name: "Braip", token: true, hint: "Chave única do postback" },
  { name: "Cakto", token: true, hint: "Secret do webhook" },
  { name: "Lastlink", token: true, hint: "Token do webhook" },
  { name: "Ticto", token: true, hint: "Token do postback" },
  { name: "Yampi", token: true, hint: "Chave secreta do webhook" },
  { name: "Cartpanda", token: true, hint: "Token do webhook" },
  { name: "Appmax", token: true, hint: "Token do webhook" },
  { name: "Pagar.me", token: false, hint: "" },
  { name: "Shopify", token: false, hint: "" },
  { name: "WooCommerce", token: true, hint: "Segredo do webhook" },
  { name: "Outro", token: false, hint: "" },
];

function Integrations() {
  const gws = useRows("gateways");
  const servers = useRows("render_servers");
  const save = useSave("gateways");
  const remove = useRemove("gateways");
  const [origin, setOrigin] = useState("");
  const [platform, setPlatform] = useState("Hotmart");
  const [token, setToken] = useState("");
  const [server, setServer] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const p = platforms.find((x) => x.name === platform)!;
  const noServers = !servers.isLoading && !servers.data?.length;

  const add = () => {
    if (!server) { toast.error("Escolha um servidor Render"); return; }
    if (p.token && !token) { toast.error(`${platform} exige token`); return; }
    save.mutate({ platform, name: platform, token, render_server_id: server, active: true }, {
      onSuccess: () => { setToken(""); toast.success(`${platform} conectado`); },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <>
      <PageHeader title="Integrações" subtitle="Cada gateway recebe um link de webhook próprio. Cole esse link no painel da plataforma." />
      {noServers && (
        <Card className="mb-4 border-warning p-4 text-sm">
          Para conectar um webhook você precisa de um servidor Render cadastrado. <Link to="/configuracoes" className="font-semibold text-primary">Cadastrar em Configurações</Link>
        </Card>
      )}
      <Card className="mb-6 space-y-3 p-5">
        <h2 className="font-display text-lg font-bold">Novo gateway</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1"><Label>Plataforma</Label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {platforms.map((x) => <option key={x.name}>{x.name}</option>)}
            </select></div>
          <div className="space-y-1 md:col-span-2"><Label>Token {p.token ? "(obrigatório)" : "(opcional)"}</Label>
            <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder={p.hint || "Token / segredo do webhook"} /></div>
          <div className="space-y-1"><Label>Servidor Render</Label>
            <select value={server} onChange={(e) => setServer(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Escolha...</option>
              {(servers.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></div>
        </div>
        <Button onClick={add} disabled={noServers}><Plus className="h-4 w-4" /> Conectar</Button>
      </Card>

      <div className="space-y-2">
        {(gws.data ?? []).map((g) => {
          const url = `${origin}/api/public/webhook/${g.id}`;
          return (
            <Card key={g.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
              <span className="w-28 font-semibold">{g.platform}</span>
              <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{url}</code>
              <span className="text-xs text-muted-foreground">{servers.data?.find((s) => s.id === g.render_server_id)?.name ?? "sem servidor"} · {g.token ? "com token" : "sem token"}</span>
              <Switch checked={g.active} onCheckedChange={(v) => save.mutate({ id: g.id, active: v })} />
              <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copiado"); }}><Copy className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(g.id)}><Trash2 className="h-4 w-4" /></Button>
            </Card>
          );
        })}
        {!gws.data?.length && <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum gateway conectado.</Card>}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Use o link do app publicado (não o do editor) no painel da plataforma. O token pode chegar no cabeçalho, no corpo (token/hottok) ou no link como ?token=.</p>
    </>
  );
}
