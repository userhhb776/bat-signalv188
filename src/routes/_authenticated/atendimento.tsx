import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, head } from "@/components/AppShell";
import { channelLabel, useRows } from "@/lib/db";
import { sendTestMessage } from "@/lib/actions.functions";

export const Route = createFileRoute("/_authenticated/atendimento")({
  head: () => head("Atendimento", "Conversas e mensagens enviadas e recebidas por WhatsApp, Telegram, SMS e e-mail."),
  component: Inbox,
});

function Inbox() {
  const msgs = useRows("messages", { limit: 500 });
  const send = useServerFn(sendTestMessage);
  const qc = useQueryClient();
  const [channel, setChannel] = useState<"whatsapp" | "telegram" | "sms" | "email">("whatsapp");
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const r = await send({ data: { channel, to, text } });
    setBusy(false);
    qc.invalidateQueries({ queryKey: ["messages"] });
    if (r.ok) { toast.success("Mensagem enviada"); setText(""); } else toast.error(r.error);
  };

  return (
    <>
      <PageHeader title="Atendimento" subtitle="Histórico de conversas e envios. Mensagens recebidas aparecem com ←" />
      <Card className="mb-4 space-y-3 p-4">
        <p className="font-medium">Nova mensagem</p>
        <div className="flex flex-wrap gap-2">
          <select value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)} className="rounded-md border border-input bg-background px-3 text-sm">
            {Object.entries(channelLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder={channel === "email" ? "E-mail" : channel === "telegram" ? "Chat ID" : "Número com DDI (5511...)"} className="max-w-xs" />
        </div>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Mensagem" />
        <Button disabled={busy || !to || !text} onClick={submit}>Enviar</Button>
      </Card>
      <Card className="divide-y divide-border">
        {(msgs.data ?? []).map((m) => (
          <div key={m.id} className="flex gap-3 p-3 text-sm">
            <span className="w-20 shrink-0 font-medium">{channelLabel[m.channel] ?? m.channel}</span>
            <span className="w-36 shrink-0 truncate text-muted-foreground">{m.recipient}</span>
            <span className="min-w-0 flex-1 whitespace-pre-wrap">{m.body}{!m.ok && <span className="block text-xs text-destructive">{m.error}</span>}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("pt-BR")}</span>
          </div>
        ))}
        {!msgs.data?.length && <p className="p-10 text-center text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>}
      </Card>
    </>
  );
}
