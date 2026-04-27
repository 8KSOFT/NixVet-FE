'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { Plus, Loader2 } from 'lucide-react';
import api from '@/lib/axios';
import { API_PAGE_SIZE, fetchAllListPages, listQueryParams, parseListResponse } from '@/lib/pagination';
import { ListPagination } from '@/components/list-pagination';

interface VaccineReminder {
  id: string;
  patient_id: string;
  vaccine_name: string;
  next_due_date: string;
  reminder_status: string;
  patient?: { name: string };
}

interface VaccineFormValues {
  patient_id: string;
  vaccine_name: string;
  next_due_date: string;
}

function ReminderTable({ data, loading }: { data: VaccineReminder[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Paciente</TableHead>
          <TableHead>Vacina</TableHead>
          <TableHead>Próxima dose</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{r.patient?.name}</TableCell>
            <TableCell>{r.vaccine_name}</TableCell>
            <TableCell>{r.next_due_date}</TableCell>
            <TableCell>{r.reminder_status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function VaccinesPage() {
  const [allReminders, setAllReminders] = useState<VaccineReminder[]>([]);
  const [dueSoon, setDueSoon] = useState<VaccineReminder[]>([]);
  const [duePage, setDuePage] = useState(1);
  const [dueTotal, setDueTotal] = useState(0);
  const [dueTotalPages, setDueTotalPages] = useState(1);
  const [allPage, setAllPage] = useState(1);
  const [allTotal, setAllTotal] = useState(0);
  const [allTotalPages, setAllTotalPages] = useState(1);
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { register, handleSubmit, reset, control } = useForm<VaccineFormValues>();

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [allRes, dueRes, patientsList] = await Promise.all([
        api.get('/vaccine/reminders', { params: listQueryParams(allPage) }),
        api.get('/vaccine/reminders/due', { params: { days: 30, ...listQueryParams(duePage) } }),
        fetchAllListPages<{ id: string; name: string }>('/patients'),
      ]);
      const a = parseListResponse<VaccineReminder>(allRes.data, allPage);
      setAllReminders(a.items);
      setAllTotal(a.total);
      setAllTotalPages(a.totalPages);
      const d = parseListResponse<VaccineReminder>(dueRes.data, duePage);
      setDueSoon(d.items);
      setDueTotal(d.total);
      setDueTotalPages(d.totalPages);
      setPatients(patientsList);
    } catch {
      toast.error('Erro ao carregar lembretes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [allPage, duePage]);

  const onSubmit = async (values: VaccineFormValues) => {
    try {
      await api.post('/vaccine/reminders', values);
      toast.success('Lembrete criado');
      setModalOpen(false);
      reset();
      fetchAll();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao criar');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-primary mb-6">Vacinas</h1>
      <Card>
        <CardContent className="pt-6">
          <Button onClick={() => setModalOpen(true)} className="mb-4 bg-primary">
            <Plus className="w-4 h-4 mr-2" /> Novo lembrete
          </Button>
          <Tabs defaultValue="due">
            <TabsList>
              <TabsTrigger value="due">Próximos 30 dias</TabsTrigger>
              <TabsTrigger value="all">Todos os lembretes</TabsTrigger>
            </TabsList>
            <TabsContent value="due">
              <div className="rounded-md border overflow-hidden">
                <ReminderTable data={dueSoon} loading={loading} />
                <ListPagination
                  page={duePage}
                  totalPages={dueTotalPages}
                  total={dueTotal}
                  pageSize={API_PAGE_SIZE}
                  onPageChange={setDuePage}
                  disabled={loading}
                />
              </div>
            </TabsContent>
            <TabsContent value="all">
              <div className="rounded-md border overflow-hidden">
                <ReminderTable data={allReminders} loading={loading} />
                <ListPagination
                  page={allPage}
                  totalPages={allTotalPages}
                  total={allTotal}
                  pageSize={API_PAGE_SIZE}
                  onPageChange={setAllPage}
                  disabled={loading}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo lembrete de vacina</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              <Label>Vacina</Label>
              <Input {...register('vaccine_name', { required: true })} placeholder="Ex.: Antirrábica" />
            </div>
            <div>
              <Label>Próxima dose</Label>
              <Input type="date" {...register('next_due_date', { required: true })} />
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-primary">Criar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
