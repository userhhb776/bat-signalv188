import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { PageHeader, head } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/ajuda")({
  head: () => head("Ajuda", "Como configurar o BatSignal passo a passo."),
  component: Help,
});

const steps = [
  ["1. Configurações", "Escolha a IA (DeepSeek ou Ollama), cadastre seus servidores Render e defina qual servidor envia WhatsApp, SMS e e-mail."],
  ["2. Integrações", "Escolha a plataforma, informe o token e o servidor Render, e cole o link gerado no painel do gateway."],
  ["3. Agentes de IA", "Crie agentes de suporte e recuperação. Teste a conversa antes de ativar."],
  ["4. Automações", "Monte o fluxo com blocos de envio, condição, randomizador, IA e espera. Ative no botão do topo."],
  ["5. Agendador", "Em Configurações → Avançado, copie o link do agendador e cadastre em um serviço como cron-job.org para rodar a cada minuto."],
  ["6. Instalar no celular/computador", "No Chrome/Edge use “Instalar app”; no iPhone use Compartilhar → Adicionar à Tela de Início."],
];

function Help() {
  return (
    <>
      <PageHeader title="Ajuda" subtitle="Primeiros passos" />
      <div className="grid gap-3 md:grid-cols-2">
        {steps.map(([t, d]) => <Card key={t} className="p-5"><p className="font-semibold">{t}</p><p className="mt-1 text-sm text-muted-foreground">{d}</p></Card>)}
      </div>
    </>
  );
}
