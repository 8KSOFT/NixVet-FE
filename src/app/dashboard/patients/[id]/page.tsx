'use client';

import React, { useEffect, useState } from 'react';
import type {
  PatientDetail,
  PatientTimelineEvent,
  TimelineConsultationData,
  TimelineExamRequestData,
  TimelinePrescriptionData,
  TimelineVaccineData,
} from '@/app/types/patient';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, BookOpen, FlaskConical, ClipboardList, Clock, FileText } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/axios';

const typeConfig: Record<string, { label: string; colorClass: string; dotClass: string; icon: React.ReactNode }> = {
  consultation: {
    label: 'Consulta',
    colorClass: 'border-blue-400',
    dotClass: 'bg-blue-100 text-primary',
    icon: <Clock className="w-4 h-4" />,
  },
  vaccine: {
    label: 'Vacina',
    colorClass: 'border-green-400',
    dotClass: 'bg-green-100 text-green-600',
    icon: <FlaskConical className="w-4 h-4" />,
  },
  exam_request: {
    label: 'Exame',
    colorClass: 'border-purple-400',
    dotClass: 'bg-purple-100 text-purple-600',
    icon: <ClipboardList className="w-4 h-4" />,
  },
  prescription: {
    label: 'Prescrição',
    colorClass: 'border-orange-400',
    dotClass: 'bg-orange-100 text-orange-600',
    icon: <BookOpen className="w-4 h-4" />,
  },
};

function getConsultationData(event: PatientTimelineEvent): TimelineConsultationData {
  return event.data as TimelineConsultationData;
}

function getVaccineData(event: PatientTimelineEvent): TimelineVaccineData {
  return event.data as TimelineVaccineData;
}

function getExamRequestData(event: PatientTimelineEvent): TimelineExamRequestData {
  return event.data as TimelineExamRequestData;
}

function getPrescriptionData(event: PatientTimelineEvent): TimelinePrescriptionData {
  return event.data as TimelinePrescriptionData;
}

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [events, setEvents] = useState<PatientTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const [patientRes, timelineRes] = await Promise.all([
          api.get<PatientDetail>(`/patients/${id}`),
          api.get<PatientTimelineEvent[]>(`/patients/${id}/timeline`),
        ]);
        setPatient(patientRes.data);
        setEvents(Array.isArray(timelineRes.data) ? timelineRes.data : []);
      } catch {
        setPatient(null);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="animate-spin w-8 h-8 text-muted-foreground/60" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div>
        <Button variant="ghost" onClick={() => router.push('/dashboard/patients')}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <p className="text-muted-foreground mt-4">Paciente não encontrado.</p>
      </div>
    );
  }

  const sortedEvents = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const descriptionFields = [
    { label: 'Espécie', value: patient.species },
    { label: 'Raça', value: patient.breed },
    { label: 'Idade', value: `${patient.age} ano(s)` },
    { label: 'Peso', value: `${patient.weight} kg` },
    { label: 'Sexo', value: patient.sex },
    { label: 'Responsável', value: patient.tutor?.name ?? '—' },
  ];

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button asChild variant="ghost">
          <Link href="/dashboard/patients">
            <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
          </Link>
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-foreground">{patient.name}</CardTitle>
          <Button asChild size="sm" className="bg-primary hover:bg-blue-700">
            <Link href={`/dashboard/medical-records?patient=${id}`}>
              <FileText className="w-4 h-4 mr-1" /> Prontuários
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {descriptionFields.map((f) => (
              <div key={f.label} className="flex gap-2 text-sm">
                <span className="font-medium text-muted-foreground min-w-[80px]">{f.label}:</span>
                <span className="text-foreground">{f.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Linha do tempo</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedEvents.length === 0 ? (
            <p className="text-muted-foreground">Nenhum evento registrado.</p>
          ) : (
            <div className="space-y-0">
              {sortedEvents.map((ev, idx) => {
                const meta = typeConfig[ev.type] ?? {
                  label: ev.type,
                  colorClass: 'border-border',
                  dotClass: 'bg-muted text-muted-foreground',
                  icon: null,
                };
                const dateStr = new Date(ev.date).toLocaleString('pt-BR');
                return (
                  <div key={ev.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${meta.dotClass}`}
                      >
                        {meta.icon}
                      </div>
                      {idx < sortedEvents.length - 1 && <div className="w-px flex-1 bg-gray-200 my-1" />}
                    </div>
                    <div className="pb-4 flex-1 pt-1">
                      <div className="font-medium text-foreground">
                        {meta.label} — <span className="text-muted-foreground font-normal">{dateStr}</span>
                      </div>
                      {ev.data && Object.keys(ev.data).length > 0 && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {ev.type === 'consultation' && (
                            <>
                              {(() => {
                                const consultationData = getConsultationData(ev);
                                return (
                                  <>
                                    Status: <Badge variant="outline">{String(consultationData.status ?? '—')}</Badge>
                                    {consultationData.observations && (
                                      <div className="mt-1">{consultationData.observations}</div>
                                    )}
                                  </>
                                );
                              })()}
                            </>
                          )}
                          {ev.type === 'vaccine' && (
                            <>
                              {(() => {
                                const vaccineData = getVaccineData(ev);
                                return (
                                  <>
                                    {vaccineData.vaccine_name} — Próxima: {vaccineData.next_due_date}
                                  </>
                                );
                              })()}
                            </>
                          )}
                          {ev.type === 'exam_request' && (
                            <>
                              {(() => {
                                const examRequestData = getExamRequestData(ev);
                                return <>Solicitação em {examRequestData.request_date ?? '—'}</>;
                              })()}
                            </>
                          )}
                          {ev.type === 'prescription' && (
                            <>
                              {(() => {
                                const prescriptionData = getPrescriptionData(ev);
                                return (
                                  <>
                                    Tipo: {prescriptionData.prescription_type} — {prescriptionData.prescription_date}
                                  </>
                                );
                              })()}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
