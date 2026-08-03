'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardCreateFormDialog } from '@/components/dashboard-create-form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Plus, Search, UserPlus, PawPrint, FolderOpen, ChevronRight, Paperclip } from 'lucide-react';
import { API_PAGE_SIZE } from '@/lib/pagination';
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

const RECORD_TYPE_LABELS: Record<string, string> = {
  atendimento: 'Atendimento',
  retorno: 'Retorno',
  emergencia: 'Emergência',
  cirurgia: 'Cirurgia',
  internacao: 'Internação',
};

// Classes completas (não montadas em runtime) — o Tailwind só gera o CSS de
// classes que aparecem literalmente no código-fonte. Cada ficha sobe um
// pouquinho mais que a de baixo — dá pra "contar" quantas tem, sem exagero.
const FICHA_STACK_HOVER = [
  'group-hover:-translate-y-5',
  'group-hover:-translate-y-7',
  'group-hover:-translate-y-9',
  'group-hover:-translate-y-11',
  'group-hover:-translate-y-14',
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
  const [modalVisible, setModalVisible] = useState(false);
  const [filterPatient, setFilterPatient] = useState('');
  const [search, setSearch] = useState('');
  const [listPage, setListPage] = useState(1);

  const [form, setForm] = useState(emptyForm());

  const [tutorModal, setTutorModal] = useState(false);
  const [tutorForm, setTutorForm] = useState(emptyTutor());

  const [patientModal, setPatientModal] = useState(false);
  const [patientForm, setPatientForm] = useState(emptyPatient());

  const { data: recordsPage, isLoading: loading } = useMedicalRecordsQuery(listPage, filterPatient || undefined);
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
  }, [filterPatient]);

  const handleCreate = async () => {
    if (!form.patient_id) {
      toast.error('Selecione ou cadastre um paciente');
      return;
    }
    try {
      const record = await createRecord.mutateAsync(form);
      setModalVisible(false);
      router.push(`/medical-records/prontuario/${record.patient_id}`);
    } catch {
      toast.error('Erro ao criar prontuário');
    }
  };

  const handleCreateTutor = async () => {
    if (!tutorForm.name || !tutorForm.cpf || !tutorForm.phone || !tutorForm.email || !tutorForm.cep) {
      toast.error('Preencha nome, CPF, telefone, email e CEP');
      return;
    }
    try {
      const tutor = await createTutor.mutateAsync(tutorForm);
      setTutorModal(false);
      setTutorForm(emptyTutor());
      setPatientForm((p) => ({ ...p, tutor_id: tutor.id }));
      if (!patientModal) setPatientModal(true);
    } catch {
      toast.error('Erro ao cadastrar tutor');
    }
  };

  const handleCreatePatient = async () => {
    if (!patientForm.name || !patientForm.species || !patientForm.breed) {
      toast.error('Preencha nome, espécie e raça');
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
      toast.error('Erro ao cadastrar animal');
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
        <h1 className="text-2xl font-extrabold font-['InterDoFigma'] flex items-center gap-2">Prontuários</h1>
        <Button
          onClick={() => {
            setForm(emptyForm());
            setModalVisible(true);
          }}
          className="w-full bg-primary hover:bg-primary/70 sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-1" /> Novo Prontuário
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-10">
        <div className="flex-1 min-w-50 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7" />
          <Input
            placeholder="Buscar por paciente, veterinário, queixa..."
            className="pl-12 rounded-full h-15! placeholder:text-black/80"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
          <div className="text-center py-12 text-muted-foreground">Nenhum prontuário encontrado.</div>
        ) : (
          <div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 pt-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {patientGroups.map((group) => {
                const lastUpdated = group.records[0]?.createdAt;
                return (
                  <Link
                    key={group.patient.id}
                    href={`/medical-records/prontuario/${group.patient.id}`}
                    className="group relative block perspective-[900px] focus-visible:outline-none"
                  >
                    {/* Aba da pasta */}
                    <div className="absolute -top-2.5 left-0 h-3 w-28 rounded-t-lg border border-b-0 border-gray-300 bg-gray-50 transition-colors duration-200 group-hover:border-primary/40 group-hover:bg-primary/10" />

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
                            {RECORD_TYPE_LABELS[record.record_type] ?? record.record_type}
                          </p>
                        </div>
                        <div className="px-2 py-1">
                          <p className="truncate text-[9px] text-muted-foreground">
                            {dayjs(record.record_date ?? record.createdAt).format('DD/MM/YYYY')}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Corpo da pasta — quadrado e alto; a capa tomba pra frente
                        no hover (gira pela dobra de baixo), como se abrisse. */}
                    <div
                      className={cn(
                        'relative flex aspect-square origin-bottom flex-col justify-between rounded-xl rounded-tl-none border border-gray-300 bg-white p-3.5 shadow-sm transition-all duration-300',
                        JUICY_EASE,
                        'group-hover:border-primary/40 group-hover:shadow-xl group-hover:translate-y-0.5 group-hover:-rotate-x-14',
                        'group-focus-visible:ring-2 group-focus-visible:ring-primary/50',
                      )}
                    >
                      <div>
                        {/* Foto do pet feito uma polaroide solta, presa por um
                            clipe que agarra também a borda de cima da pasta. */}
                        <div className="relative -mt-9 mb-1 inline-block">
                          <div className="-rotate-4 rounded-sm bg-white p-1.5 pb-3 shadow-lg ring-1 ring-black/5 transition-transform duration-300 group-hover:-rotate-2">
                            {group.patient.photo_url ? (
                              <ProfilePhoto
                                url={group.patient.photo_url}
                                name={group.patient.name}
                                className="size-16 shrink-0 rounded-[2px] shadow-none ring-0 saturate-[.85] contrast-105 sepia-[0.08]"
                              />
                            ) : (
                              <div className="flex size-16 shrink-0 items-center justify-center rounded-[2px] bg-primary/10 text-primary">
                                <FolderOpen className="h-7 w-7" />
                              </div>
                            )}
                          </div>
                          {/* Clipe de papel — agarra a foto solta e a borda de
                              cima da pasta ao mesmo tempo. Troque por uma imagem
                              de clipe própria (ex.: um PNG) se preferir. */}
                          <Paperclip
                            className="absolute -top-3.5 -left-3 h-9 w-9 -rotate-42 text-gray-400 drop-shadow transition-transform duration-300 group-hover:-rotate-47"
                            strokeWidth={1.6}
                          />
                        </div>
                        <div className="mt-2.5 min-w-0">
                          <p className="truncate text-sm font-bold leading-tight text-foreground">
                            {group.patient.name}
                          </p>
                          {/* Sem o tutor, duas pastas de animais homônimos ficam
                              indistinguíveis. */}
                          <p
                            className="mt-0.5 truncate text-[11px] text-muted-foreground"
                            title={group.patient.tutor?.name ?? undefined}
                          >
                            {group.patient.tutor?.name ?? 'Sem responsável'}
                          </p>
                        </div>
                      </div>
                      {/* Rodapé em forma de etiqueta da pasta — separado por uma linha pontilhada, como uma perfuração */}
                      <div className="flex items-end justify-between border-t border-dashed border-gray-200 pt-2">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {group.records.length} {group.records.length === 1 ? 'ficha' : 'fichas'}
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
        title="Novo Prontuário"
        containerClassName="max-w-lg mx-auto"
        preventOutsideClose
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setModalVisible(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} className="bg-primary">
              Criar e Abrir
            </Button>
          </div>
        }
      >
        <div className="space-y-4 md:space-y-6">
          <div className="space-y-2">
            <Label>Paciente *</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex-1 min-w-0">
                <Select value={form.patient_id} onValueChange={(v) => setForm((p) => ({ ...p, patient_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={patients.length ? 'Selecione' : 'Nenhum animal cadastrado'} />
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
                title="Cadastrar novo animal"
                className="shrink-0"
              >
                <PawPrint className="h-4 w-4 mr-1" /> Novo animal
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Sem tutor cadastrado? Use o botão <strong>Novo animal</strong> e clique em <strong>+ Novo tutor</strong>{' '}
              dentro dele — ou deixe sem tutor (emergência).
            </p>
          </div>

          <div className="space-y-2">
            <Label>Veterinário</Label>
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
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Nenhum</SelectItem>
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
              <Label>Tipo</Label>
              <Select value={form.record_type} onValueChange={(v) => setForm((p) => ({ ...p, record_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="atendimento">Atendimento</SelectItem>
                  <SelectItem value="retorno">Retorno</SelectItem>
                  <SelectItem value="emergencia">Emergência</SelectItem>
                  <SelectItem value="cirurgia">Cirurgia</SelectItem>
                  <SelectItem value="internacao">Internação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Data</Label>
              <Input
                type="date"
                value={form.record_date}
                onChange={(e) => setForm((p) => ({ ...p, record_date: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Queixa principal</Label>
            <Textarea
              rows={2}
              value={form.chief_complaint}
              onChange={(e) => setForm((p) => ({ ...p, chief_complaint: e.target.value }))}
              placeholder="Descreva a queixa do tutor..."
            />
          </div>
        </div>
      </DashboardCreateFormDialog>

      {/* Novo Animal inline */}
      <DashboardCreateFormDialog
        open={patientModal}
        onOpenChange={setPatientModal}
        title="Cadastrar novo animal"
        containerClassName="max-w-lg mx-auto"
        preventOutsideClose
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setPatientModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreatePatient} disabled={patientSaving} className="bg-primary">
              {patientSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Salvar animal
            </Button>
          </div>
        }
      >
        <div className="space-y-4 md:space-y-6">
          <div className="space-y-2">
            <Label>Tutor</Label>
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
                    <SelectValue placeholder={tutors.length ? 'Selecione' : 'Nenhum tutor cadastrado'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Sem tutor (emergência)</SelectItem>
                    {tutors.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
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
                title="Cadastrar novo tutor"
                className="shrink-0"
              >
                <UserPlus className="h-4 w-4 mr-1" /> Novo tutor
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="space-y-1 md:col-span-7">
              <Label>Nome *</Label>
              <Input
                value={patientForm.name}
                onChange={(e) => setPatientForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1 md:col-span-5">
              <Label>Sexo</Label>
              <Select value={patientForm.sex} onValueChange={(v) => setPatientForm((p) => ({ ...p, sex: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Macho</SelectItem>
                  <SelectItem value="F">Fêmea</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="space-y-1 md:col-span-4">
              <Label>Espécie *</Label>
              <Input
                value={patientForm.species}
                onChange={(e) => setPatientForm((p) => ({ ...p, species: e.target.value }))}
                placeholder="Canino, Felino..."
              />
            </div>
            <div className="space-y-1 md:col-span-5">
              <Label>Raça *</Label>
              <Input
                value={patientForm.breed}
                onChange={(e) => setPatientForm((p) => ({ ...p, breed: e.target.value }))}
              />
            </div>
            <div className="space-y-1 md:col-span-1">
              <Label>Idade (anos)</Label>
              <Input
                type="number"
                step="0.1"
                value={patientForm.age}
                onChange={(e) => setPatientForm((p) => ({ ...p, age: e.target.value }))}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Peso (kg)</Label>
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
        title="Cadastrar novo tutor"
        containerClassName="max-w-lg mx-auto"
        preventOutsideClose
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setTutorModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTutor} disabled={tutorSaving} className="bg-primary">
              {tutorSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Salvar tutor
            </Button>
          </div>
        }
      >
        <div className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="space-y-1 md:col-span-5">
              <Label>Nome *</Label>
              <Input value={tutorForm.name} onChange={(e) => setTutorForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label>CPF *</Label>
              <Input value={tutorForm.cpf} onChange={(e) => setTutorForm((p) => ({ ...p, cpf: e.target.value }))} />
            </div>
            <div className="space-y-1 md:col-span-4">
              <Label>Telefone *</Label>
              <Input value={tutorForm.phone} onChange={(e) => setTutorForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="space-y-1 md:col-span-8">
              <Label>Email *</Label>
              <Input
                type="email"
                value={tutorForm.email}
                onChange={(e) => setTutorForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="space-y-1 md:col-span-3">
              <Label>CEP *</Label>
              <Input value={tutorForm.cep} onChange={(e) => setTutorForm((p) => ({ ...p, cep: e.target.value }))} />
            </div>
            <div className="space-y-1 md:col-span-7">
              <Label>Rua</Label>
              <Input
                value={tutorForm.street}
                onChange={(e) => setTutorForm((p) => ({ ...p, street: e.target.value }))}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Número</Label>
              <Input
                value={tutorForm.number}
                onChange={(e) => setTutorForm((p) => ({ ...p, number: e.target.value }))}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Cadastro rápido — campos de endereço completos podem ser preenchidos depois em <strong>Tutores</strong>.
          </p>
        </div>
      </DashboardCreateFormDialog>
    </div>
  );
}
