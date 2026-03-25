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
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
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
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { register, handleSubmit, reset, control } = useForm<VaccineFormValues>();

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [allRes, dueRes, patientsRes] = await Promise.all([
        api.get<VaccineReminder[]>('/vaccine/reminders'),
        api.get<VaccineReminder[]>('/vaccine/reminders/due', { params: { days: 30 } }),
        api.get<{ id: string; name: string }[]>('/patients'),
      ]);
      setAllReminders(Array.isArray(allRes.data) ? allRes.data : []);
      setDueSoon(Array.isArray(dueRes.data) ? dueRes.data : []);
      setPatients(Array.isArray(patientsRes.data) ? patientsRes.data : []);
    } catch {
      toast.error('Erro ao carregar lembretes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

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
      <h1 className="text-2xl font-bold text-blue-600 mb-6">Vacinas</h1>
      <Card>
        <CardContent className="pt-6">
          <Button onClick={() => setModalOpen(true)} className="mb-4 bg-blue-600">
            <Plus className="w-4 h-4 mr-2" /> Novo lembrete
          </Button>
          <Tabs defaultValue="due">
            <TabsList>
              <TabsTrigger value="due">Próximos 30 dias</TabsTrigger>
              <TabsTrigger value="all">Todos os lembretes</TabsTrigger>
            </TabsList>
            <TabsContent value="due">
              <ReminderTable data={dueSoon} loading={loading} />
            </TabsContent>
            <TabsContent value="all">
              <ReminderTable data={allReminders} loading={loading} />
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
              <Button type="submit" className="bg-blue-600">Criar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
