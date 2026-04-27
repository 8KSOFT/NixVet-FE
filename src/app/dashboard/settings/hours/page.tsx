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
import { fetchAllListPages } from '@/lib/pagination';

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
  is_24h?: boolean;
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

  // Business hours form state
  const [businessModalOpen, setBusinessModalOpen] = useState(false);
  const [bhSelectedDays, setBhSelectedDays] = useState<number[]>([]);
  const [bhOpenTime, setBhOpenTime] = useState('08:00');
  const [bhCloseTime, setBhCloseTime] = useState('18:00');
  const [bhIsClosed, setBhIsClosed] = useState(false);
  const [bhIs24h, setBhIs24h] = useState(false);
  const [bhSaving, setBhSaving] = useState(false);

  // Emergency hours form state
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [ehSelectedDays, setEhSelectedDays] = useState<number[]>([]);
  const [ehStartTime, setEhStartTime] = useState('');
  const [ehEndTime, setEhEndTime] = useState('');
  const [ehIsActive, setEhIsActive] = useState(true);
  const [ehSaving, setEhSaving] = useState(false);

  // Vet schedules
  const [vetModalOpen, setVetModalOpen] = useState(false);
  const [vetSelectedDays, setVetSelectedDays] = useState<number[]>([]);

  const vetForm = useForm<VetFormValues>({
    defaultValues: { user_id: '', start_time: '', end_time: '', slot_duration_minutes: 30, schedule_type: 'regular' },
  });

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
      const list = await fetchAllListPages<{ id: string; name: string }>('/users/veterinarians');
      setVeterinarians(list);
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

  // ── Business hours handlers ──

  const openBusinessModal = (row?: BusinessHour) => {
    if (row) {
      setBhSelectedDays([row.day_of_week]);
      setBhOpenTime(row.open_time ?? '08:00');
      setBhCloseTime(row.close_time ?? '18:00');
      setBhIsClosed(row.is_closed);
      setBhIs24h(row.is_24h ?? false);
    } else {
      setBhSelectedDays([]);
      setBhOpenTime('08:00');
      setBhCloseTime('18:00');
      setBhIsClosed(false);
      setBhIs24h(false);
    }
    setBusinessModalOpen(true);
  };

  const selectAllWeekdays = () => {
    setBhSelectedDays([1, 2, 3, 4, 5]);
  };

  const selectAllDays = () => {
    setBhSelectedDays([0, 1, 2, 3, 4, 5, 6]);
  };

  const onBusinessSubmit = async () => {
    if (bhSelectedDays.length === 0) {
      toast.error('Selecione ao menos um dia');
      return;
    }
    setBhSaving(true);
    try {
      await api.post('/availability/config/business-hours/batch', {
        days: bhSelectedDays,
        open_time: bhIsClosed ? undefined : bhIs24h ? '00:00' : bhOpenTime,
        close_time: bhIsClosed ? undefined : bhIs24h ? '23:59' : bhCloseTime,
        is_closed: bhIsClosed,
        is_24h: bhIs24h && !bhIsClosed,
      });
      toast.success(bhSelectedDays.length > 1 ? `${bhSelectedDays.length} dias atualizados` : 'Salvo');
      setBusinessModalOpen(false);
      fetchBusiness();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao salvar');
    } finally {
      setBhSaving(false);
    }
  };

  // ── Emergency hours handlers ──

  const openEmergencyModal = (row?: EmergencyHour) => {
    if (row) {
      setEhSelectedDays([row.day_of_week]);
      setEhStartTime(row.start_time);
      setEhEndTime(row.end_time);
      setEhIsActive(row.is_active);
    } else {
      setEhSelectedDays([]);
      setEhStartTime('');
      setEhEndTime('');
      setEhIsActive(true);
    }
    setEmergencyModalOpen(true);
  };

  const onEmergencySubmit = async () => {
    if (ehSelectedDays.length === 0) {
      toast.error('Selecione ao menos um dia');
      return;
    }
    if (!ehStartTime || !ehEndTime) {
      toast.error('Preencha início e fim');
      return;
    }
    setEhSaving(true);
    const errors: string[] = [];
    for (const day of ehSelectedDays) {
      try {
        await api.post('/availability/config/emergency-hours', {
          day_of_week: day,
          start_time: ehStartTime,
          end_time: ehEndTime,
          is_active: ehIsActive,
        });
      } catch (e: any) {
        errors.push(`${DAYS.find((d) => d.value === day)?.label}: ${e.response?.data?.message ?? 'Erro'}`);
      }
    }
    if (errors.length) {
      toast.error(errors.join(' | '));
    } else {
      toast.success(ehSelectedDays.length > 1 ? `${ehSelectedDays.length} dias atualizados` : 'Salvo');
    }
    setEmergencyModalOpen(false);
    fetchEmergency();
    setEhSaving(false);
  };

  // ── Vet schedule handlers ──

  const onVetFinish = async (values: VetFormValues) => {
    if (vetSelectedDays.length === 0) {
      toast.error('Selecione ao menos um dia');
      return;
    }
    const errors: string[] = [];
    for (const day of vetSelectedDays) {
      try {
        await api.post('/availability/config/veterinarian-schedules', {
          user_id: values.user_id,
          day_of_week: day,
          start_time: values.start_time,
          end_time: values.end_time,
          slot_duration_minutes: Number(values.slot_duration_minutes) || 30,
          schedule_type: values.schedule_type || 'regular',
        });
      } catch (e: any) {
        errors.push(`${DAYS.find((d) => d.value === day)?.label}: ${e.response?.data?.message ?? 'Erro'}`);
      }
    }
    if (errors.length) {
      toast.error(errors.join(' | '));
    } else {
      toast.success(vetSelectedDays.length > 1 ? `${vetSelectedDays.length} horários adicionados` : 'Adicionado');
    }
    setVetModalOpen(false);
    vetForm.reset();
    setVetSelectedDays([]);
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

  const DayCheckboxGrid = ({
    selected,
    onToggle,
  }: {
    selected: number[];
    onToggle: (day: number) => void;
  }) => (
    <div className="grid grid-cols-2 gap-y-2 gap-x-4 mt-1">
      {DAYS.map((d) => (
        <div key={d.value} className="flex items-center gap-2">
          <Checkbox
            id={`day-cb-${d.value}-${Math.random()}`}
            checked={selected.includes(d.value)}
            onCheckedChange={() => onToggle(d.value)}
          />
          <Label className="font-normal cursor-pointer">{d.label}</Label>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-primary mb-6">Horários</h1>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
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

              {/* ── Business Hours ── */}
              <TabsContent value="business">
                <p className="text-muted-foreground mb-4">
                  Define o horário de abertura/fechamento da clínica por dia da semana. Selecione vários dias para aplicar o mesmo horário de uma vez.
                </p>
                <Button onClick={() => openBusinessModal()} className="mb-4 bg-primary">
                  <Plus className="w-4 h-4 mr-2" /> Configurar dias
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
                        <TableCell>
                          {r.is_closed ? '—' : r.is_24h ? '00:00' : (r.open_time ?? '—')}
                        </TableCell>
                        <TableCell>
                          {r.is_closed ? '—' : r.is_24h ? '23:59' : (r.close_time ?? '—')}
                        </TableCell>
                        <TableCell>
                          {r.is_closed ? (
                            <Badge variant="destructive">Fechado</Badge>
                          ) : r.is_24h ? (
                            <Badge className="bg-purple-500">24 horas</Badge>
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

              {/* ── Emergency Hours ── */}
              <TabsContent value="emergency">
                <p className="text-muted-foreground mb-4">
                  Janelas de plantão ou emergência por dia da semana. Selecione vários dias de uma vez.
                </p>
                <Button onClick={() => openEmergencyModal()} className="mb-4 bg-primary">
                  <Plus className="w-4 h-4 mr-2" /> Configurar plantão
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

              {/* ── Vet Schedules ── */}
              <TabsContent value="vet">
                <p className="text-muted-foreground mb-4">
                  Dias e horários de cada veterinário. Horários convencionais são &quot;Regular&quot; — Plantão é separado.
                </p>
                <Button
                  onClick={() => {
                    vetForm.reset();
                    setVetSelectedDays([]);
                    setVetModalOpen(true);
                  }}
                  className="mb-4 bg-primary"
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
                            <Badge className="bg-primary/100">Regular</Badge>
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

      {/* ── Dialog horário de funcionamento ── */}
      <Dialog open={businessModalOpen} onOpenChange={setBusinessModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Horário de funcionamento</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label>Dias da semana</Label>
              <div className="flex gap-2 mb-1">
                <Button type="button" variant="outline" size="sm" onClick={selectAllWeekdays}>
                  Seg a Sex
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={selectAllDays}>
                  Todos
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setBhSelectedDays([])}>
                  Limpar
                </Button>
              </div>
              <DayCheckboxGrid
                selected={bhSelectedDays}
                onToggle={(day) =>
                  setBhSelectedDays((prev) =>
                    prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
                  )
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={bhIsClosed} onCheckedChange={(v) => { setBhIsClosed(v); if (v) setBhIs24h(false); }} id="bh_closed" />
              <Label htmlFor="bh_closed">Fechado nestes dias</Label>
            </div>

            {!bhIsClosed && (
              <>
                <div className="flex items-center gap-2">
                  <Switch checked={bhIs24h} onCheckedChange={setBhIs24h} id="bh_24h" />
                  <Label htmlFor="bh_24h">Funcionamento 24 horas</Label>
                </div>

                {!bhIs24h && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label>Abertura</Label>
                      <Input type="time" value={bhOpenTime} onChange={(e) => setBhOpenTime(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Fechamento</Label>
                      <Input type="time" value={bhCloseTime} onChange={(e) => setBhCloseTime(e.target.value)} />
                    </div>
                  </div>
                )}
              </>
            )}

            <Button onClick={onBusinessSubmit} disabled={bhSaving} className="bg-primary">
              {bhSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog plantão / emergência ── */}
      <Dialog open={emergencyModalOpen} onOpenChange={setEmergencyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Plantão / Emergência</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label>Dias da semana</Label>
              <div className="flex gap-2 mb-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setEhSelectedDays([0, 6])}>
                  Fim de semana
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setEhSelectedDays([0, 1, 2, 3, 4, 5, 6])}>
                  Todos
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setEhSelectedDays([])}>
                  Limpar
                </Button>
              </div>
              <DayCheckboxGrid
                selected={ehSelectedDays}
                onToggle={(day) =>
                  setEhSelectedDays((prev) =>
                    prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
                  )
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Início</Label>
                <Input type="time" value={ehStartTime} onChange={(e) => setEhStartTime(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Fim</Label>
                <Input type="time" value={ehEndTime} onChange={(e) => setEhEndTime(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={ehIsActive} onCheckedChange={setEhIsActive} id="eh_active" />
              <Label htmlFor="eh_active">Ativo</Label>
            </div>

            <Button onClick={onEmergencySubmit} disabled={ehSaving} className="bg-primary">
              {ehSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog agenda veterinário ── */}
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
              <DayCheckboxGrid
                selected={vetSelectedDays}
                onToggle={(day) =>
                  setVetSelectedDays((prev) =>
                    prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
                  )
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Início</Label>
                <Input type="time" {...vetForm.register('start_time', { required: true })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Fim</Label>
                <Input type="time" {...vetForm.register('end_time', { required: true })} />
              </div>
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
            <Button type="submit" className="bg-primary">
              Adicionar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
