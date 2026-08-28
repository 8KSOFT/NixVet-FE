'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { DashboardCreateFormDialog } from '@/components/dashboard-create-form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { toast } from 'sonner';
import { Loader2, Plus, Search, UserPlus, PawPrint, ChevronRight, ChevronsUpDown, Check, X } from 'lucide-react';
import { API_PAGE_SIZE } from '@/lib/pagination';
import { useIsMobile } from '@/hooks/use-mobile';
import { ListPagination } from '@/components/list-pagination';
import { ProfilePhoto } from '@/components/shared/profile-photo';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import type { MedicalRecord, MedicalRecordPatientRef } from '@/app/types/medical-record';
import { useCreateMedicalRecordMutation, useMedicalRecordsQuery } from '@/hooks/apiHooks/useMedicalRecords';
import { usePatientsListQuery, useCreatePatientMutation } from '@/hooks/apiHooks/usePatients';
import { useTutorsListQuery, useCreateTutorMutation } from '@/hooks/apiHooks/useTutors';
import { useVeterinariansQuery } from '@/hooks/apiHooks/useUsers';

interface PatientRecordGroup {
  patient: MedicalRecordPatientRef;
  records: MedicalRecord[];
}

const RECORD_TYPE_LABEL_KEYS: Record<string, string> = {
  atendimento: 'medicalRecords.recordTypes.atendimento',
  retorno: 'medicalRecords.recordTypes.retorno',
  emergencia: 'medicalRecords.recordTypes.emergencia',
  cirurgia: 'medicalRecords.recordTypes.cirurgia',
  internacao: 'medicalRecords.recordTypes.internacao',
};

// Classes completas (não montadas em runtime) — o Tailwind só gera o CSS de
// classes que aparecem literalmente no código-fonte. A mais recente (índice 0,
// a que fica na frente) sobe o bastante pra ficar bem legível; as de trás
// ficam bem juntinhas umas das outras, só espiando por cima — sem isso o
// topo da pilha ficava alto demais e encostava no elemento acima da grade.
const FICHA_STACK_HOVER = [
  'group-hover:-translate-y-7',
  'group-hover:-translate-y-8',
  'group-hover:-translate-y-9',
  'group-hover:-translate-y-10',
  'group-hover:-translate-y-11',
];
const FICHA_STACK_DELAY = ['delay-0', 'delay-75', 'delay-150', 'delay-200', 'delay-300'];
const JUICY_EASE = 'ease-[cubic-bezier(0.34,1.56,0.64,1)]';

const emptyForm = () => ({
  patient_id: '',
  veterinarian_id: '',
  record_type: 'atendimento',
  record_date: dayjs().format('YYYY-MM-DD'),
  chief_complaint: '',
});

const emptyTutor = () => ({
  name: '',
  cpf: '',
  phone: '',
  email: '',
  cep: '',
  street: '',
  number: '',
});
const emptyPatient = () => ({
  name: '',
  species: 'Canino',
  breed: '',
  sex: 'M',
  age: '0',
  weight: '0',
  tutor_id: '' as string | '_none',
});

export default function MedicalRecordsListPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const isMobile = useIsMobile(768);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterPatient] = useState('');
  const [filterTutor, setFilterTutor] = useState('');
  const [tutorFilterOpen, setTutorFilterOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [listPage, setListPage] = useState(1);

  const [form, setForm] = useState(emptyForm());

  const [tutorModal, setTutorModal] = useState(false);
  const [tutorForm, setTutorForm] = useState(emptyTutor());

  const [patientModal, setPatientModal] = useState(false);
  const [patientForm, setPatientForm] = useState(emptyPatient());

  const { data: recordsPage, isLoading: loading } = useMedicalRecordsQuery(
    listPage,
    filterPatient || undefined,
    filterTutor || undefined,
  );
  const records = recordsPage?.items ?? [];
  const listTotal = recordsPage?.total ?? 0;
  const listTotalPages = recordsPage?.totalPages ?? 1;

  const { data: patients = [] } = usePatientsListQuery();
  const { data: tutors = [] } = useTutorsListQuery();
  const { data: vets = [] } = useVeterinariansQuery();

  const createRecord = useCreateMedicalRecordMutation();
  const createTutor = useCreateTutorMutation();
  const createPatient = useCreatePatientMutation();
  const tutorSaving = createTutor.isPending;
  const patientSaving = createPatient.isPending;

  useEffect(() => {
    setListPage(1);
  }, [filterPatient, filterTutor]);

  const selectedTutorName = tutors.find((tu) => tu.id === filterTutor)?.name;

  const handleCreate = async () => {
    if (!form.patient_id) {
      toast.error(t('medicalRecords.toasts.selectOrCreatePatient'));
      return;
    }
    try {
      const record = await createRecord.mutateAsync(form);
      setModalVisible(false);
      router.push(`/medical-records/prontuario/${record.patient_id}`);
    } catch {
      toast.error(t('medicalRecords.toasts.createRecordError'));
    }
  };

  const handleCreateTutor = async () => {
    if (!tutorForm.name || !tutorForm.cpf || !tutorForm.phone || !tutorForm.email || !tutorForm.cep) {
      toast.error(t('medicalRecords.toasts.tutorRequiredFields'));
      return;
    }
    try {
      const tutor = await createTutor.mutateAsync(tutorForm);
      setTutorModal(false);
      setTutorForm(emptyTutor());
      setPatientForm((p) => ({ ...p, tutor_id: tutor.id }));
      if (!patientModal) setPatientModal(true);
    } catch {
      toast.error(t('medicalRecords.toasts.createTutorError'));
    }
  };

  const handleCreatePatient = async () => {
    if (!patientForm.name || !patientForm.species || !patientForm.breed) {
      toast.error(t('medicalRecords.toasts.patientRequiredFields'));
      return;
    }
    try {
      const hasTutor = !!patientForm.tutor_id && patientForm.tutor_id !== '_none';
      const patient = await createPatient.mutateAsync({
        name: patientForm.name,
        species: patientForm.species,
        breed: patientForm.breed,
        sex: patientForm.sex,
        age: Number(patientForm.age) || 0,
        weight: Number(patientForm.weight) || 0,
        tutor_id: hasTutor ? patientForm.tutor_id : null,
        no_tutor_reason: hasTutor ? null : 'EMERGENCIA',
      });
      setForm((p) => ({ ...p, patient_id: patient.id }));
      setPatientModal(false);
      setPatientForm(emptyPatient());
    } catch {
      toast.error(t('medicalRecords.toasts.createPatientError'));
    }
  };

  const filtered = records.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.patient?.name || '').toLowerCase().includes(q) ||
      (r.veterinarian?.name || '').toLowerCase().includes(q) ||
      (r.chief_complaint || '').toLowerCase().includes(q) ||
      (r.diagnosis || '').toLowerCase().includes(q)
    );
  });

  // Agrupa as fichas por paciente — cada card representa um animal, com suas fichas ordenadas da mais recente para a mais antiga.
  const patientGroups = useMemo<PatientRecordGroup[]>(() => {
    const byPatient = new Map<string, PatientRecordGroup>();
    for (const record of filtered) {
      const existing = byPatient.get(record.patient_id);
      if (existing) {
        existing.records.push(record);
      } else {
        byPatient.set(record.patient_id, {
          patient: record.patient ?? { id: record.patient_id, name: '—' },
          records: [record],
        });
      }
    }
    const groups = Array.from(byPatient.values());
    for (const group of groups) {
      group.records.sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf());
    }
    groups.sort((a, b) => dayjs(b.records[0]?.createdAt).valueOf() - dayjs(a.records[0]?.createdAt).valueOf());
    return groups;
  }, [filtered]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          {t('medicalRecords.title')}
        </h1>
        <Button
          onClick={() => {
            setForm(emptyForm());
            setModalVisible(true);
          }}
          className="w-full bg-primary hover:bg-primary/70 sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-1" /> {t('medicalRecords.newRecordButton')}
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-10">
        {/* Busca + filtro por responsável formam um único bloco: a busca
            arredonda só à esquerda, o filtro só à direita (sem borda dupla
            no meio — a borda esquerda do botão já faz de divisória), pra
            ler como um controle só, não dois soltos lado a lado. */}
        <div className="flex flex-1 min-w-70">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 sm:h-7 sm:w-7" />
            {/* Altura/fonte menores só no mobile (h-11/text-sm) — o h-15
                original sobrava muito nas telas pequenas e a fonte grande
                deixava pouco texto visível no campo. Desktop sem mudança. */}
            <Input
              placeholder={
                isMobile ? t('medicalRecords.searchPlaceholderShort') : t('medicalRecords.searchPlaceholder')
              }
              className="h-11! rounded-l-full rounded-r-none border-r-0 pl-10 text-sm placeholder:text-black/80 sm:h-15! sm:pl-12 sm:text-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filtro por responsável — combobox com busca, não Select simples: a
              clínica pode ter centenas de tutores, e o filtro existe justamente
              para desambiguar pets homônimos, então precisa achar o tutor certo
              rápido. Passa tutor_id pro backend (useMedicalRecordsQuery), então
              a paginação/contagem já vem certa, diferente do search de texto ao
              lado (que só filtra a página atual). */}
          <Popover open={tutorFilterOpen} onOpenChange={setTutorFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={tutorFilterOpen}
                className="h-11 w-32 shrink-0 justify-start rounded-l-none rounded-r-full pl-2 pr-1.5 font-normal sm:h-15 sm:w-64 sm:justify-between sm:px-5"
              >
                <span className="min-w-0 max-w-22 truncate sm:max-w-none">
                  {selectedTutorName || (
                    <>
                      <span className="sm:hidden">{t('medicalRecords.tutorFilterPlaceholderShort')}</span>
                      <span className="hidden sm:inline">{t('medicalRecords.tutorFilterPlaceholder')}</span>
                    </>
                  )}
                </span>
                <span className="ml-0.5 flex shrink-0 items-center gap-1 sm:ml-2">
                  {filterTutor && (
                    <X
                      className="h-4 w-4 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilterTutor('');
                      }}
                    />
                  )}
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <Command>
                <CommandInput placeholder={t('medicalRecords.tutorFilterSearchPlaceholder')} />
                <CommandList>
                  <CommandEmpty>{t('medicalRecords.tutorFilterEmpty')}</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value={t('medicalRecords.tutorFilterAll')}
                      onSelect={() => {
                        setFilterTutor('');
                        setTutorFilterOpen(false);
                      }}
                    >
                      <Check className={cn('h-4 w-4', filterTutor ? 'opacity-0' : 'opacity-100')} />
                      {t('medicalRecords.tutorFilterAll')}
                    </CommandItem>
                    {tutors.map((tutor) => (
                      <CommandItem
                        key={tutor.id}
                        value={tutor.name}
                        onSelect={() => {
                          setFilterTutor(tutor.id);
                          setTutorFilterOpen(false);
                        }}
                      >
                        <Check className={cn('h-4 w-4', filterTutor === tutor.id ? 'opacity-100' : 'opacity-0')} />
                        {tutor.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* <div className="w-55">
          <Select
            value={filterPatient || "_all"}
            onValueChange={(v) => setFilterPatient(v === "_all" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por paciente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos os pacientes</SelectItem>
              {patients.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div> */}
      </div>

      <div className="bg-transparent border-none shadow-none">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/60" />
          </div>
        ) : patientGroups.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">{t('medicalRecords.emptyState')}</div>
        ) : (
          <div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-8 pt-3 sm:justify-start">
              {patientGroups.map((group) => {
                const lastUpdated = group.records[0]?.createdAt;
                return (
                  <Link
                    key={group.patient.id}
                    href={`/medical-records/prontuario/${group.patient.id}`}
                    className="group relative block w-72 perspective-[900px] focus-visible:outline-none"
                  >
                    {/* Aba da pasta — o nome do pet mora nela, como numa pasta
                        de arquivo de verdade. Gradiente simulando luz vindo de
                        cima: mais clara no topo, mais escura perto da borda da
                        pasta (onde ela "entra" por baixo, fazendo sombra). */}
                    <div className="absolute -top-3.5 left-2 flex h-4 w-3/8 items-center rounded-t-2xl border border-b-0 border-gray-400 bg-linear-to-b from-gray-100 from-45% to-gray-300 px-3 transition-colors duration-200 group-hover:border-primary/40 group-hover:from-primary/15 group-hover:to-primary/30">
                      <p className="truncate text-xs font-bold text-foreground transition-colors duration-200 group-hover:text-primary">
                        {group.patient.name}
                      </p>
                    </div>

                    {/* Fichas dentro da pasta — empilhadas, cada uma subindo um
                        pouquinho mais que a de baixo no hover (dá pra "contar"
                        quantas tem, até 5, sem virar bagunça). Ficam atrás do
                        corpo da pasta em repouso e só sobem um pouco no hover —
                        levantada discreta, não um leque agressivo. */}
                    {[...group.records.slice(0, 5).entries()].reverse().map(([i, record]) => (
                      <div
                        key={record.id}
                        className={cn(
                          'pointer-events-none absolute inset-x-3 top-1 h-9 overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm transition-transform duration-300',
                          JUICY_EASE,
                          FICHA_STACK_HOVER[i],
                          FICHA_STACK_DELAY[i],
                        )}
                      >
                        {/* Headerzinho da ficha — sempre o primeiro a aparecer,
                            mesmo quando é a única e sobe pouco. */}
                        <div className="flex h-4 items-center bg-primary/10 px-2">
                          <p className="truncate text-[9px] font-bold uppercase tracking-wide text-primary/80">
                            {RECORD_TYPE_LABEL_KEYS[record.record_type]
                              ? t(RECORD_TYPE_LABEL_KEYS[record.record_type])
                              : record.record_type}
                          </p>
                        </div>
                        <div className="px-2 py-1">
                          <p className="truncate text-[9px] text-muted-foreground">
                            {dayjs(record.record_date ?? record.createdAt).format('DD/MM/YYYY')}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Corpo da pasta — quase quadrado, um pouco mais baixo que
                        largo; a capa tomba pra frente no hover (gira pela
                        dobra de baixo), como se abrisse. */}
                    <div
                      className={cn(
                        'relative flex h-64 origin-bottom flex-col justify-between rounded-xl rounded-tl-none border border-gray-300 bg-white p-3.5 shadow-sm transition-all duration-300',
                        JUICY_EASE,
                        'group-hover:border-primary/40 group-hover:shadow-xl group-hover:translate-y-0.5 group-hover:-rotate-x-14',
                        'group-focus-visible:ring-2 group-focus-visible:ring-primary/50',
                      )}
                    >
                      <div>
                        {/* Tutor (esquerda, no topo) e foto (direita) na mesma
                            linha — items-start pra o tutor não ser empurrado
                            pra baixo pela altura da foto. */}
                        <div className="flex items-start justify-between gap-2">
                          {/* Tutor — o nome do pet já está na aba, então aqui só
                              precisa do responsável mesmo (evita repetir). Visual
                              de adesivo de etiqueta, com a linha de escrever o
                              nome. */}
                          <div className="min-w-0 rounded-[3px] border border-gray-200 bg-white px-2 pt-1.5 pb-1 shadow-sm">
                            <p
                              className="truncate border-b border-dashed border-gray-300 pb-0.5 text-[10px] font-medium text-muted-foreground"
                              title={group.patient.tutor?.name ?? undefined}
                            >
                              {group.patient.tutor?.name ?? t('medicalRecords.noGuardian')}
                            </p>
                          </div>

                          {/* Foto do pet feito uma polaroide solta, presa por um
                              clipe que agarra também a borda de cima da pasta —
                              no canto direito, pra não tapar a aba da pasta nem
                              o rótulo das fichas empilhadas (que saem à esquerda). */}
                          <div className="relative -mt-4 mb-1 inline-block shrink-0">
                            {/* Clipe — espiral interna, por trás da foto (é por
                                isso que fica antes dela no DOM: o wire real de
                                um clipe passa por trás do papel nessa volta). */}
                            <svg
                              viewBox="0 0 24 32"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              className="absolute -top-3 right-1 h-7 w-5 rotate-3 text-gray-400 transition-transform duration-300 group-hover:rotate-6"
                            >
                              <rect x="7" y="7" width="8" height="16" rx="4" />
                            </svg>

                            <div className="-rotate-7 rounded-sm bg-white pt-1 pr-1.5 pb-3 pl-1.5 shadow-lg ring-1 ring-black/20 transition-transform duration-300 group-hover:-rotate-4">
                              {group.patient.photo_url ? (
                                <ProfilePhoto
                                  url={group.patient.photo_url}
                                  name={group.patient.name}
                                  className="size-16 shrink-0 rounded-xs shadow-none ring-0 saturate-[.85] contrast-105 sepia-[0.08]"
                                />
                              ) : (
                                <div
                                  className="flex size-16 shrink-0 items-center justify-center rounded-xs"
                                  style={{
                                    backgroundImage:
                                      'repeating-linear-gradient(45deg,#eef2f0,#eef2f0 6px,#e2e8e5 6px,#e2e8e5 12px)',
                                  }}
                                >
                                  <PawPrint className="size-6 text-wa-ink-3" />
                                </div>
                              )}
                            </div>

                            {/* Clipe — espiral externa, por cima da foto e da
                                borda da pasta (o wire volta pra frente aqui).
                                Troque as duas partes por uma imagem de clipe
                                própria (ex.: um PNG) se preferir. */}
                            <svg
                              viewBox="0 0 24 32"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              className="absolute -top-3 right-1 h-7 w-5 rotate-3 text-gray-400 drop-shadow transition-transform duration-300 group-hover:rotate-6"
                            >
                              <rect x="3" y="3" width="14" height="27" rx="7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      {/* Rodapé em forma de etiqueta da pasta — separado por uma linha pontilhada, como uma perfuração */}
                      <div className="flex items-end justify-between border-t border-dashed border-gray-200 pt-2">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {t('medicalRecords.fichaCount', { count: group.records.length })}
                          </p>
                          <p className="text-[11px] text-muted-foreground/70">
                            {lastUpdated ? dayjs(lastUpdated).format('DD/MM/YYYY') : '—'}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            <div>
              {/* A tela mostra PASTAS (uma por animal) mas a API pagina FICHAS.
                  Contar fichas aqui dizia "1–9 de 9" com 2 pastas na tela.
                  Enquanto tudo cabe numa página da API, o agrupamento é
                  completo e a contagem certa é a de pastas. */}
              <ListPagination
                page={listPage}
                totalPages={listTotalPages}
                total={listTotalPages > 1 ? listTotal : patientGroups.length}
                pageSize={listTotalPages > 1 ? API_PAGE_SIZE : patientGroups.length || 1}
                onPageChange={setListPage}
                disabled={loading}
              />
            </div>
          </div>
        )}
      </div>

      {/* Novo Prontuário */}
      <DashboardCreateFormDialog
        open={modalVisible}
        onOpenChange={setModalVisible}
        title={t('medicalRecords.dialog.newRecordTitle')}
        preventOutsideClose
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setModalVisible(false)}>
              {t('medicalRecords.dialog.cancel')}
            </Button>
            <Button onClick={handleCreate} className="bg-primary">
              {t('medicalRecords.dialog.createAndOpen')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 md:space-y-6">
          <div className="space-y-2">
            <Label>{t('medicalRecords.dialog.patientLabel')}</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex-1 min-w-0">
                <Select value={form.patient_id} onValueChange={(v) => setForm((p) => ({ ...p, patient_id: v }))}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        patients.length
                          ? t('medicalRecords.dialog.selectPlaceholder')
                          : t('medicalRecords.dialog.noPatientsPlaceholder')
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.species ? `(${p.species})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPatientForm(emptyPatient());
                  setPatientModal(true);
                }}
                title={t('medicalRecords.dialog.newPatientTitle')}
                className="shrink-0"
              >
                <PawPrint className="h-4 w-4 mr-1" /> {t('medicalRecords.dialog.newPatientButton')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('medicalRecords.dialog.noTutorHintPart1')}{' '}
              <strong>{t('medicalRecords.dialog.newPatientButton')}</strong>{' '}
              {t('medicalRecords.dialog.noTutorHintPart2')}{' '}
              <strong>{t('medicalRecords.dialog.noTutorHintNewTutorLabel')}</strong>{' '}
              {t('medicalRecords.dialog.noTutorHintPart3')}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t('medicalRecords.dialog.veterinarianLabel')}</Label>
            <Select
              value={form.veterinarian_id || '_none'}
              onValueChange={(v) =>
                setForm((p) => ({
                  ...p,
                  veterinarian_id: v === '_none' ? '' : v,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('medicalRecords.dialog.selectPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">{t('medicalRecords.dialog.noneOption')}</SelectItem>
                {vets.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>{t('medicalRecords.dialog.typeLabel')}</Label>
              <Select value={form.record_type} onValueChange={(v) => setForm((p) => ({ ...p, record_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="atendimento">{t('medicalRecords.recordTypes.atendimento')}</SelectItem>
                  <SelectItem value="retorno">{t('medicalRecords.recordTypes.retorno')}</SelectItem>
                  <SelectItem value="emergencia">{t('medicalRecords.recordTypes.emergencia')}</SelectItem>
                  <SelectItem value="cirurgia">{t('medicalRecords.recordTypes.cirurgia')}</SelectItem>
                  <SelectItem value="internacao">{t('medicalRecords.recordTypes.internacao')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('medicalRecords.dialog.dateLabel')}</Label>
              <Input
                type="date"
                value={form.record_date}
                onChange={(e) => setForm((p) => ({ ...p, record_date: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('medicalRecords.dialog.chiefComplaintLabel')}</Label>
            <Textarea
              rows={2}
              value={form.chief_complaint}
              onChange={(e) => setForm((p) => ({ ...p, chief_complaint: e.target.value }))}
              placeholder={t('medicalRecords.dialog.chiefComplaintPlaceholder')}
            />
          </div>
        </div>
      </DashboardCreateFormDialog>

      {/* Novo Animal inline */}
      <DashboardCreateFormDialog
        open={patientModal}
        onOpenChange={setPatientModal}
        title={t('medicalRecords.dialog.newPatientTitle')}
        preventOutsideClose
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setPatientModal(false)}>
              {t('medicalRecords.dialog.cancel')}
            </Button>
            <Button onClick={handleCreatePatient} disabled={patientSaving} className="bg-primary">
              {patientSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} {t('medicalRecords.dialog.savePatient')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 md:space-y-6">
          <div className="space-y-2">
            <Label>{t('medicalRecords.dialog.tutorLabel')}</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex-1 min-w-0">
                <Select
                  value={patientForm.tutor_id || '_none'}
                  onValueChange={(v) =>
                    setPatientForm((p) => ({
                      ...p,
                      tutor_id: v === '_none' ? '' : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        tutors.length
                          ? t('medicalRecords.dialog.selectPlaceholder')
                          : t('medicalRecords.dialog.noTutorsPlaceholder')
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">{t('medicalRecords.dialog.noTutorOption')}</SelectItem>
                    {tutors.map((tutor) => (
                      <SelectItem key={tutor.id} value={tutor.id}>
                        {tutor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTutorForm(emptyTutor());
                  setTutorModal(true);
                }}
                title={t('medicalRecords.dialog.newTutorTitle')}
                className="shrink-0"
              >
                <UserPlus className="h-4 w-4 mr-1" /> {t('medicalRecords.dialog.newTutorButton')}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="space-y-1 md:col-span-7">
              <Label>{t('medicalRecords.dialog.nameLabel')}</Label>
              <Input
                value={patientForm.name}
                onChange={(e) => setPatientForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1 md:col-span-5">
              <Label>{t('medicalRecords.dialog.sexLabel')}</Label>
              <Select value={patientForm.sex} onValueChange={(v) => setPatientForm((p) => ({ ...p, sex: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">{t('medicalRecords.dialog.male')}</SelectItem>
                  <SelectItem value="F">{t('medicalRecords.dialog.female')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="space-y-1 md:col-span-4">
              <Label>{t('medicalRecords.dialog.speciesLabel')}</Label>
              <Input
                value={patientForm.species}
                onChange={(e) => setPatientForm((p) => ({ ...p, species: e.target.value }))}
                placeholder={t('medicalRecords.dialog.speciesPlaceholder')}
              />
            </div>
            <div className="space-y-1 md:col-span-5">
              <Label>{t('medicalRecords.dialog.breedLabel')}</Label>
              <Input
                value={patientForm.breed}
                onChange={(e) => setPatientForm((p) => ({ ...p, breed: e.target.value }))}
              />
            </div>
            <div className="space-y-1 md:col-span-1">
              <Label>{t('medicalRecords.dialog.ageLabel')}</Label>
              <Input
                type="number"
                step="0.1"
                value={patientForm.age}
                onChange={(e) => setPatientForm((p) => ({ ...p, age: e.target.value }))}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>{t('medicalRecords.dialog.weightLabel')}</Label>
              <Input
                type="number"
                step="0.1"
                value={patientForm.weight}
                onChange={(e) => setPatientForm((p) => ({ ...p, weight: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </DashboardCreateFormDialog>

      {/* Novo Tutor inline */}
      <DashboardCreateFormDialog
        open={tutorModal}
        onOpenChange={setTutorModal}
        title={t('medicalRecords.dialog.newTutorTitle')}
        preventOutsideClose
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setTutorModal(false)}>
              {t('medicalRecords.dialog.cancel')}
            </Button>
            <Button onClick={handleCreateTutor} disabled={tutorSaving} className="bg-primary">
              {tutorSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} {t('medicalRecords.dialog.saveTutor')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="space-y-1 md:col-span-5">
              <Label>{t('medicalRecords.dialog.nameLabel')}</Label>
              <Input value={tutorForm.name} onChange={(e) => setTutorForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label>{t('medicalRecords.dialog.cpfLabel')}</Label>
              <Input value={tutorForm.cpf} onChange={(e) => setTutorForm((p) => ({ ...p, cpf: e.target.value }))} />
            </div>
            <div className="space-y-1 md:col-span-4">
              <Label>{t('medicalRecords.dialog.phoneLabel')}</Label>
              <Input value={tutorForm.phone} onChange={(e) => setTutorForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="space-y-1 md:col-span-8">
              <Label>{t('medicalRecords.dialog.emailLabel')}</Label>
              <Input
                type="email"
                value={tutorForm.email}
                onChange={(e) => setTutorForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="space-y-1 md:col-span-3">
              <Label>{t('medicalRecords.dialog.cepLabel')}</Label>
              <Input value={tutorForm.cep} onChange={(e) => setTutorForm((p) => ({ ...p, cep: e.target.value }))} />
            </div>
            <div className="space-y-1 md:col-span-7">
              <Label>{t('medicalRecords.dialog.streetLabel')}</Label>
              <Input
                value={tutorForm.street}
                onChange={(e) => setTutorForm((p) => ({ ...p, street: e.target.value }))}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>{t('medicalRecords.dialog.numberLabel')}</Label>
              <Input
                value={tutorForm.number}
                onChange={(e) => setTutorForm((p) => ({ ...p, number: e.target.value }))}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('medicalRecords.dialog.quickRegisterHintPart1')}{' '}
            <strong>{t('medicalRecords.dialog.quickRegisterHintTutorsLabel')}</strong>.
          </p>
        </div>
      </DashboardCreateFormDialog>
    </div>
  );
}
