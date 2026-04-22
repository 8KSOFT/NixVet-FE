'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, AlertTriangle, Clock, User2, Stethoscope, DollarSign, FileText, CheckCircle2, CreditCard, CalendarRange, X } from 'lucide-react';
import api from '@/lib/axios';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';

interface Resource { id: string; name: string; type: string; }
interface AppointmentType { id: string; name: string; duration_minutes: number; color: string | null; }
interface AvailabilitySlot { vetId: string; vetName: string; slots: string[]; }
interface Consultation {
  id: string; consultation_date: string;
  start_time?: string | null; end_time?: string | null;
  patient?: { id?: string; name: string; species?: string; breed?: string };
  veterinarian?: { id?: string; name: string };
  observations?: string | null; status?: string; paid?: boolean;
  price?: number | null;
  required_resources?: string[] | null;
  appointment_type?: { name: string; duration_minutes: number; color?: string | null } | null;
}
interface Patient { id: string; name: string; }
interface User { id: string; name: string; role: string; }
interface GoogleEvent { id: string; title: string; start: string; end: string; description: string | null; isFromNixVet: boolean; }

type ViewMode = 'day' | 'week' | 'month' | 'year';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const PT_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const PT_MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function buildCalendarDays(month: Dayjs): Dayjs[] {
  const start = month.startOf('month');
  const end = month.endOf('month');
  const days: Dayjs[] = [];
  for (let i = start.day() - 1; i >= 0; i--) days.push(start.subtract(i + 1, 'day'));
  for (let i = 0; i < end.date(); i++) days.push(start.add(i, 'day'));
  const rem = 42 - days.length;
  for (let i = 1; i <= rem; i++) days.push(end.add(i, 'day'));
  return days;
}

function buildWeekDays(date: Dayjs): Dayjs[] {
  const start = date.startOf('week');
  return Array.from({ length: 7 }, (_, i) => start.add(i, 'day'));
}

function formatDuration(m: number) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}min` : `${h}h`;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function SlotSelect({ veterinarianId, availability, availabilityLoading, value, onChange }: {
  veterinarianId: string; availability: AvailabilitySlot[]; availabilityLoading: boolean; value: string; onChange: (v: string) => void;
}) {
  const opts = (veterinarianId ? availability.find(a => a.vetId === veterinarianId)?.slots ?? [] : [])
    .map(s => ({ value: s, label: new Date(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }));
  return (
    <div className="space-y-1">
      <Label>Horário disponível *</Label>
      {availabilityLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
      ) : (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Selecione o horário" /></SelectTrigger>
          <SelectContent>{opts.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
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
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [detailsLoading, setDetailsLoading] = useState(false);

  const openDetails = async (c: Consultation) => {
    setSelectedConsultation(c);
    setDetailsVisible(true);
    setDetailsLoading(true);
    try {
      const res = await api.get<Consultation>(`/consultations/${c.id}`);
      setSelectedConsultation(res.data);
    } catch {} finally { setDetailsLoading(false); }
  };

  const [formData, setFormData] = useState({
    patient_id: '', consultation_date: '', veterinarian_id: '', slot_datetime: '',
    price: '', appointment_type_id: '', required_resources: [] as string[], observations: '',
  });

  const fetchConsultations = async () => { try { const r = await api.get('/consultations'); setConsultations(r.data); } catch {} };
  const fetchPatients = async () => { try { const r = await api.get('/patients'); setPatients(r.data); } catch {} };
  const fetchVeterinarians = async () => { try { const r = await api.get('/users/veterinarians'); setVeterinarians(r.data); } catch {} };
  const fetchResources = async () => { try { const r = await api.get<Resource[]>('/resources'); setResources(Array.isArray(r.data) ? r.data : []); } catch { setResources([]); } };
  const fetchAppointmentTypes = async () => { try { const r = await api.get<AppointmentType[]>('/appointment-types'); setAppointmentTypes(Array.isArray(r.data) ? r.data : []); } catch { setAppointmentTypes([]); } };

  const fetchGoogleStatus = useCallback(async () => {
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
    } catch { setGoogleConnected(false); }
  }, [currentMonth]);

  const fetchGoogleEvents = useCallback(async (month: Dayjs) => {
    try {
      const from = month.startOf('month').toISOString();
      const to = month.endOf('month').toISOString();
      const res = await api.get<GoogleEvent[]>('/integrations/google/events', { params: { from, to } });
      setGoogleEvents(Array.isArray(res.data) ? res.data : []);
    } catch { setGoogleEvents([]); }
  }, []);

  useEffect(() => { fetchConsultations(); fetchPatients(); fetchVeterinarians(); fetchResources(); fetchAppointmentTypes(); fetchGoogleStatus(); }, [fetchGoogleStatus]);
  useEffect(() => { if (googleConnected) fetchGoogleEvents(currentMonth); }, [currentMonth, googleConnected, fetchGoogleEvents]);

  const getListData = (day: Dayjs) => consultations.filter(c => dayjs(c.consultation_date).isSame(day, 'day'));
  const getGoogleByDay = (day: Dayjs) => googleEvents.filter(e => e.start && dayjs(e.start).isSame(day, 'day'));

  const formatStatus = (s?: string) => s === 'completed' ? 'Realizada' : s === 'cancelled' ? 'Cancelada' : 'Agendada';
  const statusColor = (s?: string) => s === 'completed' ? 'bg-green-500' : s === 'cancelled' ? 'bg-red-500' : 'bg-primary/100';

  const fetchAvailability = async (date: Dayjs) => {
    setAvailabilityLoading(true);
    try { const r = await api.get('/availability', { params: { date: date.format('YYYY-MM-DD') } }); setAvailability(r.data?.veterinarians ?? []); }
    catch { setAvailability([]); } finally { setAvailabilityLoading(false); }
  };

  const handleAdd = () => {
    setFormData({ patient_id: '', consultation_date: selectedDate.format('YYYY-MM-DD'), veterinarian_id: '', slot_datetime: '', price: '', appointment_type_id: '', required_resources: [], observations: '' });
    setModalVisible(true); fetchAvailability(selectedDate);
  };

  const handleSubmit = async () => {
    if (!formData.patient_id || !formData.veterinarian_id || !formData.price) { toast.error('Preencha os campos obrigatórios'); return; }
    try {
      const date = formData.slot_datetime || dayjs(formData.consultation_date).toISOString();
      const tp = appointmentTypes.find(t => t.id === formData.appointment_type_id);
      await api.post('/consultations', { patient_id: formData.patient_id, veterinarian_id: formData.veterinarian_id, consultation_date: date, price: parseFloat(formData.price), observations: formData.observations, required_resources: formData.required_resources.length ? formData.required_resources : undefined, appointment_type_id: formData.appointment_type_id || undefined, duration_minutes: tp?.duration_minutes });
      toast.success('Consulta agendada'); setModalVisible(false); fetchConsultations();
    } catch { toast.error('Erro ao agendar consulta'); }
  };

  const handleMarkCompleted = async () => { if (!selectedConsultation) return; setUpdating(true); try { await api.put(`/consultations/${selectedConsultation.id}`, { status: 'completed' }); toast.success('Marcada como realizada'); setDetailsVisible(false); fetchConsultations(); } catch { toast.error('Erro'); } finally { setUpdating(false); } };
  const handleConfirmPayment = async () => { if (!selectedConsultation) return; setUpdating(true); try { await api.put(`/consultations/${selectedConsultation.id}`, { paid: true }); toast.success('Pagamento confirmado'); setDetailsVisible(false); fetchConsultations(); } catch { toast.error('Erro'); } finally { setUpdating(false); } };
  const handleRescheduleSubmit = async () => { if (!selectedConsultation || !rescheduleDate) return; setRescheduleLoading(true); try { const s = new Date(rescheduleDate); const e = new Date(s.getTime() + 30 * 60_000); await api.put(`/consultations/${selectedConsultation.id}/reschedule`, { start_time: s.toISOString(), end_time: e.toISOString() }); toast.success('Reagendada'); setRescheduleVisible(false); setDetailsVisible(false); fetchConsultations(); } catch { toast.error('Erro ao reagendar'); } finally { setRescheduleLoading(false); } };

  const handleSummarize = async () => { if (!formData.observations?.trim()) return; setSummarizeLoading(true); try { const r = await api.post<{ summary?: string }>('/ai/summarize', { notes: formData.observations }); if (r.data?.summary) setFormData(p => ({ ...p, observations: r.data.summary! })); } catch {} finally { setSummarizeLoading(false); } };
  const handleStructure = async () => { if (!formData.observations?.trim()) return; setStructureLoading(true); try { const r = await api.post<{ symptoms?: string[]; possible_diagnosis?: string[] }>('/ai/structure-observations', { text: formData.observations }); const s = [...(r.data?.symptoms ?? []).map(x => `Sintoma: ${x}`), ...(r.data?.possible_diagnosis ?? []).map(x => `Diagnóstico: ${x}`)].join('\n'); if (s) setFormData(p => ({ ...p, observations: (p.observations + '\n' + s).trim() })); } catch {} finally { setStructureLoading(false); } };

  const navigate = (dir: -1 | 1) => {
    const unit = viewMode === 'day' ? 'day' : viewMode === 'week' ? 'week' : viewMode === 'year' ? 'year' : 'month';
    const next = dir === 1 ? currentMonth.add(1, unit) : currentMonth.subtract(1, unit);
    setCurrentMonth(next);
  };

  const headerLabel = useMemo(() => {
    if (viewMode === 'day') return currentMonth.format('DD [de] MMMM [de] YYYY');
    if (viewMode === 'week') { const s = currentMonth.startOf('week'); const e = s.add(6, 'day'); return `${s.format('DD/MM')} - ${e.format('DD/MM/YYYY')}`; }
    if (viewMode === 'year') return String(currentMonth.year());
    return `${PT_MONTHS[currentMonth.month()]} ${currentMonth.year()}`;
  }, [viewMode, currentMonth]);

  const toggleResource = (id: string) => setFormData(p => ({ ...p, required_resources: p.required_resources.includes(id) ? p.required_resources.filter(r => r !== id) : [...p.required_resources, id] }));

  // ── Render helpers ──

  const renderDot = (c: Consultation) => (
    <li key={c.id} className="cursor-pointer" onClick={e => { e.stopPropagation(); openDetails(c); }}>
      <div className="flex items-center gap-1">
        <span className={cn('inline-block w-2 h-2 rounded-full shrink-0', statusColor(c.status))} />
        <span className="text-xs truncate">{dayjs(c.consultation_date).format('HH:mm')} {c.patient?.name}</span>
      </div>
    </li>
  );

  const renderGoogleDot = (e: GoogleEvent) => (
    <li key={`g-${e.id}`}>
      <div className="flex items-center gap-1">
        <span className={cn('inline-block w-2 h-2 rounded-full shrink-0', e.isFromNixVet ? 'bg-blue-300' : 'bg-purple-500')} />
        <span className="text-xs truncate text-purple-700">{e.start ? dayjs(e.start).format('HH:mm') : ''} {e.title}</span>
      </div>
    </li>
  );

  // ── View: Day ──
  const renderDayView = () => {
    const day = currentMonth;
    const items = getListData(day);
    const gEvents = getGoogleByDay(day);
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="divide-y max-h-[65vh] overflow-y-auto">
          {HOURS.map(h => {
            const hourItems = items.filter(c => dayjs(c.consultation_date).hour() === h);
            const hourGoogle = gEvents.filter(e => dayjs(e.start).hour() === h);
            return (
              <div key={h} className="flex min-h-[48px]">
                <div className="w-16 text-xs text-muted-foreground/60 text-right pr-2 pt-1 shrink-0">{String(h).padStart(2, '0')}:00</div>
                <div className="flex-1 border-l px-2 py-1 space-y-0.5">
                  {hourItems.map(c => (
                    <div key={c.id} className={cn('text-xs px-2 py-1 rounded cursor-pointer', statusColor(c.status), 'text-white')} onClick={() => openDetails(c)}>
                      {dayjs(c.consultation_date).format('HH:mm')} - {c.patient?.name} ({c.veterinarian?.name})
                    </div>
                  ))}
                  {hourGoogle.map(e => (
                    <div key={`g-${e.id}`} className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                      {dayjs(e.start).format('HH:mm')} - {e.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── View: Week ──
  const renderWeekView = () => {
    const weekDays = buildWeekDays(currentMonth);
    return (
      <div className="bg-white rounded-lg shadow overflow-auto">
        <div className="grid grid-cols-8 border-b">
          <div className="w-16" />
          {weekDays.map((d, i) => (
            <div key={i} className={cn('text-center py-2 text-sm font-medium border-l cursor-pointer hover:bg-muted/50 transition', d.isSame(dayjs(), 'day') && 'bg-primary/10')} onClick={() => { setSelectedDate(d); setCurrentMonth(d); setViewMode('day'); }}>
              <div className="text-muted-foreground">{WEEKDAYS[d.day()]}</div>
              <div className={cn('w-7 h-7 rounded-full mx-auto flex items-center justify-center', d.isSame(dayjs(), 'day') && 'bg-primary text-white')}>{d.date()}</div>
            </div>
          ))}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {HOURS.map(h => (
            <div key={h} className="grid grid-cols-8 border-b min-h-[40px]">
              <div className="w-16 text-xs text-muted-foreground/60 text-right pr-2 pt-1">{String(h).padStart(2, '0')}:00</div>
              {weekDays.map((d, di) => {
                const items = getListData(d).filter(c => dayjs(c.consultation_date).hour() === h);
                const gEv = getGoogleByDay(d).filter(e => dayjs(e.start).hour() === h);
                return (
                  <div key={di} className="border-l px-1 py-0.5 space-y-0.5">
                    {items.map(c => (
                      <div key={c.id} className={cn('text-[10px] px-1 rounded cursor-pointer truncate', statusColor(c.status), 'text-white')} onClick={() => openDetails(c)}>
                        {dayjs(c.consultation_date).format('HH:mm')} {c.patient?.name}
                      </div>
                    ))}
                    {gEv.map(e => (
                      <div key={`g-${e.id}`} className="text-[10px] px-1 rounded bg-purple-100 text-purple-700 truncate">{e.title}</div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── View: Month ──
  const calendarDays = buildCalendarDays(currentMonth);
  const renderMonthView = () => (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(d => <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 border-t border-l">
        {calendarDays.map((day, idx) => {
          const isCur = day.isSame(currentMonth, 'month');
          const isToday = day.isSame(dayjs(), 'day');
          const isSel = day.isSame(selectedDate, 'day');
          const items = isCur ? getListData(day) : [];
          const gEv = isCur ? getGoogleByDay(day) : [];
          return (
            <div key={idx} className={cn('border-r border-b min-h-[80px] p-1 hover:bg-muted/50', !isCur && 'bg-muted/50', isSel && 'bg-primary/10')} onClick={() => { setSelectedDate(day); if (!day.isSame(currentMonth, 'month')) setCurrentMonth(day); }}>
              <div
                title="Ver dia"
                className={cn('text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 cursor-pointer hover:ring-2 ring-primary/50 transition', isToday && 'bg-primary text-white', !isToday && !isCur && 'text-gray-300', !isToday && isCur && 'text-foreground hover:bg-primary/10')}
                onClick={(e) => { e.stopPropagation(); if (!isCur) return; setSelectedDate(day); setCurrentMonth(day); setViewMode('day'); }}
              >{day.date()}</div>
              <ul className="list-none p-0 m-0 space-y-0.5">
                {items.slice(0, 3).map(renderDot)}
                {items.length > 3 && <li className="text-[10px] text-muted-foreground/60 cursor-pointer hover:text-primary" onClick={(e) => { e.stopPropagation(); setSelectedDate(day); setCurrentMonth(day); setViewMode('day'); }}>+{items.length - 3} mais</li>}
                {gEv.slice(0, 2).map(renderGoogleDot)}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── View: Year ──
  const renderYearView = () => (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
      {Array.from({ length: 12 }, (_, m) => {
        const month = currentMonth.startOf('year').add(m, 'month');
        const days = buildCalendarDays(month);
        const monthConsultations = consultations.filter(c => dayjs(c.consultation_date).isSame(month, 'month'));
        return (
          <div key={m} className="bg-white rounded-lg shadow p-3 cursor-pointer hover:ring-2 ring-blue-300 transition" onClick={() => { setCurrentMonth(month); setViewMode('month'); }}>
            <h3 className="text-sm font-semibold mb-2">{PT_MONTHS_SHORT[m]}</h3>
            <div className="grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map(d => <div key={d} className="text-[8px] text-muted-foreground/60 text-center">{d[0]}</div>)}
              {days.map((day, i) => {
                const isCur = day.isSame(month, 'month');
                const hasEvent = isCur && monthConsultations.some(c => dayjs(c.consultation_date).isSame(day, 'day'));
                return (
                  <div key={i} className={cn('text-[9px] text-center rounded', !isCur && 'text-gray-200', hasEvent && 'bg-primary/100 text-white font-bold', day.isSame(dayjs(), 'day') && !hasEvent && 'ring-1 ring-blue-400')}>
                    {day.date()}
                  </div>
                );
              })}
            </div>
            {monthConsultations.length > 0 && <div className="text-[10px] text-primary mt-1">{monthConsultations.length} consulta{monthConsultations.length > 1 ? 's' : ''}</div>}
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h1 className="text-2xl font-heading font-bold text-primary flex items-center gap-2">
          <CalendarIcon className="h-6 w-6" /> {t('calendar.title')}
          {googleConnected && <span className="text-sm font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full">Google Calendar</span>}
        </h1>
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={v => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="day">Dia</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="month">Mês</TabsTrigger>
              <TabsTrigger value="year">Ano</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => { setCurrentMonth(dayjs()); setSelectedDate(dayjs()); }} variant="outline" size="sm">Hoje</Button>
          <Button onClick={handleAdd} className="bg-primary hover:bg-blue-700">+ {t('calendar.scheduleConsultation')}</Button>
        </div>
      </div>

      {googleConnected && (
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" /> NixVet</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-500" /> Google Calendar</span>
          </div>
          {googleDiag?.tokenStatus === 'expired' && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Token expirado. Desconecte e reconecte a integração Google.
            </div>
          )}
          {googleEvents.length === 0 && googleDiag?.tokenStatus === 'valid' && (
            <div className="text-xs text-primary bg-primary/10 border border-primary/20 rounded px-3 py-2">
              Nenhum evento Google Calendar neste mês. Calendário: {String(googleDiag?.calendarId || 'primary')} |
              Para debugar: acesse <code className="bg-blue-100 px-1 rounded">/api/integrations/google/debug-events</code>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <h2 className="text-lg font-semibold min-w-[200px] text-center">{headerLabel}</h2>
        <Button variant="ghost" size="icon" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      {/* Calendar views */}
      {viewMode === 'day' && renderDayView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'year' && renderYearView()}

      {/* Modal: Agendar */}
      <Dialog open={modalVisible} onOpenChange={setModalVisible}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Agendar Consulta</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Paciente *</Label>
              <Select value={formData.patient_id} onValueChange={v => setFormData(p => ({ ...p, patient_id: v }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1">
              <Label>Data *</Label>
              <Input type="date" value={formData.consultation_date} onChange={e => { setFormData(p => ({ ...p, consultation_date: e.target.value })); if (e.target.value) fetchAvailability(dayjs(e.target.value)); }} />
            </div>
            <div className="space-y-1">
              <Label>Veterinário *</Label>
              <Select value={formData.veterinarian_id} onValueChange={v => setFormData(p => ({ ...p, veterinarian_id: v, slot_datetime: '' }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{veterinarians.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <SlotSelect veterinarianId={formData.veterinarian_id} availability={availability} availabilityLoading={availabilityLoading} value={formData.slot_datetime} onChange={v => setFormData(p => ({ ...p, slot_datetime: v }))} />
            <div className="space-y-1">
              <Label>Valor (R$) *</Label>
              <Input type="number" step="0.01" value={formData.price} onChange={e => setFormData(p => ({ ...p, price: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Tipo de procedimento</Label>
              <Select value={formData.appointment_type_id} onValueChange={v => setFormData(p => ({ ...p, appointment_type_id: v === '_none' ? '' : v }))}><SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger><SelectContent><SelectItem value="_none">Nenhum</SelectItem>{appointmentTypes.map(tp => <SelectItem key={tp.id} value={tp.id}>{tp.name} — {formatDuration(tp.duration_minutes)}</SelectItem>)}</SelectContent></Select>
            </div>
            {resources.length > 0 && (
              <div className="space-y-1">
                <Label>Recursos</Label>
                <div className="flex flex-wrap gap-2 p-2 border rounded min-h-[40px]">
                  {resources.map(r => <button key={r.id} type="button" onClick={() => toggleResource(r.id)} className={cn('text-xs px-2 py-1 rounded-full border', formData.required_resources.includes(r.id) ? 'bg-primary text-white border-blue-600' : 'bg-white text-foreground border-border')}>{r.name}</button>)}
                </div>
              </div>
            )}
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea rows={3} value={formData.observations} onChange={e => setFormData(p => ({ ...p, observations: e.target.value }))} />
              <div className="flex gap-2 mt-1">
                <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={handleSummarize} disabled={summarizeLoading}>{summarizeLoading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}Resumir</Button>
                <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={handleStructure} disabled={structureLoading}>{structureLoading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}Estruturar</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalVisible(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} className="bg-primary">Agendar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet: Detalhes estilo Google Calendar */}
      <Sheet open={detailsVisible} onOpenChange={o => { if (!o) { setDetailsVisible(false); setSelectedConsultation(null); } }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
          {/* Color header bar */}
          <div className={cn('h-2 w-full shrink-0', statusColor(selectedConsultation?.status))} />
          <div className="px-6 pt-4 pb-2">
            <SheetHeader className="mb-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <SheetTitle className="text-xl font-heading leading-tight">
                    {selectedConsultation?.patient?.name || 'Consulta'}
                  </SheetTitle>
                  {(selectedConsultation?.patient?.species || selectedConsultation?.patient?.breed) && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {selectedConsultation?.patient?.species}
                      {selectedConsultation?.patient?.breed ? ` · ${selectedConsultation?.patient?.breed}` : ''}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Badge className={cn(statusColor(selectedConsultation?.status), 'text-white text-xs')}>
                    {formatStatus(selectedConsultation?.status)}
                  </Badge>
                  <Badge className={selectedConsultation?.paid ? 'bg-green-500 text-white text-xs' : 'bg-orange-400 text-white text-xs'}>
                    {selectedConsultation?.paid ? 'Pago' : 'Pendente'}
                  </Badge>
                </div>
              </div>
            </SheetHeader>
          </div>

          {detailsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground/60" /></div>
          ) : selectedConsultation && (
            <div className="px-6 pb-6 space-y-4">
              {/* Date & time */}
              <div className="flex items-start gap-3 py-2 border-b">
                <Clock className="w-4 h-4 text-muted-foreground/60 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    {new Date(selectedConsultation.start_time || selectedConsultation.consultation_date).toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedConsultation.start_time || selectedConsultation.consultation_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    {selectedConsultation.end_time && ` → ${new Date(selectedConsultation.end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                </div>
              </div>

              {/* Vet */}
              <div className="flex items-center gap-3">
                <Stethoscope className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Veterinário</p>
                  <p className="text-sm font-medium">{selectedConsultation.veterinarian?.name || '—'}</p>
                </div>
              </div>

              {/* Patient full info */}
              <div className="flex items-center gap-3">
                <User2 className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Paciente</p>
                  <p className="text-sm font-medium">{selectedConsultation.patient?.name}</p>
                </div>
              </div>

              {/* Appointment type */}
              {selectedConsultation.appointment_type && (
                <div className="flex items-center gap-3">
                  <CalendarRange className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Procedimento</p>
                    <p className="text-sm font-medium">{selectedConsultation.appointment_type.name} <span className="text-muted-foreground font-normal">· {formatDuration(selectedConsultation.appointment_type.duration_minutes)}</span></p>
                  </div>
                </div>
              )}

              {/* Price */}
              {selectedConsultation.price != null && (
                <div className="flex items-center gap-3">
                  <DollarSign className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Valor</p>
                    <p className="text-sm font-medium">R$ {Number(selectedConsultation.price).toFixed(2)}</p>
                  </div>
                </div>
              )}

              {/* Observations */}
              {selectedConsultation.observations && (
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground/60 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Observações</p>
                    <p className="text-sm bg-muted/50 rounded-md p-3 whitespace-pre-wrap">{selectedConsultation.observations}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 border-t flex flex-wrap gap-2">
                {selectedConsultation?.patient?.id && (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => router.push(`/dashboard/medical-records?patient_id=${selectedConsultation!.patient!.id}`)}>
                    <FileText className="w-3.5 h-3.5" /> Prontuário
                  </Button>
                )}
                <Button variant="outline" size="sm" className="gap-1.5" disabled={selectedConsultation?.status === 'cancelled'} onClick={() => { setRescheduleDate(selectedConsultation ? dayjs(selectedConsultation.start_time || selectedConsultation.consultation_date).format('YYYY-MM-DDTHH:mm') : ''); setRescheduleVisible(true); }}>
                  <CalendarRange className="w-3.5 h-3.5" /> Reagendar
                </Button>
                <Button size="sm" className="gap-1.5 bg-primary" disabled={selectedConsultation?.status === 'completed' || updating} onClick={handleMarkCompleted}>
                  {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Realizada
                </Button>
                <Button size="sm" className="gap-1.5 bg-green-600" disabled={!!selectedConsultation?.paid || updating} onClick={handleConfirmPayment}>
                  {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />} Pagamento
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Modal: Reagendar */}
      <Dialog open={rescheduleVisible} onOpenChange={setRescheduleVisible}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reagendar</DialogTitle></DialogHeader>
          <div className="space-y-1 py-2"><Label>Nova data/hora *</Label><Input type="datetime-local" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleVisible(false)}>Cancelar</Button>
            <Button onClick={handleRescheduleSubmit} disabled={rescheduleLoading} className="bg-primary">{rescheduleLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
