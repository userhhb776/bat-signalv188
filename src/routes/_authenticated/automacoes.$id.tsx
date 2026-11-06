import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow, Background, Controls, Handle, Position, addEdge, useEdgesState, useNodesState, type Connection, type NodeProps, type Node, type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Bot, Clock, GitBranch, Mail, MessageCircle, MessageSquare, Send, Shuffle, Webhook, X, Zap, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useRows, useSave } from "@/lib/db";
import { triggerLabel, type FlowNode, type NodeKind } from "@/lib/flow-types";

export const Route = createFileRoute("/_authenticated/automacoes/$id")({
  head: () => ({ meta: [{ title: "Editar automação — BatSignal" }, { name: "description", content: "Editor visual de automações." }, { property: "og:title", content: "Editar automação — BatSignal" }, { property: "og:description", content: "Editor visual de automações." }] }),
  component: FlowEditorPage,
});

const meta: Record<NodeKind, { label: string; icon: React.ElementType; tone: string }> = {
  trigger: { label: "Gatilho", icon: Zap, tone: "bg-chart-4" },
  email: { label: "Enviar E-mail", icon: Mail, tone: "bg-warning" },
  whatsapp: { label: "Enviar WhatsApp", icon: MessageCircle, tone: "bg-success" },
  sms: { label: "Enviar SMS", icon: MessageSquare, tone: "bg-primary" },
  telegram: { label: "Enviar Telegram", icon: Send, tone: "bg-chart-4" },
  webhook: { label: "Enviar Webhook", icon: Webhook, tone: "bg-chart-3" },
  condition: { label: "Condição", icon: GitBranch, tone: "bg-destructive" },
  random: { label: "Randomizador", icon: Shuffle, tone: "bg-destructive" },
  ai: { label: "Agente de IA", icon: Bot, tone: "bg-chart-3" },
  wait: { label: "Aguardar", icon: Clock, tone: "bg-chart-5" },
};
const groups: [string, NodeKind[]][] = [["Ação", ["email", "whatsapp", "sms", "telegram", "webhook"]], ["Lógico", ["condition", "random", "ai"]], ["Tempo", ["wait"]]];

type D = FlowNode["data"] & { trigger?: string };

function summary(type: NodeKind, d: D) {
  if (type === "trigger") return triggerLabel[d.trigger ?? ""] ?? "";
  if (type === "wait") { const m = d.minutes ?? 60; return m >= 1440 ? `${m / 1440} dia(s)` : m >= 60 ? `${m / 60} hora(s)` : `${m} min`; }
  if (type === "condition") return `${d.field ?? "status"} ${({ eq: "=", neq: "≠", gt: ">", lt: "<" })[d.op ?? "eq"]} ${d.value ?? ""}`;
  if (type === "random") return `A ${d.percent ?? 50}% · B ${100 - (d.percent ?? 50)}%`;
  if (type === "webhook") return d.url ?? "";
  return d.subject || d.text || "";
}

function BlockNode({ type, data, selected }: NodeProps<Node<D>>) {
  const k = type as NodeKind;
  const M = meta[k];
  return (
    <div className={`w-56 rounded-xl border bg-card p-3 text-card-foreground shadow-lg ${selected ? "border-primary" : "border-border"}`}>
      {k !== "trigger" && <Handle type="target" position={Position.Left} />}
      <div className="flex items-center gap-2">
        <span className={`grid h-7 w-7 place-items-center rounded-full ${M.tone} text-background`}><M.icon className="h-4 w-4" /></span>
        <span className="text-[10px] font-semibold uppercase text-muted-foreground">{M.label}</span>
      </div>
      <p className="mt-2 line-clamp-3 text-xs">{summary(k, data) || <span className="text-muted-foreground">Clique para configurar</span>}</p>
      {k === "condition" ? (<>
        <Handle id="yes" type="source" position={Position.Right} style={{ top: "35%", background: "var(--success)" }} />
        <Handle id="no" type="source" position={Position.Right} style={{ top: "75%", background: "var(--destructive)" }} />
        <div className="absolute -right-8 top-[25%] text-[10px] text-success">Sim</div><div className="absolute -right-8 top-[65%] text-[10px] text-destructive">Não</div>
      </>) : k === "random" ? (<>
        <Handle id="a" type="source" position={Position.Right} style={{ top: "35%" }} />
        <Handle id="b" type="source" position={Position.Right} style={{ top: "75%" }} />
        <div className="absolute -right-5 top-[25%] text-[10px]">A</div><div className="absolute -right-5 top-[65%] text-[10px]">B</div>
      </>) : <Handle id="out" type="source" position={Position.Right} />}
    </div>
  );
}
const nodeTypes = Object.fromEntries(Object.keys(meta).map((k) => [k, BlockNode]));

function FlowEditorPage() {
  const { id } = Route.useParams();
  const flows = useRows("flows");
  const f = flows.data?.find((x) => x.id === id);
  if (flows.isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (!f) return <p>Automação não encontrada. <Link to="/automacoes" className="text-primary">Voltar</Link></p>;
  return <Editor flow={f} />;
}

function Editor({ flow }: { flow: NonNullable<ReturnType<typeof useRows<"flows">>["data"]>[number] }) {
  const save = useSave("flows");
  const agents = useRows("agents");
  const nav = useNavigate();
  const [name, setName] = useState(flow.name);
  const [trigger, setTrigger] = useState(flow.trigger);
  const [active, setActive] = useState(flow.active);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<D>>((flow.nodes as unknown as FlowNode[]).map((n) => ({ ...n, data: { ...n.data } })));
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>((flow.edges as unknown as Edge[]).map((e) => ({ ...e, animated: true })));
  const [sel, setSel] = useState<string | null>(null);
  const selected = nodes.find((n) => n.id === sel);

  useEffect(() => { setNodes((ns) => ns.map((n) => (n.type === "trigger" ? { ...n, data: { ...n.data, trigger } } : n))); }, [trigger, setNodes]);
  const onConnect = useCallback((c: Connection) => setEdges((es) => addEdge({ ...c, animated: true }, es)), [setEdges]);

  const add = (type: NodeKind) => {
    const id = Math.random().toString(36).slice(2, 9);
    const defaults: D = type === "wait" ? { minutes: 60 } : type === "condition" ? { field: "status", op: "neq", value: "approved" } : type === "random" ? { percent: 50 } : type === "ai" ? { channel: "whatsapp" } : { text: "" };
    setNodes((ns) => [...ns, { id, type, position: { x: 200 + ns.length * 40, y: 120 + ns.length * 30 }, data: defaults }]);
    setSel(id);
  };
  const patch = (d: Partial<D>) => setNodes((ns) => ns.map((n) => (n.id === sel ? { ...n, data: { ...n.data, ...d } } : n)));

  const persist = async (close: boolean) => {
    const cleanNodes: FlowNode[] = nodes.map((n) => ({ id: n.id, type: n.type as NodeKind, position: n.position, data: n.data }));
    const cleanEdges = edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? "out" }));
    await save.mutateAsync({ id: flow.id, name, trigger, active, nodes: cleanNodes as never, edges: cleanEdges as never });
    toast.success("Automação salva");
    if (close) nav({ to: "/automacoes" });
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      <div className="flex h-16 items-center gap-4 border-b border-border bg-card px-4">
        <Link to="/automacoes" className="text-muted-foreground hover:text-foreground"><X className="h-6 w-6" /></Link>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-md border-0 bg-transparent text-xl font-medium" />
        <select value={trigger} onChange={(e) => setTrigger(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          {Object.entries(triggerLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-4">
          <Switch checked={active} onCheckedChange={setActive} />
          <Button variant="ghost" className="uppercase tracking-wide" onClick={() => persist(false)}>Salvar</Button>
          <Button className="uppercase tracking-wide" onClick={() => persist(true)}>Salvar e fechar</Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <aside className="w-72 shrink-0 overflow-y-auto border-r border-border bg-card p-4">
          {selected ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between"><p className="font-medium">{meta[selected.type as NodeKind].label}</p>
                <button className="text-xs text-muted-foreground" onClick={() => setSel(null)}>voltar</button></div>
              <NodeForm type={selected.type as NodeKind} d={selected.data} patch={patch} agents={agents.data ?? []} />
              {selected.type !== "trigger" && <Button variant="ghost" size="sm" onClick={() => { setNodes((ns) => ns.filter((n) => n.id !== sel)); setEdges((es) => es.filter((e) => e.source !== sel && e.target !== sel)); setSel(null); }}><Trash2 className="h-4 w-4" /> Remover bloco</Button>}
            </div>
          ) : groups.map(([g, items]) => (
            <div key={g} className="mb-4">
              <p className="mb-2 text-sm text-muted-foreground">{g}</p>
              {items.map((k) => { const M = meta[k]; return (
                <button key={k} onClick={() => add(k)} className="flex w-full items-center gap-4 rounded-md px-2 py-3 text-left hover:bg-accent">
                  <M.icon className="h-5 w-5 text-primary" /> {M.label}
                </button>); })}
            </div>
          ))}
        </aside>
        <div className="flex-1">
          <ReactFlow colorMode="dark" nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect} onNodeClick={(_, n) => setSel(n.id)} onPaneClick={() => setSel(null)} fitView deleteKeyCode={["Backspace", "Delete"]}>
            <Background gap={16} />
            <Controls />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

function NodeForm({ type, d, patch, agents }: { type: NodeKind; d: D; patch: (d: Partial<D>) => void; agents: { id: string; name: string }[] }) {
  const vars = <p className="text-xs text-muted-foreground">Variáveis: {"{nome} {nome_completo} {produto} {valor} {link} {pix} {email} {telefone}"}</p>;
  if (type === "trigger") return <p className="text-sm text-muted-foreground">Escolha o gatilho no topo da tela. A automação começa quando o gateway enviar esse evento.</p>;
  if (type === "wait") return (<div className="space-y-1"><Label>Aguardar (minutos)</Label><Input type="number" min={1} value={d.minutes ?? 60} onChange={(e) => patch({ minutes: Number(e.target.value) })} /><p className="text-xs text-muted-foreground">1440 = 1 dia</p></div>);
  if (type === "random") return (<div className="space-y-1"><Label>% para o caminho A</Label><Input type="number" min={0} max={100} value={d.percent ?? 50} onChange={(e) => patch({ percent: Number(e.target.value) })} /></div>);
  if (type === "webhook") return (<div className="space-y-1"><Label>URL</Label><Input value={d.url ?? ""} onChange={(e) => patch({ url: e.target.value })} placeholder="https://..." /><p className="text-xs text-muted-foreground">Envia os dados do pedido em JSON.</p></div>);
  if (type === "condition") return (
    <div className="space-y-2">
      <Label>Se</Label>
      <select value={d.field} onChange={(e) => patch({ field: e.target.value as D["field"] })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
        <option value="status">Status do pedido</option><option value="payment_method">Forma de pagamento</option><option value="value">Valor</option><option value="recovered">Recuperado</option>
      </select>
      <select value={d.op} onChange={(e) => patch({ op: e.target.value as D["op"] })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
        <option value="eq">for igual a</option><option value="neq">for diferente de</option><option value="gt">for maior que</option><option value="lt">for menor que</option>
      </select>
      <Input value={d.value ?? ""} onChange={(e) => patch({ value: e.target.value })} />
      <p className="text-xs text-muted-foreground">Status: approved, pending, abandoned, canceled, refunded. Pagamento: pix, boleto, cartao. Recuperado: true/false.</p>
    </div>
  );
  if (type === "ai") return (
    <div className="space-y-2">
      <Label>Agente</Label>
      <select value={d.agentId ?? ""} onChange={(e) => patch({ agentId: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
        <option value="">Escolha...</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <Label>Enviar por</Label>
      <select value={d.channel} onChange={(e) => patch({ channel: e.target.value as D["channel"] })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
        <option value="whatsapp">WhatsApp</option><option value="sms">SMS</option><option value="email">E-mail</option>
      </select>
      <Label>Orientação extra</Label><Textarea value={d.text ?? ""} onChange={(e) => patch({ text: e.target.value })} />
      <p className="text-xs text-muted-foreground">A IA escreve uma mensagem personalizada com os dados do pedido.</p>
    </div>
  );
  return (
    <div className="space-y-2">
      {type === "email" && (<><Label>Assunto</Label><Input value={d.subject ?? ""} onChange={(e) => patch({ subject: e.target.value })} /></>)}
      {type === "telegram" && (<><Label>Chat ID de destino</Label><Input value={d.value ?? ""} onChange={(e) => patch({ value: e.target.value })} /></>)}
      <Label>Mensagem</Label><Textarea rows={8} value={d.text ?? ""} onChange={(e) => patch({ text: e.target.value })} />
      {vars}
    </div>
  );
}
