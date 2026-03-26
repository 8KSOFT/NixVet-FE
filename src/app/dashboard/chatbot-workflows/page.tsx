'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Plus, Workflow, Pencil, Trash2, Zap } from 'lucide-react';
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
  const router = useRouter();

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const res = await api.get<WorkflowItem[]>('/chatbot-workflows');
      setWorkflows(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Erro ao carregar workflows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWorkflows(); }, []);

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
      const res = await api.post<WorkflowItem>('/chatbot-workflows/seed-default');
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-600 mb-6 flex items-center gap-2">
        <Workflow className="w-6 h-6" /> Workflows do Chatbot
      </h1>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 mb-4">
            <Button onClick={() => setCreateOpen(true)} className="bg-blue-600">
              <Plus className="w-4 h-4 mr-2" /> Novo Workflow
            </Button>
            {workflows.length === 0 && (
              <Button variant="outline" onClick={handleSeedDefault}>
                <Zap className="w-4 h-4 mr-2" /> Criar Workflow Padrão
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Workflow className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Nenhum workflow configurado.</p>
              <p className="text-sm mt-1">Crie um workflow padrão para começar.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map((wf) => (
                  <TableRow key={wf.id}>
                    <TableCell className="font-medium">{wf.name}</TableCell>
                    <TableCell>
                      {wf.is_active ? (
                        <Badge className="bg-green-500 text-white">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {wf.createdAt ? new Date(wf.createdAt).toLocaleDateString('pt-BR') : '—'}
                    </TableCell>
                    <TableCell className="space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/chatbot-workflows/${wf.id}`)}
                      >
                        <Pencil className="w-3 h-3 mr-1" /> Editar
                      </Button>
                      {!wf.is_active && (
                        <Button variant="outline" size="sm" className="text-green-600 border-green-300" onClick={() => handleActivate(wf.id)}>
                          <Zap className="w-3 h-3 mr-1" /> Ativar
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="text-red-600 border-red-300" onClick={() => handleDelete(wf.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Workflow Principal" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button className="bg-blue-600" onClick={handleCreate} disabled={!newName.trim()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
