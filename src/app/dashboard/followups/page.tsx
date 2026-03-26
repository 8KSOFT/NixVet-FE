'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { Loader2, FileSearch } from 'lucide-react';
import api from '@/lib/axios';

interface ExamFollowup {
  id: string;
  exam_request_id: string;
  patient_id: string;
  expected_result_date: string | null;
  followup_status: string;
  followup_consultation_id: string | null;
  ExamRequest?: { id: string };
  Patient?: { name: string };
}

interface FollowupFormValues {
  exam_request_id: string;
  patient_id: string;
  expected_result_date?: string;
}

export default function FollowupsPage() {
  const [awaiting, setAwaiting] = useState<ExamFollowup[]>([]);
  const [all, setAll] = useState<ExamFollowup[]>([]);
  const [examRequests, setExamRequests] = useState<{ id: string }[]>([]);
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { register, handleSubmit, reset, control } = useForm<FollowupFormValues>();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [awaitRes, allRes, examsRes, patientsRes] = await Promise.all([
        api.get<ExamFollowup[]>('/exam-followups/awaiting-followup'),
        api.get<ExamFollowup[]>('/exam-followups'),
        api.get<{ id: string }[]>('/exam-requests'),
        api.get<{ id: string; name: string }[]>('/patients'),
      ]);
      setAwaiting(Array.isArray(awaitRes.data) ? awaitRes.data : []);
      setAll(Array.isArray(allRes.data) ? allRes.data : []);
      setExamRequests(Array.isArray(examsRes.data) ? examsRes.data : []);
      setPatients(Array.isArray(patientsRes.data) ? patientsRes.data : []);
    } catch {
      toast.error('Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onSubmit = async (values: FollowupFormValues) => {
    try {
      await api.post('/exam-followups', values);
      toast.success('Acompanhamento criado');
      setModalOpen(false);
      reset();
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao criar');
    }
  };

  const updateStatus = async (id: string, followup_status: string) => {
    try {
      await api.put(`/exam-followups/${id}`, { followup_status });
      toast.success('Atualizado');
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro');
    }
  };

  const markResultAvailable = async (id: string) => {
    try {
      await api.put(`/exam-followups/${id}/result-available`);
      toast.success('Tutor notificado sobre resultado disponível');
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao notificar');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-600 mb-6 flex items-center gap-2">
        <FileSearch className="w-6 h-6" /> Acompanhamento de exames
      </h1>
      <Card>
        <CardContent className="pt-6">
          <Button onClick={() => setModalOpen(true)} className="mb-4 bg-blue-600">
            Novo acompanhamento
          </Button>

          <h3 className="font-medium text-slate-700 mb-2">Aguardando retorno</h3>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Solicitação</TableHead>
                  <TableHead>Previsão resultado</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {awaiting.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.Patient?.name}</TableCell>
                    <TableCell>{item.exam_request_id}</TableCell>
                    <TableCell>{item.expected_result_date}</TableCell>
                    <TableCell>{item.followup_status}</TableCell>
                    <TableCell className="space-x-1">
                      {item.followup_status === 'pending_result' && (
                        <Button variant="outline" size="sm" className="text-green-600 border-green-300" onClick={() => markResultAvailable(item.id)}>
                          Resultado Disponível
                        </Button>
                      )}
                      <Button variant="link" size="sm" onClick={() => updateStatus(item.id, 'closed')}>
                        Fechar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <h3 className="font-medium text-slate-700 mt-6 mb-2">Todos</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Previsão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {all.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.Patient?.name}</TableCell>
                  <TableCell>{item.expected_result_date}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.followup_status}</Badge>
                  </TableCell>
                  <TableCell className="space-x-1">
                    {item.followup_status === 'pending_result' && (
                      <Button variant="outline" size="sm" className="text-green-600 border-green-300" onClick={() => markResultAvailable(item.id)}>
                        Resultado Disponível
                      </Button>
                    )}
                    {item.followup_status !== 'closed' && (
                      <Button variant="link" size="sm" onClick={() => updateStatus(item.id, 'closed')}>
                        Fechar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo acompanhamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Solicitação de exame</Label>
              <Controller
                name="exam_request_id"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {examRequests.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label>Paciente</Label>
              <Controller
                name="patient_id"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label>Previsão do resultado</Label>
              <Input type="date" {...register('expected_result_date')} />
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-blue-600">Criar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
