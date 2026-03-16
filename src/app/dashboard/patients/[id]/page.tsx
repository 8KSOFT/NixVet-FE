'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Timeline, Spin, Button, Descriptions, Tag } from 'antd';
import { ArrowLeftOutlined, MedicineBoxOutlined, ExperimentOutlined, FileTextOutlined, CalendarOutlined } from '@ant-design/icons';
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
        <Spin size="large" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div>
        <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => router.push('/dashboard/patients')}>
          Voltar
        </Button>
        <p className="text-slate-600 mt-4">Paciente não encontrado.</p>
      </div>
    );
  }

  const typeLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    consultation: { label: 'Consulta', color: 'blue', icon: <CalendarOutlined /> },
    vaccine: { label: 'Vacina', color: 'green', icon: <ExperimentOutlined /> },
    exam_request: { label: 'Exame', color: 'purple', icon: <FileTextOutlined /> },
    prescription: { label: 'Prescrição', color: 'orange', icon: <MedicineBoxOutlined /> },
  };

  const sortedEvents = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/patients">
          <Button type="text" icon={<ArrowLeftOutlined />}>
            Voltar
          </Button>
        </Link>
      </div>

      <Card title={<span className="font-semibold text-slate-800">{patient.name}</span>} className="mb-6">
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Espécie">{patient.species}</Descriptions.Item>
          <Descriptions.Item label="Raça">{patient.breed}</Descriptions.Item>
          <Descriptions.Item label="Idade">{patient.age} ano(s)</Descriptions.Item>
          <Descriptions.Item label="Peso">{patient.weight} kg</Descriptions.Item>
          <Descriptions.Item label="Sexo">{patient.sex}</Descriptions.Item>
          <Descriptions.Item label="Tutor">{patient.tutor?.name ?? '—'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Linha do tempo">
        {sortedEvents.length === 0 ? (
          <p className="text-slate-500">Nenhum evento registrado.</p>
        ) : (
          <Timeline
            items={sortedEvents.map((ev) => {
              const meta = typeLabels[ev.type] ?? { label: ev.type, color: 'default', icon: null };
              const dateStr = new Date(ev.date).toLocaleString('pt-BR');
              return {
                color: meta.color as any,
                dot: meta.icon,
                children: (
                  <div>
                    <div className="font-medium">
                      {meta.label} — {dateStr}
                    </div>
                    {ev.data && Object.keys(ev.data).length > 0 && (
                      <div className="text-sm text-slate-600 mt-1">
                        {ev.type === 'consultation' && (
                          <>
                            Status: <Tag>{String((ev.data as any).status)}</Tag>
                            {(ev.data as any).observations && (
                              <div className="mt-1">{(ev.data as any).observations}</div>
                            )}
                          </>
                        )}
                        {ev.type === 'vaccine' && (
                          <>
                            {(ev.data as any).vaccine_name} — Próxima: {(ev.data as any).next_due_date}
                          </>
                        )}
                        {ev.type === 'exam_request' && (
                          <>Solicitação em {(ev.data as any).request_date ?? '—'}</>
                        )}
                        {ev.type === 'prescription' && (
                          <>Tipo: {(ev.data as any).prescription_type} — {(ev.data as any).prescription_date}</>
                        )}
                      </div>
                    )}
                  </div>
                ),
              };
            })}
          />
        )}
      </Card>
    </div>
  );
}
