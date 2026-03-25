'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import api from '@/lib/axios';

const DAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
];

const SCHEDULE_TYPES = [
  { value: 'regular', label: 'Atendimento regular' },
  { value: 'on_call', label: 'Plantão / Emergência' },
];

interface BusinessHour {
  id?: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

interface EmergencyHour {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface VetSchedule {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  schedule_type: 'regular' | 'on_call';
  user?: { name: string };
}

interface BusinessFormValues {
  day_of_week: string;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

interface EmergencyFormValues {
  day_of_week: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface VetFormValues {
  user_id: string;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  schedule_type: string;
}

export default function SettingsHoursPage() {
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [emergencyHours, setEmergencyHours] = useState<EmergencyHour[]>([]);
  const [vetSchedules, setVetSchedules] = useState<VetSchedule[]>([]);
  const [veterinarians, setVeterinarians] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [businessModalOpen, setBusinessModalOpen] = useState(false);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [vetModalOpen, setVetModalOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const businessForm = useForm<BusinessFormValues>({
    defaultValues: { day_of_week: '', open_time: '08:00', close_time: '18:00', is_closed: false },
  });
  const emergencyForm = useForm<EmergencyFormValues>({
    defaultValues: { day_of_week: '', start_time: '', end_time: '', is_active: true },
  });
  const vetForm = useForm<VetFormValues>({
    defaultValues: { user_id: '', start_time: '', end_time: '', slot_duration_minutes: 30, schedule_type: 'regular' },
  });

  const isClosed = businessForm.watch('is_closed');

  const fetchBusiness = async () => {
    try {
      const res = await api.get('/availability/config/business-hours');
      setBusinessHours(res.data ?? []);
    } catch {
      toast.error('Erro ao carregar horário de funcionamento');
    }
  };

  const fetchEmergency = async () => {
    try {
      const res = await api.get('/availability/config/emergency-hours');
      setEmergencyHours(res.data ?? []);
    } catch {
      toast.error('Erro ao carregar horário de emergência');
    }
  };

  const fetchVetSchedules = async () => {
    try {
      const res = await api.get('/availability/config/veterinarian-schedules');
      setVetSchedules(res.data ?? []);
    } catch {
      toast.error('Erro ao carregar agendas');
    }
  };

  const fetchVets = async () => {
    try {
      const res = await api.get('/users/veterinarians');
      setVeterinarians(res.data ?? []);
    } catch {
      toast.error('Erro ao carregar veterinários');
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchBusiness(), fetchEmergency(), fetchVetSchedules(), fetchVets()]).finally(() =>
      setLoading(false),
    );
  }, []);

  const onBusinessFinish = async (values: BusinessFormValues) => {
    try {
      await api.post('/availability/config/business-hours', {
        day_of_week: Number(values.day_of_week),
        open_time: values.is_closed ? undefined : values.open_time,
        close_time: values.is_closed ? undefined : values.close_time,
        is_closed: !!values.is_closed,
      });
      toast.success('Salvo');
      setBusinessModalOpen(false);
      businessForm.reset();
      fetchBusiness();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao salvar');
    }
  };

  const onEmergencyFinish = async (values: EmergencyFormValues) => {
    try {
      await api.post('/availability/config/emergency-hours', {
        day_of_week: Number(values.day_of_week),
        start_time: values.start_time,
        end_time: values.end_time,
        is_active: values.is_active !== false,
      });
      toast.success('Salvo');
      setEmergencyModalOpen(false);
      emergencyForm.reset();
      fetchEmergency();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao salvar');
    }
  };

  const onVetFinish = async (values: VetFormValues) => {
    if (selectedDays.length === 0) {
      toast.error('Selecione ao menos um dia');
      return;
    }
    const errors: string[] = [];
    for (const day of selectedDays) {
      try {
        await api.post('/availability/config/veterinarian-schedules', {
          user_id: values.user_id,
          day_of_week: day,
          start_time: values.start_time,
          end_time: values.end_time,
          slot_duration_minutes: Number(values.slot_duration_minutes) ?? 30,
          schedule_type: values.schedule_type ?? 'regular',
        });
      } catch (e: any) {
        errors.push(`${DAYS.find((d) => d.value === day)?.label}: ${e.response?.data?.message ?? 'Erro'}`);
      }
    }
    if (errors.length) {
      toast.error(errors.join(' | '));
    } else {
      toast.success(selectedDays.length > 1 ? `${selectedDays.length} horários adicionados` : 'Adicionado');
    }
    setVetModalOpen(false);
    vetForm.reset();
    setSelectedDays([]);
    fetchVetSchedules();
  };

  const handleDeleteVetSchedule = async (id: string) => {
    try {
      await api.delete(`/availability/config/veterinarian-schedules/${id}`);
      toast.success('Removido');
      fetchVetSchedules();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao remover');
    }
  };

  const openBusinessModal = (row?: BusinessHour) => {
    if (row) {
      businessForm.reset({
        day_of_week: row.day_of_week.toString(),
        open_time: row.open_time ?? '08:00',
        close_time: row.close_time ?? '18:00',
        is_closed: row.is_closed,
      });
    } else {
      businessForm.reset({ day_of_week: '', open_time: '08:00', close_time: '18:00', is_closed: false });
    }
    setBusinessModalOpen(true);
  };

  const openEmergencyModal = (row?: EmergencyHour) => {
    if (row) {
      emergencyForm.reset({
        day_of_week: row.day_of_week.toString(),
        start_time: row.start_time,
        end_time: row.end_time,
        is_active: row.is_active,
      });
    } else {
      emergencyForm.reset({ day_of_week: '', start_time: '', end_time: '', is_active: true });
    }
    setEmergencyModalOpen(true);
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-600 mb-6">Horários</h1>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="business">
              <TabsList className="mb-4">
                <TabsTrigger value="business">Horário de funcionamento</TabsTrigger>
                <TabsTrigger value="emergency">Plantão / Emergência</TabsTrigger>
                <TabsTrigger value="vet">Agenda por veterinário</TabsTrigger>
              </TabsList>

              <TabsContent value="business">
                <p className="text-slate-600 mb-4">
                  Define o horário de abertura/fechamento da clínica por dia da semana.
                </p>
                <Button onClick={() => openBusinessModal()} className="mb-4 bg-blue-600">
                  <Plus className="w-4 h-4 mr-2" /> Adicionar dia
                </Button>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dia</TableHead>
                      <TableHead>Abre</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {businessHours.map((r) => (
                      <TableRow key={r.id ?? r.day_of_week}>
                        <TableCell>{DAYS.find((x) => x.value === r.day_of_week)?.label ?? r.day_of_week}</TableCell>
                        <TableCell>{r.is_closed ? '—' : r.open_time ?? '—'}</TableCell>
                        <TableCell>{r.is_closed ? '—' : r.close_time ?? '—'}</TableCell>
                        <TableCell>
                          {r.is_closed ? (
                            <Badge variant="destructive">Fechado</Badge>
                          ) : (
                            <Badge className="bg-green-500">Aberto</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="link" size="sm" onClick={() => openBusinessModal(r)}>
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="emergency">
                <p className="text-slate-600 mb-4">
                  Janelas de plantão ou emergência por dia da semana. Ative/desative por dia conforme necessário.
                </p>
                <Button onClick={() => openEmergencyModal()} className="mb-4 bg-blue-600">
                  <Plus className="w-4 h-4 mr-2" /> Adicionar plantão
                </Button>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dia</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Fim</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emergencyHours.map((r) => (
                      <TableRow key={r.id ?? r.day_of_week}>
                        <TableCell>{DAYS.find((x) => x.value === r.day_of_week)?.label ?? r.day_of_week}</TableCell>
                        <TableCell>{r.start_time}</TableCell>
                        <TableCell>{r.end_time}</TableCell>
                        <TableCell>
                          {r.is_active ? (
                            <Badge className="bg-green-500">Ativo</Badge>
                          ) : (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="link" size="sm" onClick={() => openEmergencyModal(r)}>
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="vet">
                <p className="text-slate-600 mb-4">
                  Dias e horários de cada veterinário. Defina se é atendimento regular ou plantão.
                </p>
                <Button
                  onClick={() => {
                    vetForm.reset();
                    setSelectedDays([]);
                    setVetModalOpen(true);
                  }}
                  className="mb-4 bg-blue-600"
                >
                  <Plus className="w-4 h-4 mr-2" /> Adicionar horário
                </Button>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Veterinário</TableHead>
                      <TableHead>Dia</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Fim</TableHead>
                      <TableHead>Slot (min)</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vetSchedules.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          {r.user?.name ?? veterinarians.find((v) => v.id === r.user_id)?.name ?? r.user_id}
                        </TableCell>
                        <TableCell>{DAYS.find((x) => x.value === r.day_of_week)?.label ?? r.day_of_week}</TableCell>
                        <TableCell>{r.start_time}</TableCell>
                        <TableCell>{r.end_time}</TableCell>
                        <TableCell>{r.slot_duration_minutes}</TableCell>
                        <TableCell>
                          {r.schedule_type === 'on_call' ? (
                            <Badge className="bg-orange-500">Plantão</Badge>
                          ) : (
                            <Badge className="bg-blue-500">Regular</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon" className="h-7 w-7">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover este horário?</AlertDialogTitle>
                                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteVetSchedule(r.id)}>
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Dialog horário de funcionamento */}
      <Dialog open={businessModalOpen} onOpenChange={setBusinessModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Horário de funcionamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={businessForm.handleSubmit(onBusinessFinish)} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label>Dia da semana</Label>
              <Controller
                name="day_of_week"
                control={businessForm.control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o dia" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map((d) => (
                        <SelectItem key={d.value} value={d.value.toString()}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex items-center gap-2">
              <Controller
                name="is_closed"
                control={businessForm.control}
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} id="is_closed" />
                )}
              />
              <Label htmlFor="is_closed">Fechado neste dia</Label>
            </div>
            {!isClosed && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label>Abertura</Label>
                  <Input type="time" {...businessForm.register('open_time', { required: true })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Fechamento</Label>
                  <Input type="time" {...businessForm.register('close_time', { required: true })} />
                </div>
              </>
            )}
            <Button type="submit" className="bg-blue-600">
              Salvar
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog plantão / emergência */}
      <Dialog open={emergencyModalOpen} onOpenChange={setEmergencyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Plantão / Emergência</DialogTitle>
          </DialogHeader>
          <form onSubmit={emergencyForm.handleSubmit(onEmergencyFinish)} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label>Dia da semana</Label>
              <Controller
                name="day_of_week"
                control={emergencyForm.control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o dia" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map((d) => (
                        <SelectItem key={d.value} value={d.value.toString()}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Início</Label>
              <Input type="time" {...emergencyForm.register('start_time', { required: true })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Fim</Label>
              <Input type="time" {...emergencyForm.register('end_time', { required: true })} />
            </div>
            <div className="flex items-center gap-2">
              <Controller
                name="is_active"
                control={emergencyForm.control}
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} id="is_active" />
                )}
              />
              <Label htmlFor="is_active">Ativo</Label>
            </div>
            <Button type="submit" className="bg-blue-600">
              Salvar
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog agenda veterinário */}
      <Dialog open={vetModalOpen} onOpenChange={setVetModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar horário do veterinário</DialogTitle>
          </DialogHeader>
          <form onSubmit={vetForm.handleSubmit(onVetFinish)} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label>Veterinário</Label>
              <Controller
                name="user_id"
                control={vetForm.control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {veterinarians.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Dias da semana</Label>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 mt-1">
                {DAYS.map((d) => (
                  <div key={d.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`day-${d.value}`}
                      checked={selectedDays.includes(d.value)}
                      onCheckedChange={() => toggleDay(d.value)}
                    />
                    <Label htmlFor={`day-${d.value}`} className="font-normal cursor-pointer">
                      {d.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Início</Label>
              <Input type="time" {...vetForm.register('start_time', { required: true })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Fim</Label>
              <Input type="time" {...vetForm.register('end_time', { required: true })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Duração padrão do slot (min)</Label>
              <Input type="number" min={10} max={120} {...vetForm.register('slot_duration_minutes')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tipo de agenda</Label>
              <Controller
                name="schedule_type"
                control={vetForm.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHEDULE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <Button type="submit" className="bg-blue-600">
              Adicionar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
