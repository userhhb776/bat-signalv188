import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — BatSignal" },
      { name: "description", content: "Acesse seu painel BatSignal de recuperação de vendas." },
      { property: "og:title", content: "Entrar — BatSignal" },
      { property: "og:description", content: "Acesse seu painel BatSignal de recuperação de vendas." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { toast.error("E-mail ou senha incorretos."); return; }
    nav({ to: "/" });
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <img src="/icon-192.png" alt="" className="h-10 w-10 rounded-lg" />
          <h1 className="font-display text-2xl font-bold">BatSignal</h1>
        </div>
        <p className="text-sm text-muted-foreground">Acesso restrito</p>
        <div className="space-y-1"><Label>E-mail</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-1"><Label>Senha</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <Button className="w-full" disabled={busy}>Entrar</Button>
      </form>
    </div>
  );
}
