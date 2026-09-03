'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import type {
  PatientTimelineEvent,
  TimelineMedicalRecordData,
  TimelineExamRequestData,
  TimelinePrescriptionData,
  TimelineVaccineData,
} from '@/app/types/patient';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, BookOpen, FlaskConical, ClipboardList, FileText } from 'lucide-react';
import Link from 'next/link';
import { patientKeys, usePatientQuery, usePatientTimelineQuery } from '@/hooks/apiHooks/usePatients';
import { useHasPermission } from '@/hooks/useHasPermission';
import { ProfilePhotoUploader } from '@/components/shared/profile-photo';

const RECORD_TYPE_LABEL_KEYS: Record<string, string> = {
  atendimento: 'patientDetail.recordTypes.atendimento',
  retorno: 'patientDetail.recordTypes.retorno',
  emergencia: 'patientDetail.recordTypes.emergencia',
  cirurgia: 'patientDetail.recordTypes.cirurgia',
  internacao: 'patientDetail.recordTypes.internacao',
  no_show: 'patientDetail.recordTypes.noShow',
};

const typeConfig: Record<string, { labelKey: string; colorClass: string; dotClass: string; icon: React.ReactNode }> = {
  medical_record: {
    labelKey: 'patientDetail.eventTypes.medicalRecord',
    colorClass: 'border-blue-400',
    dotClass: 'bg-blue-100 text-primary',
    icon: <FileText className="w-4 h-4" />,
  },
  vaccine: {
    labelKey: 'patientDetail.eventTypes.vaccine',
    colorClass: 'border-green-400',
    dotClass: 'bg-green-100 text-green-600',
    icon: <FlaskConical className="w-4 h-4" />,
  },
  exam_request: {
    labelKey: 'patientDetail.eventTypes.examRequest',
    colorClass: 'border-purple-400',
    dotClass: 'bg-purple-100 text-purple-600',
    icon: <ClipboardList className="w-4 h-4" />,
  },
  prescription: {
    labelKey: 'patientDetail.eventTypes.prescription',
    colorClass: 'border-orange-400',
    dotClass: 'bg-orange-100 text-orange-600',
    icon: <BookOpen className="w-4 h-4" />,
  },
};

function getMedicalRecordData(event: PatientTimelineEvent): TimelineMedicalRecordData {
  return event.data as TimelineMedicalRecordData;
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
  const { t } = useTranslation('common');
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';
  const { data: patient, isLoading: loadingPatient } = usePatientQuery(id);
  const { data: events = [] } = usePatientTimelineQuery(id);
  // A recepção chega nesta tela (Pacientes é dela), mas não tem
  // `medical_records.read` — o atalho para os prontuários levava a uma tela de
  // 403. A linha do tempo em si vem de `/patients/:id/timeline`, que ela pode ler.
  const podeVerProntuario = useHasPermission('medical_records.read');
  const loading = loadingPatient;

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
        <Button variant="ghost" onClick={() => router.push('/patients')}>
          <ChevronLeft className="w-4 h-4 mr-1" /> {t('patientDetail.back')}
        </Button>
        <p className="text-muted-foreground mt-4">{t('patientDetail.notFound')}</p>
      </div>
    );
  }

  const sortedEvents = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const descriptionFields = [
    { label: t('patientDetail.fields.species'), value: patient.species },
    { label: t('patientDetail.fields.breed'), value: patient.breed },
    { label: t('patientDetail.fields.age'), value: t('patientDetail.ageValue', { age: patient.age }) },
    { label: t('patientDetail.fields.weight'), value: t('patientDetail.weightValue', { weight: patient.weight }) },
    { label: t('patientDetail.fields.sex'), value: patient.sex },
    { label: t('patientDetail.fields.guardian'), value: patient.tutor?.name ?? '—' },
  ];

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button asChild variant="ghost">
          <Link href="/patients">
            <ChevronLeft className="w-4 h-4 mr-1" /> {t('patientDetail.back')}
          </Link>
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-col items-start gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <ProfilePhotoUploader
              target={`/patients/${id}`}
              invalidate={[patientKeys.all]}
              label="foto"
              url={patient.photo_url}
              name={patient.name}
            />
            <CardTitle className="text-foreground">{patient.name}</CardTitle>
          </div>
          {podeVerProntuario && (
            <Button asChild size="sm" className="w-full bg-primary hover:bg-blue-700 sm:w-auto">
              <Link href={`/medical-records?patient=${id}`}>
                <FileText className="w-4 h-4 mr-1" /> {t('patientDetail.recordsButton')}
              </Link>
            </Button>
          )}
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
          <CardTitle>{t('patientDetail.timelineTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedEvents.length === 0 ? (
            <p className="text-muted-foreground">{t('patientDetail.noEvents')}</p>
          ) : (
            <div className="space-y-0">
              {sortedEvents.map((ev, idx) => {
                const meta = typeConfig[ev.type] ?? {
                  labelKey: '',
                  colorClass: 'border-border',
                  dotClass: 'bg-muted text-muted-foreground',
                  icon: null,
                };
                // Ficha usa o rótulo do tipo de atendimento (Atendimento,
                // Retorno...) em vez do genérico "Ficha", e não tem hora
                // (record_date é só data) — mostrar "00:00" seria ruído.
                const isRecordEvent = ev.type === 'medical_record';
                const fallbackLabel = meta.labelKey ? t(meta.labelKey) : ev.type;
                const recordTypeKey = isRecordEvent
                  ? RECORD_TYPE_LABEL_KEYS[getMedicalRecordData(ev).record_type ?? '']
                  : undefined;
                const label = recordTypeKey ? t(recordTypeKey) : fallbackLabel;
                const dateStr = isRecordEvent
                  ? new Date(ev.date).toLocaleDateString('pt-BR')
                  : new Date(ev.date).toLocaleString('pt-BR');
                const isFirst = idx === 0;
                const isLast = idx === sortedEvents.length - 1;
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
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium text-foreground">
                          {label} — <span className="text-muted-foreground font-normal">{dateStr}</span>
                        </div>
                        {/* Marca o topo (mais recente) e o fim (início do
                            histórico) — a lista lê de cima pra baixo, do mais
                            novo pro mais antigo, e sem essas âncoras isso não
                            fica óbvio à primeira vista. */}
                        {isFirst && (
                          <span
                            className="mt-0.5 shrink-0 bg-primary py-1 pl-2.5 pr-4 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap text-primary-foreground"
                            style={{
                              clipPath:
                                'polygon(0% 50%, 10px 0%, 100% 0%, calc(100% - 10px) 50%, 100% 100%, 10px 100%)',
                            }}
                          >
                            {t('patientDetail.mostRecent')}
                          </span>
                        )}
                        {isLast && !isFirst && (
                          <Badge variant="outline" className="mt-0.5 shrink-0 whitespace-nowrap text-muted-foreground">
                            {t('patientDetail.start')}
                          </Badge>
                        )}
                      </div>
                      {ev.data && Object.keys(ev.data).length > 0 && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {ev.type === 'medical_record' && (
                            <>
                              {(() => {
                                const recordData = getMedicalRecordData(ev);
                                return (
                                  <>
                                    {t('patientDetail.statusLabel')} <Badge variant="outline">{String(recordData.status ?? '—')}</Badge>
                                    {recordData.chief_complaint && (
                                      <div className="mt-1">{recordData.chief_complaint}</div>
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
                                    {t('patientDetail.vaccineLine', {
                                      name: vaccineData.vaccine_name,
                                      date: vaccineData.next_due_date,
                                    })}
                                  </>
                                );
                              })()}
                            </>
                          )}
                          {ev.type === 'exam_request' && (
                            <>
                              {(() => {
                                const examRequestData = getExamRequestData(ev);
                                return (
                                  <>{t('patientDetail.examRequestLine', { date: examRequestData.request_date ?? '—' })}</>
                                );
                              })()}
                            </>
                          )}
                          {ev.type === 'prescription' && (
                            <>
                              {(() => {
                                const prescriptionData = getPrescriptionData(ev);
                                return (
                                  <>
                                    {t('patientDetail.prescriptionLine', {
                                      type: prescriptionData.prescription_type,
                                      date: prescriptionData.prescription_date,
                                    })}
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
