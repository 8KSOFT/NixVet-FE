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
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Save, ArrowLeft, Plus, Trash2, Play, Square, GitBranch, Zap } from 'lucide-react';
import api from '@/lib/axios';

const NODE_COLORS: Record<string, string> = {
  trigger: '#22c55e',
  condition: '#eab308',
  action: '#3b82f6',
  end: '#ef4444',
};

const ACTION_TYPES = [
  { value: 'GET_AVAILABILITY', label: 'Buscar Disponibilidade' },
  { value: 'GENERATE_AI_REPLY', label: 'Resposta IA' },
  { value: 'SEND_MESSAGE', label: 'Enviar Mensagem Fixa' },
  { value: 'CREATE_CONSULTATION', label: 'Criar Consulta' },
  { value: 'NOTIFY_TEAM', label: 'Notificar Equipe' },
  { value: 'PAUSE_BOT', label: 'Pausar Bot' },
  { value: 'WAIT_REPLY', label: 'Aguardar Resposta' },
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

function getNodeIcon(type: string) {
  switch (type) {
    case 'trigger': return <Play className="w-3 h-3" />;
    case 'condition': return <GitBranch className="w-3 h-3" />;
    case 'action': return <Zap className="w-3 h-3" />;
    case 'end': return <Square className="w-3 h-3" />;
    default: return null;
  }
}

function TriggerNode({ data }: NodeProps) {
  return (
    <div className="rounded-lg border-2 shadow-md px-4 py-2 min-w-[160px] bg-white" style={{ borderColor: NODE_COLORS.trigger }}>
      <Handle type="source" position={Position.Bottom} className="!bg-green-500" />
      <div className="flex items-center gap-2 text-xs font-semibold text-green-700">
        <Play className="w-3 h-3" />
        {(data as any).label || 'Trigger'}
      </div>
    </div>
  );
}

function ConditionNode({ data }: NodeProps) {
  const branches = ((data as any).config?.branches ?? []) as Array<{ value: string; target: string }>;
  return (
    <div className="rounded-lg border-2 shadow-md px-4 py-2 min-w-[180px] bg-white" style={{ borderColor: NODE_COLORS.condition }}>
      <Handle type="target" position={Position.Top} className="!bg-yellow-500" />
      <div className="flex items-center gap-2 text-xs font-semibold text-yellow-700 mb-1">
        <GitBranch className="w-3 h-3" />
        {(data as any).label || 'Condição'}
      </div>
      {branches.length > 0 && (
        <div className="text-[10px] text-slate-500 space-y-0.5">
          {branches.map((b, i) => (
            <div key={i}>{b.value} → {b.target}</div>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-yellow-500" />
    </div>
  );
}

function ActionNode({ data }: NodeProps) {
  const actionType = ((data as any).config?.action_type as string) || '?';
  const actionLabel = ACTION_TYPES.find((a) => a.value === actionType)?.label || actionType;
  return (
    <div className="rounded-lg border-2 shadow-md px-4 py-2 min-w-[160px] bg-white" style={{ borderColor: NODE_COLORS.action }}>
      <Handle type="target" position={Position.Top} className="!bg-blue-500" />
      <div className="flex items-center gap-2 text-xs font-semibold text-blue-700">
        <Zap className="w-3 h-3" />
        {(data as any).label || 'Ação'}
      </div>
      <div className="text-[10px] text-slate-500 mt-0.5">{actionLabel}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
    </div>
  );
}

function EndNode({ data }: NodeProps) {
  return (
    <div className="rounded-lg border-2 shadow-md px-4 py-2 min-w-[100px] bg-white" style={{ borderColor: NODE_COLORS.end }}>
      <Handle type="target" position={Position.Top} className="!bg-red-500" />
      <div className="flex items-center gap-2 text-xs font-semibold text-red-700">
        <Square className="w-3 h-3" />
        {(data as any).label || 'Fim'}
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
    style: { strokeWidth: 2 },
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

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

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
      setEdges((eds) => addEdge({ ...connection, animated: true, style: { strokeWidth: 2 } }, eds));
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
      position: { x: 250, y: 200 + nodes.length * 80 },
      data: {
        label: type === 'trigger' ? 'Trigger' : type === 'condition' ? 'Condição' : type === 'end' ? 'Fim' : 'Nova Ação',
        config: type === 'action' ? { action_type: 'GENERATE_AI_REPLY' } : type === 'condition' ? { variable: 'intent', branches: [] } : {},
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
        const newData = { ...n.data, [field]: value };
        return { ...n, data: newData };
      }),
    );
    setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, [field]: value } } : prev);
  };

  const updateNodeConfig = (key: string, value: unknown) => {
    if (!selectedNode) return;
    const currentConfig = ((selectedNode.data as any)?.config ?? {}) as Record<string, unknown>;
    const newConfig = { ...currentConfig, [key]: value };
    updateNodeData('config', newConfig);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const nodeConfig = ((selectedNode?.data as any)?.config ?? {}) as Record<string, unknown>;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/chatbot-workflows')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <Input
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          className="w-64 h-9"
          placeholder="Nome do workflow"
        />
        <Separator orientation="vertical" className="h-6" />
        <Button variant="outline" size="sm" onClick={() => addNode('condition')}>
          <GitBranch className="w-3 h-3 mr-1" /> Condição
        </Button>
        <Button variant="outline" size="sm" onClick={() => addNode('action')}>
          <Zap className="w-3 h-3 mr-1" /> Ação
        </Button>
        <Button variant="outline" size="sm" onClick={() => addNode('end')}>
          <Square className="w-3 h-3 mr-1" /> Fim
        </Button>
        <div className="flex-1" />
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
          Salvar
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex-1 border rounded-lg overflow-hidden bg-slate-50">
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
          <Background />
          <Controls />
          <MiniMap
            nodeColor={(n) => NODE_COLORS[n.type || ''] || '#999'}
            className="!bg-white !border"
          />
        </ReactFlow>
      </div>

      {/* Config Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[380px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selectedNode && getNodeIcon(selectedNode.type || '')}
              Configurar Nó
            </SheetTitle>
            <SheetDescription className="sr-only">Configuração do nó selecionado</SheetDescription>
          </SheetHeader>

          {selectedNode && (
            <div className="space-y-4 mt-4">
              <div>
                <Label>Label</Label>
                <Input
                  value={(selectedNode.data as any)?.label || ''}
                  onChange={(e) => updateNodeData('label', e.target.value)}
                />
              </div>

              <div>
                <Label>Tipo</Label>
                <p className="text-sm text-slate-600 capitalize">{selectedNode.type}</p>
              </div>

              <div>
                <Label>Key</Label>
                <p className="text-sm text-slate-500 font-mono">{selectedNode.id}</p>
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
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTION_TYPES.map((a) => (
                          <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {nodeConfig.action_type === 'SEND_MESSAGE' && (
                    <div>
                      <Label>Texto da mensagem</Label>
                      <textarea
                        className="w-full border rounded-md p-2 text-sm min-h-[80px]"
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
                        value={((nodeConfig.params as any)?.days_ahead as number) || 4}
                        onChange={(e) => updateNodeConfig('params', { ...((nodeConfig.params ?? {}) as any), days_ahead: Number(e.target.value) })}
                      />
                    </div>
                  )}

                  {nodeConfig.action_type === 'NOTIFY_TEAM' && (
                    <div>
                      <Label>Mensagem de notificação</Label>
                      <Input
                        value={((nodeConfig.params as any)?.message as string) || ''}
                        onChange={(e) => updateNodeConfig('params', { ...((nodeConfig.params ?? {}) as any), message: e.target.value })}
                      />
                    </div>
                  )}

                  <div>
                    <Label>Variável de saída (output_var)</Label>
                    <Input
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
                      value={(nodeConfig.variable as string) || 'intent'}
                      onChange={(e) => updateNodeConfig('variable', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Branches (JSON)</Label>
                    <textarea
                      className="w-full border rounded-md p-2 text-xs font-mono min-h-[120px]"
                      value={JSON.stringify(nodeConfig.branches ?? [], null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          updateNodeConfig('branches', parsed);
                        } catch {}
                      }}
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Formato: [{'{"value":"AGENDAMENTO","target":"node_key"}'}]
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
                <Trash2 className="w-3 h-3 mr-1" /> Excluir Nó
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
