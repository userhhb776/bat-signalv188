import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ReactFlow, Background, Controls, Handle, Position, addEdge, useEdgesState, useNodesState, type Connection, type NodeProps, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowDownCircle, ArrowUpCircle, CheckCircle2, CreditCard, FileText, Mail, MessageCircle, PlusCircle, QrCode, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRows, useSave } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/funis/$id")({
  head: () => ({ meta: [{ title: "Editar funil — BatSignal" }, { name: "description", content: "Construtor visual de funis de oferta." }, { property: "og:title", content: "Editar funil — BatSignal" }, { property: "og:description", content: "Construtor visual de funis de oferta." }] }),
  component: Editor,
});

type Kind = "pagina" | "checkout" | "bump" | "upsell" | "downsell" | "pix" | "email" | "whatsapp" | "obrigado";
type D = { title?: string; url?: string; price?: string; text?: string };
const meta: Record<Kind, { label: string; icon: React.ElementType; tone: string; split?: boolean }> = {
  pagina: { label: "Página de vendas", icon: FileText, tone: "bg-chart-4" },
  checkout: { label: "Checkout", icon: CreditCard, tone: "bg-primary" },
  bump: { label: "Order bump", icon: PlusCircle, tone: "bg-warning" },
  upsell: { label: "Upsell", icon: ArrowUpCircle, tone: "bg-success", split: true },
  downsell: { label: "Downsell", icon: ArrowDownCircle, tone: "bg-chart-2", split: true },
  pix: { label: "Pix gerado / não pago", icon: QrCode, tone: "bg-chart-5" },
  email: { label: "E-mail de recuperação", icon: Mail, tone: "bg-warning" },
  whatsapp: { label: "WhatsApp de recuperação", icon: MessageCircle, tone: "bg-success" },
  obrigado: { label: "Página de obrigado", icon: CheckCircle2, tone: "bg-chart-3" },
};

function Step({ data, type, selected }: NodeProps) {
  const M = meta[type as Kind];
  const d = data as D;
  return (
    <div className={`w-56 rounded-xl border bg-card p-3 text-card-foreground shadow-lg ${selected ? "border-primary" : "border-border"}`}>
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-2">
        <span className={`grid h-7 w-7 place-items-center rounded-full ${M.tone} text-background`}><M.icon className="h-4 w-4" /></span>
        <div className="min-w-0"><p className="truncate text-sm font-semibold">{d.title || M.label}</p><p className="text-[11px] text-muted-foreground">{M.label}{d.price ? ` · R$ ${d.price}` : ""}</p></div>
      </div>
      {M.split ? (
        <>
          <Handle id="yes" type="source" position={Position.Right} style={{ top: "35%" }} />
          <Handle id="no" type="source" position={Position.Right} style={{ top: "75%" }} />
          <div className="mt-2 flex justify-end gap-3 text-[10px] text-muted-foreground"><span>aceitou ↑</span><span>recusou ↓</span></div>
        </>
      ) : <Handle type="source" position={Position.Right} />}
    </div>
  );
}
const nodeTypes = Object.fromEntries(Object.keys(meta).map((k) => [k, Step]));

function Editor() {
  const { id } = Route.useParams();
  const list = useRows("funnels");
  const f = list.data?.find((x) => x.id === id);
  if (!list.data) return <p className="text-muted-foreground">Carregando...</p>;
  if (!f) return <p>Funil não encontrado. <Link to="/funis" className="text-primary">Voltar</Link></p>;
  return <Canvas key={f.id} id={f.id} name={f.name} initNodes={f.nodes as unknown as Node[]} initEdges={f.edges as unknown as Edge[]} />;
}

function Canvas({ id, name: n0, initNodes, initEdges }: { id: string; name: string; initNodes: Node[]; initEdges: Edge[] }) {
  const [name, setName] = useState(n0);
  const [nodes, setNodes, onNodes] = useNodesState(initNodes);
  const [edges, setEdges, onEdges] = useEdgesState(initEdges);
  const [sel, setSel] = useState<string | null>(null);
  const save = useSave("funnels");
  const onConnect = useCallback((c: Connection) => setEdges((e) => addEdge(c, e)), [setEdges]);
  useEffect(() => { if (sel && !nodes.some((x) => x.id === sel)) setSel(null); }, [nodes, sel]);
  const node = nodes.find((x) => x.id === sel);
  const d = (node?.data ?? {}) as D;
  const upd = (p: D) => setNodes((ns) => ns.map((x) => (x.id === sel ? { ...x, data: { ...x.data, ...p } } : x)));
  const add = (k: Kind) => setNodes((ns) => [...ns, { id: crypto.randomUUID().slice(0, 8), type: k, position: { x: 100 + ns.length * 40, y: 100 + ns.length * 30 }, data: {} }]);
  const persist = () => save.mutate({ id, name, nodes: nodes.map(({ id, type, position, data }) => ({ id, type, position, data })) as never, edges: edges.map(({ id, source, target, sourceHandle }) => ({ id, source, target, sourceHandle })) as never }, { onSuccess: () => toast.success("Funil salvo"), onError: (e) => toast.error(e.message) });

  return (
    <div className="-m-4 flex h-[calc(100vh-4rem)] md:-m-8">
      <aside className="w-64 shrink-0 space-y-1 overflow-y-auto border-r border-border bg-card p-3">
        <Link to="/funis" className="mb-2 block text-xs text-muted-foreground">← Funis</Link>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="mb-2" />
        <Button className="mb-3 w-full" onClick={persist}>Salvar funil</Button>
        <p className="text-xs font-medium uppercase text-muted-foreground">Etapas</p>
        {(Object.keys(meta) as Kind[]).map((k) => { const M = meta[k]; return (
          <button key={k} onClick={() => add(k)} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"><M.icon className="h-5 w-5 text-primary" /> {M.label}</button>
        ); })}
      </aside>
      <main className="relative flex-1">
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodes} onEdgesChange={onEdges} onConnect={onConnect} nodeTypes={nodeTypes} colorMode="dark"
          onNodeClick={(_, x) => setSel(x.id)} onPaneClick={() => setSel(null)} fitView>
          <Background gap={16} color="var(--border)" />
          <Controls />
        </ReactFlow>
        {node && (
          <div className="absolute right-3 top-3 z-10 w-72 space-y-3 rounded-xl border border-border bg-card p-4 shadow-xl">
            <div className="flex items-center justify-between"><p className="font-semibold">{meta[node.type as Kind].label}</p><button onClick={() => setSel(null)}><X className="h-4 w-4" /></button></div>
            <div className="space-y-1"><Label className="text-xs">Nome</Label><Input value={d.title ?? ""} onChange={(e) => upd({ title: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Link da página / checkout</Label><Input value={d.url ?? ""} placeholder="https://" onChange={(e) => upd({ url: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Preço (R$)</Label><Input value={d.price ?? ""} onChange={(e) => upd({ price: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Texto / mensagem</Label><Textarea rows={4} value={d.text ?? ""} onChange={(e) => upd({ text: e.target.value })} /></div>
            {d.url && <a href={d.url} target="_blank" rel="noreferrer" className="block text-xs text-primary">Abrir link ↗</a>}
            <Button variant="destructive" size="sm" onClick={() => setNodes((ns) => ns.filter((x) => x.id !== sel))}><Trash2 className="h-4 w-4" /> Remover etapa</Button>
          </div>
        )}
      </main>
    </div>
  );
}
