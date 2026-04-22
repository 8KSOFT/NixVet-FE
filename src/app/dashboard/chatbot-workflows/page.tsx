'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Loader2, Plus, Workflow, Pencil, Trash2, Zap,
  Bot, CheckCircle2, XCircle, Settings, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';

interface WorkflowItem {
  id: string;
  name: string;
  is_active: boolean;
  createdAt?: string;
}

export default function ChatbotWorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [botEnabled, setBotEnabled] = useState(false);
  const [botSaving, setBotSaving] = useState(false);
  const router = useRouter();

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const [wfRes, tenantRes] = await Promise.all([
        api.get<WorkflowItem[]>('/chatbot-workflows'),
        api.get<{ whatsapp_ai_chatbot_enabled?: boolean }>('/tenants/me'),
      ]);
      setWorkflows(Array.isArray(wfRes.data) ? wfRes.data : []);
      setBotEnabled(Boolean(tenantRes.data?.whatsapp_ai_chatbot_enabled));
    } catch {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWorkflows(); }, []);

  const toggleBot = async (enabled: boolean) => {
    setBotSaving(true);
    try {
      await api.put('/tenants/me', { whatsapp_ai_chatbot_enabled: enabled });
      setBotEnabled(enabled);
      toast.success(enabled ? 'Chatbot ativado' : 'Chatbot desativado');
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao salvar');
    } finally {
      setBotSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const res = await api.post<WorkflowItem>('/chatbot-workflows', {
        name: newName.trim(),
        nodes: [
          { node_type: 'trigger', node_key: 'message_received', label: 'Mensagem Recebida', config: {}, position_x: 250, position_y: 50 },
          { node_type: 'end', node_key: 'end', label: 'Fim', config: {}, position_x: 250, position_y: 300 },
        ],
        edges: [{ source_node: 'message_received', target_node: 'end' }],
      });
      toast.success('Workflow criado');
      setCreateOpen(false);
      setNewName('');
      router.push(`/dashboard/chatbot-workflows/${res.data.id}`);
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao criar');
    }
  };

  const handleSeedDefault = async () => {
    try {
      await api.post('/chatbot-workflows/seed-default');
      toast.success('Workflow padrão criado');
      fetchWorkflows();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro');
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await api.put(`/chatbot-workflows/${id}/activate`);
      toast.success('Workflow ativado');
      fetchWorkflows();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    try {
      await api.delete(`/chatbot-workflows/${id}`);
      toast.success('Workflow excluído');
      fetchWorkflows();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro');
    }
  };

  const activeWorkflow = workflows.find((w) => w.is_active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-foreground flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" /> Chatbot / IA
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie o bot de WhatsApp e seus fluxos de atendimento automático.
          </p>
        </div>
        <Link href="/dashboard/settings/chatbot">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Settings className="w-4 h-4" /> Persona & Mensagens
          </Button>
        </Link>
      </div>

      {/* Status banner */}
      <Card className={cn(
        'border transition-colors',
        botEnabled ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/30',
      )}>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {botEnabled ? (
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
              <div>
                <p className="font-semibold text-foreground text-sm">
                  Bot está <span className={botEnabled ? 'text-primary' : 'text-muted-foreground'}>{botEnabled ? 'ATIVO' : 'INATIVO'}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {botEnabled
                    ? 'Respostas automáticas habilitadas para novas mensagens WhatsApp.'
                    : 'O bot não está respondendo. Ative para iniciar o atendimento automático.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              {botSaving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              <Switch
                checked={botEnabled}
                disabled={botSaving}
                onCheckedChange={(v) => void toggleBot(v)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active workflow highlight */}
      {activeWorkflow && (
        <Card className="border-primary/25 bg-primary/[0.03]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                  <Workflow className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Workflow ativo</p>
                  <p className="font-semibold text-foreground">{activeWorkflow.name}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={() => router.push(`/dashboard/chatbot-workflows/${activeWorkflow.id}`)}
              >
                <Pencil className="w-3.5 h-3.5" /> Editar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workflows list */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold text-foreground">Workflows</CardTitle>
            <div className="flex gap-2">
              {workflows.length === 0 && (
                <Button variant="outline" size="sm" onClick={handleSeedDefault} className="gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Criar padrão
                </Button>
              )}
              <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-primary gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Novo Workflow
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <Workflow className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="font-medium">Nenhum workflow configurado</p>
              <p className="text-sm mt-1 mb-4">Crie o workflow padrão para começar com um fluxo pré-configurado.</p>
              <Button variant="outline" onClick={handleSeedDefault} className="gap-1.5">
                <Zap className="w-4 h-4" /> Criar Workflow Padrão
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map((wf) => (
                  <TableRow key={wf.id}>
                    <TableCell>
                      <span className="font-medium text-foreground">{wf.name}</span>
                    </TableCell>
                    <TableCell>
                      {wf.is_active ? (
                        <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {wf.createdAt ? new Date(wf.createdAt).toLocaleDateString('pt-BR') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/chatbot-workflows/${wf.id}`)}
                          className="gap-1"
                        >
                          <Pencil className="w-3 h-3" /> Editar
                        </Button>
                        {!wf.is_active && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-primary border-primary/30 hover:bg-primary/5 gap-1"
                            onClick={() => handleActivate(wf.id)}
                          >
                            <Zap className="w-3 h-3" /> Ativar
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive/30 hover:bg-destructive/5"
                          onClick={() => handleDelete(wf.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick access */}
      <Separator />
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/settings/chatbot">
          <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
            <Settings className="w-4 h-4" /> Configurar Persona & Mensagens
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
        <Link href="/dashboard/settings/ai-costs">
          <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
            Custos de IA
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome do workflow</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Workflow Principal"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button className="bg-primary" onClick={handleCreate} disabled={!newName.trim()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
