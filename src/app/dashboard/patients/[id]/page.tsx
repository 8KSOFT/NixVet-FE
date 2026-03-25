'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, BookOpen, FlaskConical, ClipboardList, Clock } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/axios';

interface TimelineEvent {
  type: string;
  date: string;
  id: string;
  data: Record<string, unknown>;
}

interface Patient {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  weight: number;
  sex: string;
  tutor?: { name: string } | null;
}

const typeConfig: Record<
  string,
  { label: string; colorClass: string; dotClass: string; icon: React.ReactNode }
> = {
  consultation: {
    label: 'Consulta',
    colorClass: 'border-blue-400',
    dotClass: 'bg-blue-100 text-blue-600',
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

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [patient, setPatient] = useState<Patient | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const [patientRes, timelineRes] = await Promise.all([
          api.get<Patient>(`/patients/${id}`),
          api.get<TimelineEvent[]>(`/patients/${id}/timeline`),
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
        <Loader2 className="animate-spin w-8 h-8 text-gray-400" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div>
        <Button variant="ghost" onClick={() => router.push('/dashboard/patients')}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <p className="text-slate-600 mt-4">Paciente não encontrado.</p>
      </div>
    );
  }

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const descriptionFields = [
    { label: 'Espécie', value: patient.species },
    { label: 'Raça', value: patient.breed },
    { label: 'Idade', value: `${patient.age} ano(s)` },
    { label: 'Peso', value: `${patient.weight} kg` },
    { label: 'Sexo', value: patient.sex },
    { label: 'Tutor', value: patient.tutor?.name ?? '—' },
  ];

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/patients">
          <Button variant="ghost">
            <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-slate-800">{patient.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {descriptionFields.map((f) => (
              <div key={f.label} className="flex gap-2 text-sm">
                <span className="font-medium text-gray-500 min-w-[80px]">{f.label}:</span>
                <span className="text-slate-800">{f.value}</span>
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
            <p className="text-slate-500">Nenhum evento registrado.</p>
          ) : (
            <div className="space-y-0">
              {sortedEvents.map((ev, idx) => {
                const meta = typeConfig[ev.type] ?? {
                  label: ev.type,
                  colorClass: 'border-gray-300',
                  dotClass: 'bg-gray-100 text-gray-600',
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
                      {idx < sortedEvents.length - 1 && (
                        <div className="w-px flex-1 bg-gray-200 my-1" />
                      )}
                    </div>
                    <div className="pb-4 flex-1 pt-1">
                      <div className="font-medium text-slate-800">
                        {meta.label} —{' '}
                        <span className="text-slate-500 font-normal">{dateStr}</span>
                      </div>
                      {ev.data && Object.keys(ev.data).length > 0 && (
                        <div className="text-sm text-slate-600 mt-1">
                          {ev.type === 'consultation' && (
                            <>
                              Status:{' '}
                              <Badge variant="outline">
                                {String((ev.data as any).status)}
                              </Badge>
                              {(ev.data as any).observations && (
                                <div className="mt-1">{(ev.data as any).observations}</div>
                              )}
                            </>
                          )}
                          {ev.type === 'vaccine' && (
                            <>
                              {(ev.data as any).vaccine_name} — Próxima:{' '}
                              {(ev.data as any).next_due_date}
                            </>
                          )}
                          {ev.type === 'exam_request' && (
                            <>Solicitação em {(ev.data as any).request_date ?? '—'}</>
                          )}
                          {ev.type === 'prescription' && (
                            <>
                              Tipo: {(ev.data as any).prescription_type} —{' '}
                              {(ev.data as any).prescription_date}
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
