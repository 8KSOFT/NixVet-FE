'use client';

import React, { useEffect, useState } from 'react';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import api from '@/lib/axios';
import { useTranslation } from 'react-i18next';

interface Resource {
  id: string;
  name: string;
  type: string;
}

interface AppointmentType {
  id: string;
  name: string;
  duration_minutes: number;
  color: string | null;
}

interface AvailabilitySlot {
  vetId: string;
  vetName: string;
  slots: string[];
}

interface Consultation {
  id: string;
  consultation_date: string;
  patient?: { name: string };
  veterinarian?: { name: string };
  observations?: string;
  status?: string;
  paid?: boolean;
}

interface Patient {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  role: string;
}

interface GoogleEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description: string | null;
  isFromNixVet: boolean;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const PT_MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function buildCalendarDays(month: Dayjs): Dayjs[] {
  const startOfMonth = month.startOf('month');
  const endOfMonth = month.endOf('month');
  const startDow = startOfMonth.day();
  const days: Dayjs[] = [];
  for (let i = startDow - 1; i >= 0; i--) {
    days.push(startOfMonth.subtract(i + 1, 'day'));
  }
  for (let i = 0; i < endOfMonth.date(); i++) {
    days.push(startOfMonth.add(i, 'day'));
  }
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push(endOfMonth.add(i, 'day'));
  }
  return days;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

interface SlotSelectProps {
  veterinarianId: string;
  availability: AvailabilitySlot[];
  availabilityLoading: boolean;
  value: string;
  onChange: (v: string) => void;
}

function SlotSelect({ veterinarianId, availability, availabilityLoading, value, onChange }: SlotSelectProps) {
  const vetSlots = veterinarianId ? availability.find(a => a.vetId === veterinarianId) : null;
  const options = (vetSlots?.slots ?? []).map(slot => ({
    value: slot,
    label: new Date(slot).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  }));

  return (
    <div className="space-y-1">
      <Label>Horário disponível <span className="text-red-500">*</span></Label>
      {availabilityLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando horários...
        </div>
      ) : (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o horário" />
          </SelectTrigger>
          <SelectContent>
            {options.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const { t } = useTranslation('common');
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [veterinarians, setVeterinarians] = useState<User[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [updating, setUpdating] = useState(false);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [rescheduleVisible, setRescheduleVisible] = useState(false);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [resources, setResources] = useState<Resource[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [googleEvents, setGoogleEvents] = useState<GoogleEvent[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleDiag, setGoogleDiag] = useState<Record<string, unknown> | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs());
  const [summarizeLoading, setSummarizeLoading] = useState(false);
  const [structureLoading, setStructureLoading] = useState(false);

  const [formData, setFormData] = useState({
    patient_id: '',
    consultation_date: '',
    veterinarian_id: '',
    slot_datetime: '',
    price: '',
    appointment_type_id: '',
    required_resources: [] as string[],
    observations: '',
  });

  const fetchConsultations = async () => {
    try {
      const response = await api.get('/consultations');
      setConsultations(response.data);
    } catch (error) {
      console.error('Error fetching consultations:', error);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await api.get('/patients');
      setPatients(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchVeterinarians = async () => {
    try {
      const response = await api.get('/users/veterinarians');
      setVeterinarians(response.data);
    } catch (error) {
      console.error('Error fetching veterinarians:', error);
    }
  };

  const fetchResources = async () => {
    try {
      const res = await api.get<Resource[]>('/resources');
      setResources(Array.isArray(res.data) ? res.data : []);
    } catch {
      setResources([]);
    }
  };

  const fetchAppointmentTypes = async () => {
    try {
      const res = await api.get<AppointmentType[]>('/appointment-types');
      setAppointmentTypes(Array.isArray(res.data) ? res.data : []);
    } catch {
      setAppointmentTypes([]);
    }
  };

  const fetchGoogleStatus = async () => {
    try {
      const res = await api.get<Record<string, unknown>>('/integrations/google/status');
      const connected = res.data?.connected ?? false;
      setGoogleConnected(Boolean(connected));
      setGoogleDiag(res.data);
      if (connected) {
        const from = currentMonth.startOf('month').toISOString();
        const to = currentMonth.endOf('month').toISOString();
        const evRes = await api.get<GoogleEvent[]>('/integrations/google/events', { params: { from, to } });
        setGoogleEvents(Array.isArray(evRes.data) ? evRes.data : []);
      }
    } catch {
      setGoogleConnected(false);
    }
  };

  const fetchGoogleEvents = async (month: Dayjs) => {
    try {
      const from = month.startOf('month').toISOString();
      const to = month.endOf('month').toISOString();
      const res = await api.get<GoogleEvent[]>('/integrations/google/events', { params: { from, to } });
      setGoogleEvents(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      toast.warning(e?.response?.data?.message ?? 'Não foi possível carregar eventos do Google Calendar');
      setGoogleEvents([]);
    }
  };

  useEffect(() => {
    fetchConsultations();
    fetchPatients();
    fetchVeterinarians();
    fetchResources();
    fetchAppointmentTypes();
    fetchGoogleStatus();
  }, []);

  useEffect(() => {
    if (googleConnected) {
      fetchGoogleEvents(currentMonth);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  const getListData = (value: Dayjs) => {
    return consultations.filter(c => dayjs(c.consultation_date).isSame(value, 'day'));
  };

  const formatStatus = (status?: string) => {
    if (status === 'completed') return 'Realizada';
    if (status === 'cancelled') return 'Cancelada';
    return 'Agendada';
  };

  const getStatusBadgeClass = (status?: string) => {
    if (status === 'completed') return 'bg-green-500 hover:bg-green-600 text-white';
    if (status === 'cancelled') return 'bg-red-500 hover:bg-red-600 text-white';
    return 'bg-blue-500 hover:bg-blue-600 text-white';
  };

  const handleOpenDetails = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    setDetailsVisible(true);
  };

  const handleSelect = (date: Dayjs) => {
    setSelectedDate(date);
    if (!date.isSame(currentMonth, 'month')) {
      setCurrentMonth(date);
    }
  };

  const fetchAvailability = async (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    setAvailabilityLoading(true);
    try {
      const res = await api.get('/availability', { params: { date: dateStr } });
      setAvailability(res.data?.veterinarians ?? []);
    } catch {
      setAvailability([]);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({
      patient_id: '',
      consultation_date: selectedDate.format('YYYY-MM-DD'),
      veterinarian_id: '',
      slot_datetime: '',
      price: '',
      appointment_type_id: '',
      required_resources: [],
      observations: '',
    });
    setModalVisible(true);
    fetchAvailability(selectedDate);
  };

  const handleSummarizeObservations = async () => {
    const notes = formData.observations ?? '';
    if (!notes.trim()) {
      toast.info('Digite algo nas observações para resumir');
      return;
    }
    setSummarizeLoading(true);
    try {
      const res = await api.post<{ summary?: string }>('/ai/summarize', { notes });
      const summary = res.data?.summary ?? '';
      if (summary) setFormData(prev => ({ ...prev, observations: summary }));
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao resumir');
    } finally {
      setSummarizeLoading(false);
    }
  };

  const handleStructureObservations = async () => {
    const text = formData.observations ?? '';
    if (!text.trim()) {
      toast.info('Digite algo nas observações para estruturar');
      return;
    }
    setStructureLoading(true);
    try {
      const res = await api.post<{ symptoms?: string[]; possible_diagnosis?: string[] }>('/ai/structure-observations', { text });
      const symptoms = res.data?.symptoms ?? [];
      const diagnosis = res.data?.possible_diagnosis ?? [];
      const structured = [
        symptoms.length ? `Sintomas: ${symptoms.join(', ')}` : '',
        diagnosis.length ? `Diagnóstico possível: ${diagnosis.join(', ')}` : '',
      ].filter(Boolean).join('\n');
      if (structured) {
        setFormData(prev => ({
          ...prev,
          observations: (text + (text.endsWith('\n') ? '' : '\n') + structured).trim(),
        }));
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao estruturar');
    } finally {
      setStructureLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.patient_id || !formData.veterinarian_id || !formData.price) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    try {
      const consultationDate = formData.slot_datetime
        ? formData.slot_datetime
        : dayjs(formData.consultation_date).toISOString();
      const selectedType = appointmentTypes.find(tp => tp.id === formData.appointment_type_id);
      const payload = {
        patient_id: formData.patient_id,
        veterinarian_id: formData.veterinarian_id,
        consultation_date: consultationDate,
        price: parseFloat(formData.price),
        observations: formData.observations,
        required_resources: formData.required_resources.length ? formData.required_resources : undefined,
        appointment_type_id: formData.appointment_type_id || undefined,
        duration_minutes: selectedType?.duration_minutes ?? undefined,
      };
      await api.post('/consultations', payload);
      toast.success('Consulta agendada com sucesso');
      setModalVisible(false);
      fetchConsultations();
    } catch (error) {
      console.error('Error scheduling consultation:', error);
      toast.error('Erro ao agendar consulta. Verifique os dados.');
    }
  };

  const handleMarkCompleted = async () => {
    if (!selectedConsultation) return;
    try {
      setUpdating(true);
      await api.put(`/consultations/${selectedConsultation.id}`, { status: 'completed' });
      toast.success('Consulta marcada como realizada');
      setDetailsVisible(false);
      setSelectedConsultation(null);
      fetchConsultations();
    } catch (error) {
      console.error('Error updating consultation status:', error);
      toast.error('Erro ao atualizar status da consulta');
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedConsultation) return;
    try {
      setUpdating(true);
      await api.put(`/consultations/${selectedConsultation.id}`, { paid: true });
      toast.success('Pagamento confirmado');
      setDetailsVisible(false);
      setSelectedConsultation(null);
      fetchConsultations();
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('Erro ao confirmar pagamento');
    } finally {
      setUpdating(false);
    }
  };

  const openReschedule = () => {
    const dateStr = selectedConsultation?.consultation_date
      ? dayjs(selectedConsultation.consultation_date).format('YYYY-MM-DDTHH:mm')
      : dayjs().format('YYYY-MM-DDTHH:mm');
    setRescheduleDate(dateStr);
    setRescheduleVisible(true);
  };

  const handleRescheduleSubmit = async () => {
    if (!selectedConsultation || !rescheduleDate) {
      toast.error('Preencha a nova data/hora');
      return;
    }
    setRescheduleLoading(true);
    try {
      const startDate = new Date(rescheduleDate);
      const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
      await api.put(`/consultations/${selectedConsultation.id}/reschedule`, {
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
      });
      toast.success('Consulta reagendada');
      setRescheduleVisible(false);
      setDetailsVisible(false);
      setSelectedConsultation(null);
      fetchConsultations();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erro ao reagendar');
    } finally {
      setRescheduleLoading(false);
    }
  };

  const dateCellRender = (day: Dayjs) => {
    const listData = getListData(day);
    const dayGoogleEvents = googleEvents.filter(
      e => e.start && dayjs(e.start).isSame(day, 'day'),
    );
    return (
      <ul className="list-none p-0 m-0 space-y-0.5">
        {listData.map(item => (
          <li
            key={item.id}
            className="cursor-pointer"
            onClick={e => { e.stopPropagation(); handleOpenDetails(item); }}
          >
            <div className="flex items-center gap-1">
              <span className={cn(
                'inline-block w-2 h-2 rounded-full flex-shrink-0',
                item.status === 'completed' ? 'bg-green-500' :
                item.status === 'cancelled' ? 'bg-red-500' : 'bg-blue-500',
              )} />
              <span className="text-xs truncate leading-tight">
                {dayjs(item.consultation_date).format('HH:mm')} {item.patient?.name}
              </span>
            </div>
          </li>
        ))}
        {dayGoogleEvents.map(e => (
          <li key={`g-${e.id}`}>
            <div className="flex items-center gap-1">
              <span className={cn(
                'inline-block w-2 h-2 rounded-full flex-shrink-0',
                e.isFromNixVet ? 'bg-blue-300' : 'bg-blue-500',
              )} />
              <span className={cn('text-xs truncate leading-tight', e.isFromNixVet ? 'text-blue-400' : 'text-blue-600')}>
                {e.start ? dayjs(e.start).format('HH:mm') : ''} {e.title}
                {e.isFromNixVet && ' ↗'}
              </span>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  const calendarDays = buildCalendarDays(currentMonth);

  const toggleResource = (id: string) => {
    setFormData(prev => ({
      ...prev,
      required_resources: prev.required_resources.includes(id)
        ? prev.required_resources.filter(r => r !== id)
        : [...prev.required_resources, id],
    }));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
          <CalendarIcon className="h-6 w-6" /> {t('calendar.title')}
          {googleConnected && (
            <span className="flex items-center gap-1 text-sm font-normal text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
              Google Calendar sincronizado
            </span>
          )}
        </h1>
        <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
          + {t('calendar.scheduleConsultation')}
        </Button>
      </div>

      {googleConnected && (
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" /> Consulta NixVet
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" /> Google Calendar externo
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-200" /> Sincronizado do NixVet ↗
            </span>
          </div>
          {googleDiag?.tokenStatus === 'expired' && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              ⚠️ Token do Google expirado. O sistema tentará renovar automaticamente.
              Se os eventos não aparecerem, desconecte e reconecte a integração em Configurações.
            </div>
          )}
          {googleEvents.length === 0 && googleDiag?.tokenStatus === 'valid' && (
            <div className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-3 py-2">
              Nenhum evento encontrado no Google Calendar para este mês.
              Calendário: {String(googleDiag?.calendarId || 'primary')} | Conta: {String(googleDiag?.accountEmail || '?')}
            </div>
          )}
        </div>
      )}

      {/* Calendar */}
      <div className="bg-white p-4 rounded-lg shadow">
        {/* Navigation header */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const prev = currentMonth.subtract(1, 'month');
              setCurrentMonth(prev);
              if (googleConnected) fetchGoogleEvents(prev);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">
            {PT_MONTHS[currentMonth.month()]} {currentMonth.year()}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const next = currentMonth.add(1, 'month');
              setCurrentMonth(next);
              if (googleConnected) fetchGoogleEvents(next);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 border-t border-l">
          {calendarDays.map((day, idx) => {
            const isCurrentMonth = day.isSame(currentMonth, 'month');
            const isToday = day.isSame(dayjs(), 'day');
            const isSelected = day.isSame(selectedDate, 'day');
            return (
              <div
                key={idx}
                className={cn(
                  'border-r border-b min-h-[80px] p-1 cursor-pointer hover:bg-gray-50 transition-colors',
                  !isCurrentMonth && 'bg-gray-50',
                  isSelected && 'bg-blue-50',
                )}
                onClick={() => handleSelect(day)}
              >
                <div className={cn(
                  'text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1',
                  isToday && 'bg-blue-600 text-white',
                  !isToday && !isCurrentMonth && 'text-gray-300',
                  !isToday && isCurrentMonth && 'text-gray-800',
                )}>
                  {day.date()}
                </div>
                {isCurrentMonth && dateCellRender(day)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Agendar Consulta */}
      <Dialog open={modalVisible} onOpenChange={setModalVisible}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agendar Consulta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Paciente <span className="text-red-500">*</span></Label>
              <Select value={formData.patient_id} onValueChange={v => setFormData(prev => ({ ...prev, patient_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Data <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={formData.consultation_date}
                onChange={e => {
                  const val = e.target.value;
                  setFormData(prev => ({ ...prev, consultation_date: val }));
                  if (val) fetchAvailability(dayjs(val));
                }}
              />
            </div>

            <div className="space-y-1">
              <Label>Veterinário <span className="text-red-500">*</span></Label>
              <Select
                value={formData.veterinarian_id}
                onValueChange={v => setFormData(prev => ({ ...prev, veterinarian_id: v, slot_datetime: '' }))}
              >
                <SelectTrigger>
                  {availabilityLoading ? (
                    <span className="flex items-center gap-2 text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                    </span>
                  ) : (
                    <SelectValue placeholder="Selecione o veterinário" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {veterinarians.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name} ({v.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <SlotSelect
              veterinarianId={formData.veterinarian_id}
              availability={availability}
              availabilityLoading={availabilityLoading}
              value={formData.slot_datetime}
              onChange={v => setFormData(prev => ({ ...prev, slot_datetime: v }))}
            />

            <div className="space-y-1">
              <Label>Valor da Consulta (R$) <span className="text-red-500">*</span></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  className="pl-9"
                  value={formData.price}
                  onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Tipo de procedimento (opcional)</Label>
              <Select
                value={formData.appointment_type_id}
                onValueChange={v => setFormData(prev => ({ ...prev, appointment_type_id: v === '_none' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo (define duração)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhum</SelectItem>
                  {appointmentTypes.map(tp => (
                    <SelectItem key={tp.id} value={tp.id}>
                      {tp.name} — {formatDuration(tp.duration_minutes)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {resources.length > 0 && (
              <div className="space-y-1">
                <Label>Recursos (opcional)</Label>
                <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px]">
                  {resources.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleResource(r.id)}
                      className={cn(
                        'text-xs px-2 py-1 rounded-full border transition-colors',
                        formData.required_resources.includes(r.id)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400',
                      )}
                    >
                      {r.name} ({r.type})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea
                rows={3}
                value={formData.observations}
                onChange={e => setFormData(prev => ({ ...prev, observations: e.target.value }))}
              />
              <div className="flex items-center gap-2 mt-1">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-blue-600"
                  onClick={handleSummarizeObservations}
                  disabled={summarizeLoading}
                >
                  {summarizeLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Resumir
                </Button>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-blue-600"
                  onClick={handleStructureObservations}
                  disabled={structureLoading}
                >
                  {structureLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Estruturar
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalVisible(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">Agendar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Detalhes da Consulta */}
      <Dialog open={detailsVisible} onOpenChange={open => { if (!open) { setDetailsVisible(false); setSelectedConsultation(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da Consulta</DialogTitle>
          </DialogHeader>
          {selectedConsultation && (
            <div className="space-y-3 py-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Data e hora:</span>
                <span className="font-medium">
                  {new Date(selectedConsultation.consultation_date).toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Paciente:</span>
                <span className="font-medium">{selectedConsultation.patient?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Veterinário:</span>
                <span className="font-medium">{selectedConsultation.veterinarian?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Status:</span>
                <Badge className={getStatusBadgeClass(selectedConsultation.status)}>
                  {formatStatus(selectedConsultation.status)}
                </Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Pagamento:</span>
                <Badge className={selectedConsultation.paid
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'}>
                  {selectedConsultation.paid ? 'Pago' : 'Pendente'}
                </Badge>
              </div>
              {selectedConsultation.observations && (
                <div className="pt-1">
                  <div className="text-sm font-semibold mb-1 text-gray-700">Observações</div>
                  <div className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                    {selectedConsultation.observations}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => { setDetailsVisible(false); setSelectedConsultation(null); }}
            >
              Fechar
            </Button>
            <Button
              variant="outline"
              disabled={selectedConsultation?.status === 'cancelled'}
              onClick={openReschedule}
            >
              Reagendar
            </Button>
            <Button
              disabled={selectedConsultation?.status === 'completed' || updating}
              onClick={handleMarkCompleted}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Marcar como realizada
            </Button>
            <Button
              disabled={!!selectedConsultation?.paid || updating}
              onClick={handleConfirmPayment}
              className="bg-green-600 hover:bg-green-700"
            >
              {updating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Reagendar */}
      <Dialog open={rescheduleVisible} onOpenChange={setRescheduleVisible}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reagendar consulta</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 py-2">
            <Label>Nova data e hora <span className="text-red-500">*</span></Label>
            <Input
              type="datetime-local"
              value={rescheduleDate}
              onChange={e => setRescheduleDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleVisible(false)}>Cancelar</Button>
            <Button
              onClick={handleRescheduleSubmit}
              disabled={rescheduleLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {rescheduleLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
