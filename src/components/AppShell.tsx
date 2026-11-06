import { Link } from "@tanstack/react-router";
import { Bot, LayoutDashboard, Plug, ShoppingCart, Workflow, MessagesSquare } from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "Painel", icon: LayoutDashboard },
  { to: "/carrinhos", label: "Carrinhos", icon: ShoppingCart },
  { to: "/agentes", label: "Agentes de IA", icon: Bot },
  { to: "/automacoes", label: "Automações", icon: Workflow },
  { to: "/conexoes", label: "Conexões", icon: Plug },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background font-sans text-foreground">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-card/40 p-4 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <MessagesSquare className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-bold">Vendas em Conversa</span>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
              activeProps={{ className: "bg-accent text-foreground font-semibold" }}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <nav className="flex gap-1 overflow-x-auto border-b border-border p-2 md:hidden">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }} className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted-foreground" activeProps={{ className: "bg-accent text-foreground" }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
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
