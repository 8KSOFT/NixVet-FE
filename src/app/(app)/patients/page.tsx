'use client';

import type { ApiRequestError } from '@/app/types/api-error';
import type { PatientFormValues, PatientRow } from '@/app/types/patient';
import { useForm, Controller } from 'react-hook-form';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';

import { Plus, Pencil, Trash2, History } from 'lucide-react';
import { toast } from 'sonner';

import { API_PAGE_SIZE } from '@/lib/pagination';
import {
  useCreatePatientMutation,
  useDeletePatientMutation,
  usePatientsQuery,
  useUpdatePatientMutation,
  type PatientPayload,
} from '@/hooks/apiHooks/usePatients';
import { useTutorsListQuery } from '@/hooks/apiHooks/useTutors';
import {
  useCreateSupportOptionMutation,
  usePagedSupportOptionsQuery,
  useSupportOptionsQuery,
} from '@/hooks/apiHooks/useCatalogSupport';

import { ListPagination } from '@/components/list-pagination';

import { Button } from '@/components/ui/button';
import { DashboardCreateFormDialog } from '@/components/dashboard-create-form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const NO_TUTOR_REASON_LABELS: Record<string, string> = {
  EMERGENCIA: 'Emergência',
  ABANDONO: 'Abandono',
};

const BREED_DISCRIMINATOR: Record<string, string> = {
  CANINO: 'ANIMAL_RACA_CAO',
  FELINO: 'ANIMAL_RACA_GATO',
  BOVINO: 'ANIMAL_RACA_BOVINO',
  EQUINO: 'ANIMAL_RACA_EQUINO',
  OUTRO: 'ANIMAL_RACA_OUTRO',
};

/** Alinha valor salvo / legado ao código usado no catálogo support */
function normalizeSpeciesCode(species: string) {
  const s = (species || '').trim().toUpperCase();
  if (s === 'CÃO' || s === 'CAO' || s === 'CACHORRO') return 'CANINO';
  if (s === 'GATO') return 'FELINO';
  return s;
}

function getBreedDiscriminator(species: string) {
  const code = normalizeSpeciesCode(species);
  return BREED_DISCRIMINATOR[code] ?? 'ANIMAL_RACA_OUTRO';
}

function guardianLabel(record: PatientRow): string {
  if (record.tutor?.name) return record.tutor.name;
  if (record.no_tutor_reason) {
    return `Sem responsável (${NO_TUTOR_REASON_LABELS[record.no_tutor_reason] ?? record.no_tutor_reason})`;
  }
  return '—';
}

function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  const typedError = error as ApiRequestError;
  const responseMessage = typedError.response?.data?.message;

  if (Array.isArray(responseMessage)) {
    return responseMessage[0] ?? fallbackMessage;
  }

  return responseMessage ?? typedError.message ?? fallbackMessage;
}

export default function PatientsPage() {
  const [breedSearchValue, setBreedSearchValue] = useState('');
  const [breedOpen, setBreedOpen] = useState(false);
  const [listPage, setListPage] = useState(1);
  const [listTutorFilter, setListTutorFilter] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { t } = useTranslation('common');
  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<PatientFormValues>();

  const watchedSpecies = watch('species');
  const watchedTutorChoice = watch('tutor_choice');
  const breedDiscriminator = watchedSpecies ? getBreedDiscriminator(watchedSpecies) : null;

  const { data: patientsPage, isLoading: loading } = usePatientsQuery(listPage, listTutorFilter || undefined);
  const patients = patientsPage?.items ?? [];
  const listTotal = patientsPage?.total ?? 0;
  const listTotalPages = patientsPage?.totalPages ?? 1;

  const { data: tutors = [] } = useTutorsListQuery();
  const { data: speciesOptions = [] } = useSupportOptionsQuery('ANIMAL_ESPECIE');
  const { data: sexOptions = [] } = useSupportOptionsQuery('ANIMAL_GENERO');
  const { data: breedOptions = [] } = usePagedSupportOptionsQuery(breedDiscriminator);

  const createPatient = useCreatePatientMutation();
  const updatePatient = useUpdatePatientMutation();
  const deletePatient = useDeletePatientMutation();
  const createSupportOption = useCreateSupportOptionMutation();

  const handleAddBreed = async (breedName?: string) => {
    const species = getValues('species');
    const disc = getBreedDiscriminator(species);
    const newBreed = (breedName ?? breedSearchValue)?.trim();
    if (!newBreed) return;
    try {
      await createSupportOption.mutateAsync({ discriminator: disc, description: newBreed });
      toast.success(`Raça "${newBreed}" cadastrada`);
      setValue('breed', newBreed);
      setBreedSearchValue(newBreed);
      setBreedOpen(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao cadastrar raça'));
    }
  };

  useEffect(() => {
    setListPage(1);
  }, [listTutorFilter]);

  const handleAdd = () => {
    setEditingId(null);
    reset();
    setBreedSearchValue('');
    setModalVisible(true);
  };

  const handleEdit = (record: PatientRow) => {
    setEditingId(record.id);
    const hasTutor = !!record.tutor_id;
    reset({
      name: record.name,
      species: record.species,
      breed: record.breed,
      age: record.age,
      weight: record.weight,
      sex: record.sex,
      chip_number: record.chip_number,
      tutor_id: record.tutor_id ?? undefined,
      tutor_choice: hasTutor ? 'yes' : 'no',
      no_tutor_reason: record.no_tutor_reason ?? undefined,
    });
    setBreedSearchValue(record.breed ?? '');
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePatient.mutateAsync(id);
      toast.success('Paciente removido com sucesso');
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast.error('Erro ao remover paciente');
    }
  };

  const onSubmit = async (values: PatientFormValues) => {
    const { tutor_choice, ...rest } = values;
    const payload: PatientPayload =
      tutor_choice === 'yes'
        ? { ...rest, tutor_id: rest.tutor_id || null, no_tutor_reason: null }
        : {
            ...rest,
            tutor_id: null,
            no_tutor_reason: rest.no_tutor_reason || null,
          };
    try {
      if (editingId) {
        await updatePatient.mutateAsync({ id: editingId, payload });
        toast.success('Paciente atualizado com sucesso');
      } else {
        await createPatient.mutateAsync(payload);
        toast.success('Paciente criado com sucesso');
      }
      setModalVisible(false);
    } catch (error) {
      console.error('Error saving patient:', error);
      toast.error('Erro ao salvar paciente');
    }
  };

  const MIN_BREED_SEARCH = 3;
  const breedQuery = breedSearchValue.trim();
  const canSearchBreed = breedQuery.length >= MIN_BREED_SEARCH;
  // Autocomplete: só filtra/sugere a partir de 3 caracteres digitados.
  const filteredBreeds = canSearchBreed
    ? breedOptions.filter((o) => o.description.toLowerCase().includes(breedQuery.toLowerCase()))
    : [];
  const showAddBreed =
    canSearchBreed &&
    !breedOptions.some((o) => o.description.toLowerCase() === breedQuery.toLowerCase());

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-8">
        <h1 className="text-2xl font-extrabold font-['InterDoFigma'] flex items-center gap-2">{t('patients.title')}</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-2 sm:min-w-50">
            <Label className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
              {t('patients.dropdownLabel')}
            </Label>
            <Select value={listTutorFilter || '_all'} onValueChange={(v) => setListTutorFilter(v === '_all' ? '' : v)}>
              <SelectTrigger className="h-9 w-full sm:w-60">
                <SelectValue placeholder={t('patients.dropdownStandardOption')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">{t('patients.dropdownStandardOption')}</SelectItem>
                {tutors.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAdd} className="w-full bg-primary hover:bg-brand-deep/80 sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> {t('patients.createButton')}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : (
        <div>
          {patients.length === 0 ? (
            <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
              Nenhum paciente cadastrado.
            </div>
          ) : (
            <>
              {/* Desktop / tablet: tabela */}
              <div className="hidden overflow-x-auto rounded-lg border border-gray-300 md:block">
                <Table className="min-w-full border-collapse bg-white text-sm">
                  <TableHeader>
                    {/* Borda ou fundo customizado para o cabeçalho se desejar */}
                    <TableRow className="border-b border-gray-300 h-15">
                      <TableHead>{t('patients.table.name')}</TableHead>
                      <TableHead>{t('patients.table.species')}</TableHead>
                      <TableHead>{t('patients.table.breed')}</TableHead>
                      <TableHead>{t('patients.table.guardian')}</TableHead>
                      <TableHead>{t('patients.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patients.map((record) => (
                      /* Aplica a cor gray-300 na borda inferior da linha */
                      <TableRow className="border-b border-gray-300 h-15" key={record.id}>
                        <TableCell>{record.name}</TableCell>
                        <TableCell>{record.species}</TableCell>
                        <TableCell>{record.breed}</TableCell>
                        <TableCell>{guardianLabel(record)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button asChild variant="ghost" size="icon" className="p-0" title="Ver timeline">
                              <Link href={`/patients/${record.id}`}>
                                <History className="w-4 h-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="icon" className="p-0" onClick={() => handleEdit(record)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="p-0">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. O paciente será removido permanentemente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(record.id)}>Confirmar</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: cards */}
              <div className="space-y-3 md:hidden">
                {patients.map((record) => (
                  <div key={record.id} className="rounded-lg border border-gray-300 bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{record.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {record.species}
                          {record.breed ? ` · ${record.breed}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 text-sm">
                      <p className="text-xs text-muted-foreground">{t('patients.table.guardian')}</p>
                      <p className="truncate">{guardianLabel(record)}</p>
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-200 pt-2">
                      <Button asChild variant="ghost" size="icon" className="p-0" title="Ver timeline">
                        <Link href={`/patients/${record.id}`}>
                          <History className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="p-0" onClick={() => handleEdit(record)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="p-0">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O paciente será removido permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(record.id)}>Confirmar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          <ListPagination
            page={listPage}
            totalPages={listTotalPages}
            total={listTotal}
            pageSize={API_PAGE_SIZE}
            onPageChange={setListPage}
            disabled={loading}
          />
        </div>
      )}

      <DashboardCreateFormDialog
        open={modalVisible}
        onOpenChange={setModalVisible}
        title={editingId ? 'Editar Paciente' : 'Novo Paciente'}
        contentClassName="modal-responsive"
        bodyClassName="select-none"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="border border-gray-300"
              onClick={() => setModalVisible(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" form="patient-create-form">
              {editingId ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        }
      >
        <form id="patient-create-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Controller
              name="name"
              control={control}
              rules={{ required: 'Obrigatório' }}
              render={({ field }) => (
                <Input
                  className="ring-none border-gray-300 shadow-none"
                  id="name"
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          {/* Tutor choice */}
          <div className="space-y-2">
            <Label>Responsável *</Label>
            {editingId && (
              <p className="text-xs text-muted-foreground">
                Você pode vincular ou alterar o responsável ao editar o paciente.
              </p>
            )}
            <Controller
              name="tutor_choice"
              control={control}
              rules={{
                required: 'Defina se informa o responsável agora ou não',
              }}
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="flex min-h-11 items-stretch gap-0 border border-gray-300 rounded-lg overflow-hidden"
                >
                  {/* LADO ESQUERDO: Transforma a div em Label clicável */}
                  <label
                    htmlFor="tutor-yes"
                    className="w-1/2 flex items-center gap-2 p-3 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <RadioGroupItem
                      value="yes"
                      id="tutor-yes"
                      className="size-4 shrink-0 bg-gray-300 data-[state=checked]:bg-transparent flex items-center justify-center [&_span]:flex [&_span]:items-center [&_span]:justify-center [&_span]:size-full [&_svg]:!size-[85%] [&_svg]:fill-current"
                    />
                    <span className="text-sm font-normal text-foreground">Informar responsável</span>
                  </label>

                  {/* Linha Divisória Central */}
                  <div className="w-px self-stretch bg-gray-300 shrink-0"></div>

                  {/* LADO DIREITO: Transforma a div em Label clicável */}
                  <label
                    htmlFor="tutor-no"
                    className="w-1/2 flex items-center gap-2 p-3 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <RadioGroupItem
                      value="no"
                      id="tutor-no"
                      className="size-4 shrink-0 bg-gray-300 data-[state=checked]:bg-transparent flex items-center justify-center [&_span]:flex [&_span]:items-center [&_span]:justify-center [&_span]:size-full [&_svg]:!size-[85%] [&_svg]:fill-current"
                    />
                    <span className="text-sm font-normal text-foreground">Não informar</span>
                  </label>
                </RadioGroup>
              )}
            />
            {errors.tutor_choice && <p className="text-sm text-destructive">{errors.tutor_choice.message}</p>}
          </div>

          {/* Container Unificado - A gaveta expande suave se houver qualquer escolha */}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              watchedTutorChoice ? 'max-h-32 opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0 pointer-events-none'
            }`}
          >
            {/* Conteúdo Dinâmico com Fade-in Interno */}
            <div key={watchedTutorChoice} className="animate-in fade-in duration-200 space-y-1">
              {/* CASO: Informar responsável agora */}
              {watchedTutorChoice === 'yes' && (
                <>
                  <Label>Selecione o responsável *</Label>
                  <Controller
                    name="tutor_id"
                    control={control}
                    rules={{
                      required: watchedTutorChoice === 'yes' ? 'Selecione um responsável' : false,
                    }}
                    render={({ field }) => (
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          {tutors.map((tutor) => (
                            <SelectItem key={tutor.id} value={tutor.id}>
                              {tutor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.tutor_id && <p className="text-sm text-destructive">{errors.tutor_id.message}</p>}
                </>
              )}

              {/* CASO: Não informar responsável */}
              {watchedTutorChoice === 'no' && (
                <>
                  <Label>Motivo *</Label>
                  <Controller
                    name="no_tutor_reason"
                    control={control}
                    rules={{
                      required: watchedTutorChoice === 'no' ? 'Informe o motivo' : false,
                    }}
                    render={({ field }) => (
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o motivo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EMERGENCIA">{NO_TUTOR_REASON_LABELS.EMERGENCIA}</SelectItem>
                          <SelectItem value="ABANDONO">{NO_TUTOR_REASON_LABELS.ABANDONO}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.no_tutor_reason && (
                    <p className="text-sm text-destructive">{errors.no_tutor_reason.message}</p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Espécie + Raça */}
          <div className="grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-4 max-md:grid-cols-2">
            <div className="space-y-1">
              <Label>Espécie *</Label>
              <Controller
                name="species"
                control={control}
                rules={{ required: 'Obrigatório' }}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(value) => {
                      field.onChange(value);
                      setValue('breed', '');
                      setBreedSearchValue('');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {speciesOptions.map((o) => (
                        <SelectItem key={o.id} value={o.description}>
                          {o.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.species && <p className="text-sm text-destructive">{errors.species.message}</p>}
            </div>

            {/* Raça — autocomplete (Input + sugestões), 3+ letras */}
            <div className="space-y-1">
              <Label>Raça *</Label>
              <Controller
                name="breed"
                control={control}
                rules={{ required: 'Obrigatório' }}
                render={({ field }) => (
                  <div className="relative">
                    <Input
                      value={breedSearchValue}
                      disabled={!watchedSpecies}
                      autoComplete="off"
                      placeholder={watchedSpecies ? 'Digite a raça (mín. 3 letras)' : 'Selecione primeiro a espécie'}
                      onFocus={() => setBreedOpen(true)}
                      onBlur={() => window.setTimeout(() => setBreedOpen(false), 150)}
                      onChange={(e) => {
                        const v = e.target.value;
                        setBreedSearchValue(v);
                        field.onChange(v);
                        setBreedOpen(true);
                      }}
                    />
                    {breedOpen && watchedSpecies && (
                      <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
                        {!canSearchBreed ? (
                          <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                            Digite ao menos 3 letras para buscar a raça
                          </div>
                        ) : filteredBreeds.length === 0 && !showAddBreed ? (
                          <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                            Nenhuma raça encontrada.
                          </div>
                        ) : (
                          <>
                            {filteredBreeds.map((o) => (
                              <button
                                type="button"
                                key={o.id}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  field.onChange(o.description);
                                  setBreedSearchValue(o.description);
                                  setBreedOpen(false);
                                }}
                                className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                              >
                                {o.description}
                              </button>
                            ))}
                            {showAddBreed && (
                              <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleAddBreed(breedSearchValue.trim())}
                                className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm text-primary hover:bg-accent"
                              >
                                <Plus className="mr-2 h-4 w-4" /> Cadastrar &quot;{breedSearchValue.trim()}&quot;
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              />
              {errors.breed && <p className="text-sm text-destructive">{errors.breed.message}</p>}
            </div>
          </div>

          {/* Idade, Peso, Sexo, Microchip */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="age">Idade (anos) *</Label>
              <Controller
                name="age"
                control={control}
                rules={{ required: 'Obrigatório' }}
                render={({ field }) => (
                  <Input
                    id="age"
                    type="number"
                    min={0}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                )}
              />
              {errors.age && <p className="text-sm text-destructive">{errors.age.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="weight">Peso (kg) *</Label>
              <Controller
                name="weight"
                control={control}
                rules={{ required: 'Obrigatório' }}
                render={({ field }) => (
                  <Input
                    id="weight"
                    type="number"
                    min={0}
                    step={0.1}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                )}
              />
              {errors.weight && <p className="text-sm text-destructive">{errors.weight.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Sexo *</Label>
              <Controller
                name="sex"
                control={control}
                rules={{ required: 'Obrigatório' }}
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {sexOptions.map((o) => (
                        <SelectItem key={o.id} value={o.description}>
                          {o.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.sex && <p className="text-sm text-destructive">{errors.sex.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="chip_number">Nº Microchip</Label>
              <Controller
                name="chip_number"
                control={control}
                render={({ field }) => <Input id="chip_number" {...field} value={field.value ?? ''} />}
              />
            </div>
          </div>
        </form>
      </DashboardCreateFormDialog>
    </div>
  );
}
