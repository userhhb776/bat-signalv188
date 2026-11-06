import { Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, Bell, Bot, CircleDollarSign, HelpCircle, List, LogOut, Megaphone, Menu, MessagesSquare, Puzzle, Settings, ChevronDown, Filter } from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRows, useSettings } from "@/lib/db";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const nav = [
  { to: "/", label: "Painel", icon: BarChart3 },
  { to: "/atendimento", label: "Atendimento", icon: MessagesSquare },
  { to: "/pedidos", label: "Pedidos", icon: List },
  { to: "/recuperacao", label: "Recuperação de vendas", icon: CircleDollarSign },
  { to: "/agentes", label: "Chatbots / Agentes de IA", icon: Bot },
  { to: "/automacoes", label: "Automações", icon: Megaphone },
  { to: "/funis", label: "Funis PV", icon: Filter },
  { to: "/integracoes", label: "Integrações", icon: Puzzle },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
  { to: "/ajuda", label: "Ajuda", icon: HelpCircle },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const settings = useSettings();
  const msgs = useRows("messages", { limit: 50 });
  const failed = (msgs.data ?? []).filter((m) => !m.ok).length;
  const navigate = useNavigate();

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card px-4">
          <button onClick={() => setOpen(!open)} className="text-muted-foreground hover:text-foreground" aria-label="Menu"><Menu className="h-6 w-6" /></button>
          <Link to="/" className="flex items-center gap-2">
            <img src="/icon-192.png" alt="" className="h-8 w-8 rounded-md" />
            <span className="font-display text-xl font-bold">BatSignal</span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm font-semibold tracking-wide sm:flex">
              <span className="h-2.5 w-2.5 rounded-full bg-success" /> ONLINE
            </span>
            <Link to="/ajuda" className="text-muted-foreground hover:text-foreground"><HelpCircle className="h-5 w-5" /></Link>
            <Link to="/atendimento" className="relative text-muted-foreground hover:text-foreground" aria-label="Notificações">
              <Bell className="h-5 w-5" />
              {failed > 0 && <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">{failed}</span>}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-semibold uppercase tracking-wide">
                {settings.data?.store_name ?? "Minha loja"} <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate({ to: "/configuracoes" })}><Settings className="h-4 w-4" /> Configurações</DropdownMenuItem>
                <DropdownMenuItem onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}><LogOut className="h-4 w-4" /> Sair</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-warning text-sm font-bold text-warning-foreground">
              {(settings.data?.store_name ?? "B").slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>
        <div className="flex flex-1">
          <aside className={`sticky top-16 h-[calc(100vh-4rem)] shrink-0 flex-col gap-1 border-r border-border bg-card py-3 ${open ? "flex w-60" : "hidden w-20 md:flex"}`}>
            {nav.map((n) => (
              <Tooltip key={n.to}>
                <TooltipTrigger asChild>
                  <Link
                    to={n.to}
                    activeOptions={{ exact: n.to === "/" }}
                    className="mx-2 flex items-center gap-3 rounded-xl px-4 py-3 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                    activeProps={{ className: "bg-accent text-primary" }}
                  >
                    <n.icon className="h-6 w-6 shrink-0" />
                    {open && <span className="text-sm">{n.label}</span>}
                  </Link>
                </TooltipTrigger>
                {!open && <TooltipContent side="right">{n.label}</TooltipContent>}
              </Tooltip>
            ))}
          </aside>
          <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function head(title: string, description: string) {
  return {
    meta: [
      { title: `${title} — BatSignal` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} — BatSignal` },
      { property: "og:description", content: description },
    ],
  };
}
