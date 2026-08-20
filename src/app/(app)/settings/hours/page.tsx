'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
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
import { Plus, Trash2, Loader2, Pencil } from 'lucide-react';
import {
  useBusinessHoursQuery,
  useSaveBusinessHoursBatchMutation,
  useEmergencyHoursQuery,
  useCreateEmergencyHourMutation,
  useVetSchedulesQuery,
  useCreateVetScheduleMutation,
  useDeleteVetScheduleMutation,
} from '@/hooks/apiHooks/useAvailabilityConfig';
import { useVeterinariansQuery } from '@/hooks/apiHooks/useUsers';
import type { BusinessHour, EmergencyHour, VetSchedule } from '@/app/types/availability';

const getDays = (t: (key: string) => string) => [
  { value: 0, label: t('settingsHours.days.sunday') },
  { value: 1, label: t('settingsHours.days.monday') },
  { value: 2, label: t('settingsHours.days.tuesday') },
  { value: 3, label: t('settingsHours.days.wednesday') },
  { value: 4, label: t('settingsHours.days.thursday') },
  { value: 5, label: t('settingsHours.days.friday') },
  { value: 6, label: t('settingsHours.days.saturday') },
];

const getScheduleTypes = (t: (key: string) => string) => [
  { value: 'regular', label: t('settingsHours.scheduleTypes.regular') },
  { value: 'on_call', label: t('settingsHours.scheduleTypes.onCall') },
];

interface VetFormValues {
  user_id: string;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  schedule_type: string;
}

export default function SettingsHoursPage() {
  const { t } = useTranslation();
  const DAYS = getDays(t);
  const SCHEDULE_TYPES = getScheduleTypes(t);
  const { data: businessHours = [], isLoading: loadingBusiness } = useBusinessHoursQuery();
  const { data: emergencyHours = [], isLoading: loadingEmergency } = useEmergencyHoursQuery();
  const { data: vetSchedules = [], isLoading: loadingVet } = useVetSchedulesQuery();
  const { data: veterinarians = [] } = useVeterinariansQuery();
  const loading = loadingBusiness || loadingEmergency || loadingVet;

  const saveBusinessBatchMutation = useSaveBusinessHoursBatchMutation();
  const createEmergencyMutation = useCreateEmergencyHourMutation();
  const createVetScheduleMutation = useCreateVetScheduleMutation();
  const deleteVetScheduleMutation = useDeleteVetScheduleMutation();

  // Business hours form state
  const [businessModalOpen, setBusinessModalOpen] = useState(false);
  const [bhSelectedDays, setBhSelectedDays] = useState<number[]>([]);
  const [bhOpenTime, setBhOpenTime] = useState('08:00');
  const [bhCloseTime, setBhCloseTime] = useState('18:00');
  const [bhIsClosed, setBhIsClosed] = useState(false);
  const [bhIs24h, setBhIs24h] = useState(false);
  const bhSaving = saveBusinessBatchMutation.isPending;

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
      toast.error(t('settingsHours.errors.selectDay'));
      return;
    }
    try {
      await saveBusinessBatchMutation.mutateAsync({
        days: bhSelectedDays,
        open_time: bhIsClosed ? undefined : bhIs24h ? '00:00' : bhOpenTime,
        close_time: bhIsClosed ? undefined : bhIs24h ? '23:59' : bhCloseTime,
        is_closed: bhIsClosed,
        is_24h: bhIs24h && !bhIsClosed,
      });
      setBusinessModalOpen(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('settingsHours.errors.saveError')));
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
      toast.error(t('settingsHours.errors.selectDay'));
      return;
    }
    if (!ehStartTime || !ehEndTime) {
      toast.error(t('settingsHours.errors.fillStartEnd'));
      return;
    }
    setEhSaving(true);
    const errors: string[] = [];
    for (const day of ehSelectedDays) {
      try {
        await createEmergencyMutation.mutateAsync({
          day_of_week: day,
          start_time: ehStartTime,
          end_time: ehEndTime,
          is_active: ehIsActive,
        });
      } catch (error: unknown) {
        errors.push(
          `${DAYS.find((weekday) => weekday.value === day)?.label}: ${getApiErrorMessage(error, t('settingsHours.errors.generic'))}`,
        );
      }
    }
    if (errors.length) {
      toast.error(errors.join(' | '));
    } else {
      toast.success(
        ehSelectedDays.length > 1
          ? t('settingsHours.daysUpdated', { count: ehSelectedDays.length })
          : t('settingsHours.saved'),
      );
    }
    setEmergencyModalOpen(false);
    setEhSaving(false);
  };

  // ── Vet schedule handlers ──

  const onVetFinish = async (values: VetFormValues) => {
    if (vetSelectedDays.length === 0) {
      toast.error(t('settingsHours.errors.selectDay'));
      return;
    }
    const errors: string[] = [];
    for (const day of vetSelectedDays) {
      try {
        await createVetScheduleMutation.mutateAsync({
          user_id: values.user_id,
          day_of_week: day,
          start_time: values.start_time,
          end_time: values.end_time,
          slot_duration_minutes: Number(values.slot_duration_minutes) || 30,
          schedule_type: values.schedule_type || 'regular',
        });
      } catch (error: unknown) {
        errors.push(
          `${DAYS.find((weekday) => weekday.value === day)?.label}: ${getApiErrorMessage(error, t('settingsHours.errors.generic'))}`,
        );
      }
    }
    if (errors.length) {
      toast.error(errors.join(' | '));
    } else {
      toast.success(
        vetSelectedDays.length > 1
          ? t('settingsHours.schedulesAdded', { count: vetSelectedDays.length })
          : t('settingsHours.added'),
      );
    }
    setVetModalOpen(false);
    vetForm.reset();
    setVetSelectedDays([]);
  };

  const handleDeleteVetSchedule = async (id: string) => {
    try {
      await deleteVetScheduleMutation.mutateAsync(id);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('settingsHours.errors.removeError')));
    }
  };

  const DayCheckboxGrid = ({ selected, onToggle }: { selected: number[]; onToggle: (day: number) => void }) => (
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
      <h1 className="text-2xl font-heading font-bold text-primary mb-6">{t('settingsHours.pageTitle')}</h1>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardContent className="px-4 pt-6 sm:px-6">
            <Tabs defaultValue="business">
              <TabsList className="mb-4 grid h-auto! w-full grid-cols-1 gap-1 sm:grid-cols-3">
                <TabsTrigger value="business" className="h-auto! whitespace-normal px-3 py-2 text-center leading-snug">
                  {t('settingsHours.tabs.business')}
                </TabsTrigger>
                <TabsTrigger value="emergency" className="h-auto! whitespace-normal px-3 py-2 text-center leading-snug">
                  {t('settingsHours.tabs.emergency')}
                </TabsTrigger>
                <TabsTrigger value="vet" className="h-auto! whitespace-normal px-3 py-2 text-center leading-snug">
                  {t('settingsHours.tabs.vet')}
                </TabsTrigger>
              </TabsList>

              {/* ── Business Hours ── */}
              <TabsContent value="business">
                <p className="text-muted-foreground mb-4">
                  {t('settingsHours.business.description')}
                </p>
                <Button onClick={() => openBusinessModal()} className="mb-4 w-full bg-primary sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" /> {t('settingsHours.business.configureDays')}
                </Button>
                {/* Desktop / tablet: tabela */}
                <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-full border-collapse bg-white text-sm">
                  <TableHeader>
                    <TableRow className="border-b border-gray-300 h-15">
                      <TableHead>{t('settingsHours.table.day')}</TableHead>
                      <TableHead>{t('settingsHours.business.table.opens')}</TableHead>
                      <TableHead>{t('settingsHours.business.table.closes')}</TableHead>
                      <TableHead>{t('settingsHours.table.status')}</TableHead>
                      <TableHead>{t('settingsHours.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {businessHours.map((r) => (
                      <TableRow className="border-b border-gray-300 h-15" key={r.id ?? r.day_of_week}>
                        <TableCell>{DAYS.find((x) => x.value === r.day_of_week)?.label ?? r.day_of_week}</TableCell>
                        <TableCell>{r.is_closed ? '—' : r.is_24h ? '00:00' : (r.open_time ?? '—')}</TableCell>
                        <TableCell>{r.is_closed ? '—' : r.is_24h ? '23:59' : (r.close_time ?? '—')}</TableCell>
                        <TableCell>
                          {r.is_closed ? (
                            <Badge variant="destructive">{t('settingsHours.business.status.closed')}</Badge>
                          ) : r.is_24h ? (
                            <Badge className="bg-purple-500">{t('settingsHours.business.status.open24h')}</Badge>
                          ) : (
                            <Badge className="bg-green-500">{t('settingsHours.business.status.open')}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="p-0"
                            title={t('settingsHours.actions.edit')}
                            aria-label={t('settingsHours.actions.edit')}
                            onClick={() => openBusinessModal(r)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>

                {/* Mobile: cards */}
                <div className="space-y-2 md:hidden">
                  {businessHours.map((r) => (
                    <div key={r.id ?? r.day_of_week} className="rounded-lg border border-gray-300 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {DAYS.find((x) => x.value === r.day_of_week)?.label ?? r.day_of_week}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {r.is_closed
                              ? '—'
                              : `${r.is_24h ? '00:00' : (r.open_time ?? '—')} – ${r.is_24h ? '23:59' : (r.close_time ?? '—')}`}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {r.is_closed ? (
                            <Badge variant="destructive">{t('settingsHours.business.status.closed')}</Badge>
                          ) : r.is_24h ? (
                            <Badge className="bg-purple-500">{t('settingsHours.business.status.open24h')}</Badge>
                          ) : (
                            <Badge className="bg-green-500">{t('settingsHours.business.status.open')}</Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="p-0"
                            title={t('settingsHours.actions.edit')}
                            aria-label={t('settingsHours.actions.edit')}
                            onClick={() => openBusinessModal(r)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* ── Emergency Hours ── */}
              <TabsContent value="emergency">
                <p className="text-muted-foreground mb-4">
                  {t('settingsHours.emergency.description')}
                </p>
                <Button onClick={() => openEmergencyModal()} className="mb-4 w-full bg-primary sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" /> {t('settingsHours.emergency.configureShift')}
                </Button>
                {/* Desktop / tablet: tabela */}
                <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-full border-collapse bg-white text-sm">
                  <TableHeader>
                    <TableRow className="border-b border-gray-300 h-15">
                      <TableHead>{t('settingsHours.table.day')}</TableHead>
                      <TableHead>{t('settingsHours.table.start')}</TableHead>
                      <TableHead>{t('settingsHours.table.end')}</TableHead>
                      <TableHead>{t('settingsHours.table.status')}</TableHead>
                      <TableHead>{t('settingsHours.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emergencyHours.map((r) => (
                      <TableRow className="border-b border-gray-300 h-15" key={r.id ?? r.day_of_week}>
                        <TableCell>{DAYS.find((x) => x.value === r.day_of_week)?.label ?? r.day_of_week}</TableCell>
                        <TableCell>{r.start_time}</TableCell>
                        <TableCell>{r.end_time}</TableCell>
                        <TableCell>
                          {r.is_active ? (
                            <Badge className="bg-green-500">{t('settingsHours.emergency.status.active')}</Badge>
                          ) : (
                            <Badge variant="secondary">{t('settingsHours.emergency.status.inactive')}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="p-0"
                            title={t('settingsHours.actions.edit')}
                            aria-label={t('settingsHours.actions.edit')}
                            onClick={() => openEmergencyModal(r)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>

                {/* Mobile: cards */}
                <div className="space-y-2 md:hidden">
                  {emergencyHours.map((r) => (
                    <div key={r.id ?? r.day_of_week} className="rounded-lg border border-gray-300 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {DAYS.find((x) => x.value === r.day_of_week)?.label ?? r.day_of_week}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {r.start_time} – {r.end_time}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {r.is_active ? (
                            <Badge className="bg-green-500">{t('settingsHours.emergency.status.active')}</Badge>
                          ) : (
                            <Badge variant="secondary">{t('settingsHours.emergency.status.inactive')}</Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="p-0"
                            title={t('settingsHours.actions.edit')}
                            aria-label={t('settingsHours.actions.edit')}
                            onClick={() => openEmergencyModal(r)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* ── Vet Schedules ── */}
              <TabsContent value="vet">
                <p className="text-muted-foreground mb-4">
                  {t('settingsHours.vet.description')}
                </p>
                <Button
                  onClick={() => {
                    vetForm.reset();
                    setVetSelectedDays([]);
                    setVetModalOpen(true);
                  }}
                  className="mb-4 w-full bg-primary sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" /> {t('settingsHours.vet.addSchedule')}
                </Button>
                {/* Desktop / tablet: tabela */}
                <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-full border-collapse bg-white text-sm">
                  <TableHeader>
                    <TableRow className="border-b border-gray-300 h-15">
                      <TableHead>{t('settingsHours.vet.table.vet')}</TableHead>
                      <TableHead>{t('settingsHours.table.day')}</TableHead>
                      <TableHead>{t('settingsHours.table.start')}</TableHead>
                      <TableHead>{t('settingsHours.table.end')}</TableHead>
                      <TableHead>{t('settingsHours.vet.table.slot')}</TableHead>
                      <TableHead>{t('settingsHours.vet.table.type')}</TableHead>
                      <TableHead>{t('settingsHours.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vetSchedules.map((r) => (
                      <TableRow className="border-b border-gray-300 h-15" key={r.id}>
                        <TableCell>
                          {r.user?.name ?? veterinarians.find((v) => v.id === r.user_id)?.name ?? r.user_id}
                        </TableCell>
                        <TableCell>{DAYS.find((x) => x.value === r.day_of_week)?.label ?? r.day_of_week}</TableCell>
                        <TableCell>{r.start_time}</TableCell>
                        <TableCell>{r.end_time}</TableCell>
                        <TableCell>{r.slot_duration_minutes}</TableCell>
                        <TableCell>
                          {r.schedule_type === 'on_call' ? (
                            <Badge className="bg-orange-500">{t('settingsHours.scheduleTypes.onCallShort')}</Badge>
                          ) : (
                            <Badge className="bg-primary/100">{t('settingsHours.scheduleTypes.regularShort')}</Badge>
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
                                <AlertDialogTitle>{t('settingsHours.vet.deleteConfirm.title')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('settingsHours.vet.deleteConfirm.description')}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('settingsHours.cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteVetSchedule(r.id)}>
                                  {t('settingsHours.actions.remove')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>

                {/* Mobile: cards */}
                <div className="space-y-2 md:hidden">
                  {vetSchedules.map((r) => (
                    <div key={r.id} className="rounded-lg border border-gray-300 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {r.user?.name ?? veterinarians.find((v) => v.id === r.user_id)?.name ?? r.user_id}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('settingsHours.vet.mobileSummary', {
                              day: DAYS.find((x) => x.value === r.day_of_week)?.label ?? r.day_of_week,
                              start: r.start_time,
                              end: r.end_time,
                              slot: r.slot_duration_minutes,
                            })}
                          </p>
                        </div>
                        {r.schedule_type === 'on_call' ? (
                          <Badge className="shrink-0 bg-orange-500">{t('settingsHours.scheduleTypes.onCallShort')}</Badge>
                        ) : (
                          <Badge className="shrink-0 bg-primary/100">{t('settingsHours.scheduleTypes.regularShort')}</Badge>
                        )}
                      </div>
                      <div className="mt-2 flex justify-end border-t border-gray-200 pt-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" className="h-7 w-7">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('settingsHours.vet.deleteConfirm.title')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('settingsHours.vet.deleteConfirm.description')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('settingsHours.cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteVetSchedule(r.id)}>
                                {t('settingsHours.actions.remove')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* ── Dialog horário de funcionamento ── */}
      <Dialog open={businessModalOpen} onOpenChange={setBusinessModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settingsHours.tabs.business')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label>{t('settingsHours.daysOfWeek')}</Label>
              <div className="flex gap-2 mb-1">
                <Button type="button" variant="outline" size="sm" onClick={selectAllWeekdays}>
                  {t('settingsHours.business.weekdaysBtn')}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={selectAllDays}>
                  {t('settingsHours.all')}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setBhSelectedDays([])}>
                  {t('settingsHours.clear')}
                </Button>
              </div>
              <DayCheckboxGrid
                selected={bhSelectedDays}
                onToggle={(day) =>
                  setBhSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={bhIsClosed}
                onCheckedChange={(v) => {
                  setBhIsClosed(v);
                  if (v) setBhIs24h(false);
                }}
                id="bh_closed"
              />
              <Label htmlFor="bh_closed">{t('settingsHours.business.closedOnDays')}</Label>
            </div>

            {!bhIsClosed && (
              <>
                <div className="flex items-center gap-2">
                  <Switch checked={bhIs24h} onCheckedChange={setBhIs24h} id="bh_24h" />
                  <Label htmlFor="bh_24h">{t('settingsHours.business.open24h')}</Label>
                </div>

                {!bhIs24h && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label>{t('settingsHours.business.opens')}</Label>
                      <Input type="time" value={bhOpenTime} onChange={(e) => setBhOpenTime(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>{t('settingsHours.business.closes')}</Label>
                      <Input type="time" value={bhCloseTime} onChange={(e) => setBhCloseTime(e.target.value)} />
                    </div>
                  </div>
                )}
              </>
            )}

            <Button onClick={onBusinessSubmit} disabled={bhSaving} className="bg-primary">
              {bhSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('settingsHours.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog plantão / emergência ── */}
      <Dialog open={emergencyModalOpen} onOpenChange={setEmergencyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settingsHours.tabs.emergency')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label>{t('settingsHours.daysOfWeek')}</Label>
              <div className="flex gap-2 mb-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setEhSelectedDays([0, 6])}>
                  {t('settingsHours.emergency.weekendBtn')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEhSelectedDays([0, 1, 2, 3, 4, 5, 6])}
                >
                  {t('settingsHours.all')}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setEhSelectedDays([])}>
                  {t('settingsHours.clear')}
                </Button>
              </div>
              <DayCheckboxGrid
                selected={ehSelectedDays}
                onToggle={(day) =>
                  setEhSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>{t('settingsHours.table.start')}</Label>
                <Input type="time" value={ehStartTime} onChange={(e) => setEhStartTime(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('settingsHours.table.end')}</Label>
                <Input type="time" value={ehEndTime} onChange={(e) => setEhEndTime(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={ehIsActive} onCheckedChange={setEhIsActive} id="eh_active" />
              <Label htmlFor="eh_active">{t('settingsHours.emergency.status.active')}</Label>
            </div>

            <Button onClick={onEmergencySubmit} disabled={ehSaving} className="bg-primary">
              {ehSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('settingsHours.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog agenda veterinário ── */}
      <Dialog open={vetModalOpen} onOpenChange={setVetModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settingsHours.vet.modalTitle')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={vetForm.handleSubmit(onVetFinish)} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label>{t('settingsHours.vet.table.vet')}</Label>
              <Controller
                name="user_id"
                control={vetForm.control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('settingsHours.selectPlaceholder')} />
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
              <Label>{t('settingsHours.daysOfWeek')}</Label>
              <DayCheckboxGrid
                selected={vetSelectedDays}
                onToggle={(day) =>
                  setVetSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>{t('settingsHours.table.start')}</Label>
                <Input type="time" {...vetForm.register('start_time', { required: true })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('settingsHours.table.end')}</Label>
                <Input type="time" {...vetForm.register('end_time', { required: true })} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('settingsHours.vet.slotDuration')}</Label>
              <Input type="number" min={10} max={120} {...vetForm.register('slot_duration_minutes')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('settingsHours.vet.scheduleType')}</Label>
              <Controller
                name="schedule_type"
                control={vetForm.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHEDULE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <Button type="submit" className="bg-primary">
              {t('settingsHours.vet.addButton')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
