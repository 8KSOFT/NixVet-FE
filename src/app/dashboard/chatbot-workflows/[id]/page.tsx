'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  Handle,
  Position,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  Loader2, Save, ArrowLeft, Trash2,
  Play, Square, GitBranch, Zap, Bot,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';

// Brand-aligned node colors (using CSS variables where possible)
const NODE_COLORS: Record<string, string> = {
  trigger: '#7fa48e',   // brand-green / primary
  condition: '#d4af37', // brand-gold
  action: '#0e1e2f',    // brand-deep
  end: '#dc2626',       // destructive
};

const NODE_TEXT_COLORS: Record<string, string> = {
  trigger: '#fff',
  condition: '#1a1200',
  action: '#fff',
  end: '#fff',
};

const ACTION_TYPES = [
  { value: 'GET_AVAILABILITY', label: 'Buscar Disponibilidade', description: 'Consulta horários livres na agenda' },
  { value: 'GENERATE_AI_REPLY', label: 'Resposta com IA', description: 'Gera resposta usando GPT' },
  { value: 'SEND_MESSAGE', label: 'Enviar Mensagem Fixa', description: 'Envia texto fixo ao tutor' },
  { value: 'CREATE_CONSULTATION', label: 'Criar Consulta', description: 'Agenda consulta automaticamente' },
  { value: 'NOTIFY_TEAM', label: 'Notificar Equipe', description: 'Cria notificação interna' },
  { value: 'PAUSE_BOT', label: 'Pausar Bot', description: 'Pausa respostas automáticas' },
  { value: 'WAIT_REPLY', label: 'Aguardar Resposta', description: 'Espera próxima mensagem' },
];

interface BackendNode {
  node_type: string;
  node_key: string;
  label?: string;
  config?: Record<string, unknown>;
  position_x?: number;
  position_y?: number;
}

interface BackendEdge {
  source_node: string;
  target_node: string;
  condition?: string;
}

interface WorkflowData {
  id: string;
  name: string;
  is_active: boolean;
  nodes: BackendNode[];
  edges: BackendEdge[];
}

function NodeChip({ type, label }: { type: string; label: string }) {
  const bg = NODE_COLORS[type] || '#666';
  const fg = NODE_TEXT_COLORS[type] || '#fff';
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: bg, color: fg }}
    >
      {label}
    </span>
  );
}

function TriggerNode({ data }: NodeProps) {
  return (
    <div className="rounded-xl border-2 shadow-md px-4 py-2.5 min-w-[160px] bg-white" style={{ borderColor: NODE_COLORS.trigger }}>
      <Handle type="source" position={Position.Bottom} style={{ background: NODE_COLORS.trigger }} />
      <div className="flex items-center gap-2">
        <Play className="w-3.5 h-3.5 shrink-0" style={{ color: NODE_COLORS.trigger }} />
        <span className="text-xs font-semibold" style={{ color: NODE_COLORS.trigger }}>
          {(data as any).label || 'Trigger'}
        </span>
      </div>
    </div>
  );
}

function ConditionNode({ data }: NodeProps) {
  const branches = ((data as any).config?.branches ?? []) as Array<{ value: string; target: string }>;
  return (
    <div className="rounded-xl border-2 shadow-md px-4 py-2.5 min-w-[190px] bg-white" style={{ borderColor: NODE_COLORS.condition }}>
      <Handle type="target" position={Position.Top} style={{ background: NODE_COLORS.condition }} />
      <div className="flex items-center gap-2 mb-1">
        <GitBranch className="w-3.5 h-3.5 shrink-0" style={{ color: NODE_COLORS.condition }} />
        <span className="text-xs font-semibold" style={{ color: '#8a6d00' }}>
          {(data as any).label || 'Condição'}
        </span>
      </div>
      {branches.length > 0 && (
        <div className="text-[10px] text-muted-foreground space-y-0.5 border-t border-dashed pt-1" style={{ borderColor: `${NODE_COLORS.condition}40` }}>
          {branches.map((b, i) => (
            <div key={i} className="font-mono">{b.value} → {b.target}</div>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: NODE_COLORS.condition }} />
    </div>
  );
}

function ActionNode({ data }: NodeProps) {
  const actionType = ((data as any).config?.action_type as string) || '?';
  const actionDef = ACTION_TYPES.find((a) => a.value === actionType);
  return (
    <div className="rounded-xl border-2 shadow-md px-4 py-2.5 min-w-[170px] bg-white" style={{ borderColor: NODE_COLORS.action }}>
      <Handle type="target" position={Position.Top} style={{ background: NODE_COLORS.action }} />
      <div className="flex items-center gap-2">
        <Zap className="w-3.5 h-3.5 shrink-0" style={{ color: NODE_COLORS.action }} />
        <span className="text-xs font-semibold" style={{ color: NODE_COLORS.action }}>
          {(data as any).label || 'Ação'}
        </span>
      </div>
      {actionDef && (
        <div className="text-[10px] text-muted-foreground mt-0.5">{actionDef.label}</div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: NODE_COLORS.action }} />
    </div>
  );
}

function EndNode({ data }: NodeProps) {
  return (
    <div className="rounded-xl border-2 shadow-md px-4 py-2.5 min-w-[110px] bg-white" style={{ borderColor: NODE_COLORS.end }}>
      <Handle type="target" position={Position.Top} style={{ background: NODE_COLORS.end }} />
      <div className="flex items-center gap-2">
        <Square className="w-3.5 h-3.5 shrink-0" style={{ color: NODE_COLORS.end }} />
        <span className="text-xs font-semibold" style={{ color: NODE_COLORS.end }}>
          {(data as any).label || 'Fim'}
        </span>
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
  end: EndNode,
};

function toReactFlowNodes(backendNodes: BackendNode[]): Node[] {
  return backendNodes.map((n) => ({
    id: n.node_key,
    type: n.node_type,
    position: { x: n.position_x ?? 0, y: n.position_y ?? 0 },
    data: { label: n.label, config: n.config },
  }));
}

function toReactFlowEdges(backendEdges: BackendEdge[]): Edge[] {
  return backendEdges.map((e, i) => ({
    id: `e-${e.source_node}-${e.target_node}-${i}`,
    source: e.source_node,
    target: e.target_node,
    label: e.condition || undefined,
    animated: true,
    style: { strokeWidth: 2, stroke: '#7fa48e' },
  }));
}

function toBackendNodes(rfNodes: Node[]): BackendNode[] {
  return rfNodes.map((n) => ({
    node_type: n.type || 'action',
    node_key: n.id,
    label: (n.data as any)?.label ?? null,
    config: (n.data as any)?.config ?? {},
    position_x: Math.round(n.position.x),
    position_y: Math.round(n.position.y),
  }));
}

function toBackendEdges(rfEdges: Edge[]): BackendEdge[] {
  return rfEdges.map((e) => ({
    source_node: e.source,
    target_node: e.target,
    condition: (e.label as string) || undefined,
  }));
}

const NODE_PALETTE = [
  { type: 'condition', label: 'Condição', icon: GitBranch, description: 'Ramifica por intent ou variável' },
  { type: 'action', label: 'Ação', icon: Zap, description: 'Executa operação (IA, agenda, mensagem...)' },
  { type: 'end', label: 'Fim', icon: Square, description: 'Encerra o fluxo desta mensagem' },
] as const;

export default function WorkflowEditorPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;

  const [workflowName, setWorkflowName] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<WorkflowData>(`/chatbot-workflows/${workflowId}`);
        setWorkflowName(res.data.name);
        setIsActive(res.data.is_active);
        setNodes(toReactFlowNodes(res.data.nodes ?? []));
        setEdges(toReactFlowEdges(res.data.edges ?? []));
      } catch {
        toast.error('Erro ao carregar workflow');
      } finally {
        setLoading(false);
      }
    })();
  }, [workflowId]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({
        ...connection,
        animated: true,
        style: { strokeWidth: 2, stroke: '#7fa48e' },
      }, eds));
    },
    [setEdges],
  );

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSheetOpen(true);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/chatbot-workflows/${workflowId}`, {
        name: workflowName,
        is_active: isActive,
        nodes: toBackendNodes(nodes),
        edges: toBackendEdges(edges),
      });
      toast.success('Workflow salvo');
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const addNode = (type: string) => {
    const key = `${type}_${Date.now()}`;
    const newNode: Node = {
      id: key,
      type,
      position: { x: 250, y: 200 + nodes.length * 90 },
      data: {
        label: type === 'condition' ? 'Condição' : type === 'end' ? 'Fim' : 'Nova Ação',
        config: type === 'action'
          ? { action_type: 'GENERATE_AI_REPLY' }
          : type === 'condition'
          ? { variable: 'intent', branches: [] }
          : {},
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
    setSheetOpen(false);
  };

  const updateNodeData = (field: string, value: unknown) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== selectedNode.id) return n;
        return { ...n, data: { ...n.data, [field]: value } };
      }),
    );
    setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, [field]: value } } : prev);
  };

  const updateNodeConfig = (key: string, value: unknown) => {
    if (!selectedNode) return;
    const currentConfig = ((selectedNode.data as any)?.config ?? {}) as Record<string, unknown>;
    updateNodeData('config', { ...currentConfig, [key]: value });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const nodeConfig = ((selectedNode?.data as any)?.config ?? {}) as Record<string, unknown>;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/chatbot-workflows')} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <Input
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          className="w-64 h-9"
          placeholder="Nome do workflow"
        />
        {isActive ? (
          <Badge className="bg-primary/10 text-primary border-primary/20 gap-1">
            <CheckCircle2 className="w-3 h-3" /> Ativo
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-muted-foreground">Inativo</Badge>
        )}
        <div className="flex-1" />
        <Button onClick={handleSave} disabled={saving} className="bg-primary gap-1.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar
        </Button>
      </div>

      {/* Layout: palette + canvas */}
      <div className="flex flex-1 gap-3 overflow-hidden">
        {/* Node palette */}
        <div className="w-44 shrink-0 flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-1">Adicionar nó</p>
          <TooltipProvider>
            {NODE_PALETTE.map((item) => {
              const Icon = item.icon;
              return (
                <Tooltip key={item.type}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => addNode(item.type)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors w-full text-left',
                        'hover:bg-muted/60 border-border',
                      )}
                    >
                      <span
                        className="flex size-6 items-center justify-center rounded shrink-0"
                        style={{ background: `${NODE_COLORS[item.type]}18` }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: NODE_COLORS[item.type] }} />
                      </span>
                      <span className="text-foreground text-xs">{item.label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">{item.description}</TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>

          <Separator className="my-1" />
          <p className="text-[10px] text-muted-foreground/70 px-1 leading-relaxed">
            Clique em um nó para configurar. Arraste para mover. Conecte as saídas às entradas.
          </p>

          {/* Legend */}
          <div className="space-y-1.5 mt-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-1">Legenda</p>
            {Object.entries(NODE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2 px-1">
                <div className="size-2.5 rounded-sm shrink-0" style={{ background: color }} />
                <span className="text-[11px] text-muted-foreground capitalize">{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 border rounded-xl overflow-hidden bg-muted/20">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode="Delete"
          >
            <Background color="#e0e6ed" gap={18} />
            <Controls />
            <MiniMap
              nodeColor={(n) => NODE_COLORS[n.type || ''] || '#999'}
              className="!bg-card !border !border-border"
            />
          </ReactFlow>
        </div>
      </div>

      {/* Config Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[380px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selectedNode && (
                <NodeChip type={selectedNode.type || ''} label={selectedNode.type || ''} />
              )}
              Configurar Nó
            </SheetTitle>
            <SheetDescription className="sr-only">Configuração do nó selecionado</SheetDescription>
          </SheetHeader>

          {selectedNode && (
            <div className="space-y-4 mt-4">
              <div>
                <Label>Label</Label>
                <Input
                  className="mt-1.5"
                  value={(selectedNode.data as any)?.label || ''}
                  onChange={(e) => updateNodeData('label', e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <p className="text-sm text-foreground capitalize mt-0.5">{selectedNode.type}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Key</Label>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5 break-all">{selectedNode.id}</p>
                </div>
              </div>

              {selectedNode.type === 'action' && (
                <>
                  <Separator />
                  <div>
                    <Label>Tipo de Ação</Label>
                    <Select
                      value={(nodeConfig.action_type as string) || ''}
                      onValueChange={(v) => updateNodeConfig('action_type', v)}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTION_TYPES.map((a) => (
                          <SelectItem key={a.value} value={a.value}>
                            <div>
                              <p className="font-medium">{a.label}</p>
                              <p className="text-xs text-muted-foreground">{a.description}</p>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {nodeConfig.action_type === 'SEND_MESSAGE' && (
                    <div>
                      <Label>Texto da mensagem</Label>
                      <textarea
                        className="w-full border border-border rounded-md p-2 text-sm min-h-[80px] mt-1.5 bg-background"
                        value={((nodeConfig.params as any)?.text as string) || ''}
                        onChange={(e) => updateNodeConfig('params', { ...((nodeConfig.params ?? {}) as any), text: e.target.value })}
                      />
                    </div>
                  )}

                  {nodeConfig.action_type === 'GET_AVAILABILITY' && (
                    <div>
                      <Label>Dias à frente</Label>
                      <Input
                        type="number"
                        className="mt-1.5"
                        value={((nodeConfig.params as any)?.days_ahead as number) || 4}
                        onChange={(e) => updateNodeConfig('params', { ...((nodeConfig.params ?? {}) as any), days_ahead: Number(e.target.value) })}
                      />
                    </div>
                  )}

                  {nodeConfig.action_type === 'NOTIFY_TEAM' && (
                    <div>
                      <Label>Mensagem de notificação</Label>
                      <Input
                        className="mt-1.5"
                        value={((nodeConfig.params as any)?.message as string) || ''}
                        onChange={(e) => updateNodeConfig('params', { ...((nodeConfig.params ?? {}) as any), message: e.target.value })}
                      />
                    </div>
                  )}

                  <div>
                    <Label>Variável de saída <span className="text-muted-foreground text-xs font-normal">(output_var)</span></Label>
                    <Input
                      className="mt-1.5"
                      value={(nodeConfig.output_var as string) || ''}
                      onChange={(e) => updateNodeConfig('output_var', e.target.value)}
                      placeholder="Ex: availabilityContext"
                    />
                  </div>
                </>
              )}

              {selectedNode.type === 'condition' && (
                <>
                  <Separator />
                  <div>
                    <Label>Variável de condição</Label>
                    <Input
                      className="mt-1.5"
                      value={(nodeConfig.variable as string) || 'intent'}
                      onChange={(e) => updateNodeConfig('variable', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Valores comuns: intent, message</p>
                  </div>
                  <div>
                    <Label>Branches <span className="text-muted-foreground text-xs font-normal">(JSON)</span></Label>
                    <textarea
                      className="w-full border border-border rounded-md p-2 text-xs font-mono min-h-[120px] mt-1.5 bg-background"
                      value={JSON.stringify(nodeConfig.branches ?? [], null, 2)}
                      onChange={(e) => {
                        try {
                          updateNodeConfig('branches', JSON.parse(e.target.value));
                        } catch {}
                      }}
                    />
                    <p className="text-[11px] text-muted-foreground/60 mt-1">
                      {'[{"value":"AGENDAMENTO","target":"node_key"}, {"value":"__default__","target":"..."}]'}
                    </p>
                  </div>
                </>
              )}

              <Separator />
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={deleteSelectedNode}
                disabled={selectedNode.type === 'trigger'}
              >
                <Trash2 className="w-3 h-3 mr-1.5" /> Excluir Nó
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
