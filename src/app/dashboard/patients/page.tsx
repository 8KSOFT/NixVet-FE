'use client';

import type { ApiRequestError } from '@/app/types/api-error';
import type {
  PatientFormValues,
  PatientRow,
  PatientTutor,
  SupportOption,
  SupportOptionsEnvelope,
  SupportOptionsListEnvelope,
} from '@/app/types/patient';
import { useForm, Controller } from 'react-hook-form';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';

import { Plus, Pencil, Trash2, History, ChevronsUpDown, Check } from 'lucide-react';
import { toast } from 'sonner';

import { API_PAGE_SIZE, fetchAllListPages, listQueryParams, parseListResponse } from '@/lib/pagination';
import api from '@/lib/axios';

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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

const NO_TUTOR_REASON_LABELS: Record<string, string> = {
  EMERGENCIA: 'Emergência',
  ABANDONO: 'Abandono',
};

function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  const typedError = error as ApiRequestError;
  const responseMessage = typedError.response?.data?.message;

  if (Array.isArray(responseMessage)) {
    return responseMessage[0] ?? fallbackMessage;
  }

  return responseMessage ?? typedError.message ?? fallbackMessage;
}

function normalizeSupportOptions(responseData: unknown): SupportOption[] {
  if (Array.isArray(responseData)) {
    return responseData as SupportOption[];
  }

  const responseEnvelope = responseData as SupportOptionsEnvelope;
  const firstLevelData = responseEnvelope.data;

  if (Array.isArray(firstLevelData)) {
    return firstLevelData;
  }

  const listEnvelope = firstLevelData as SupportOptionsListEnvelope | undefined;

  if (Array.isArray(listEnvelope?.items)) {
    return listEnvelope.items;
  }

  if (Array.isArray(listEnvelope?.content)) {
    return listEnvelope.content;
  }

  return [];
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [tutors, setTutors] = useState<PatientTutor[]>([]);
  const [speciesOptions, setSpeciesOptions] = useState<SupportOption[]>([]);
  const [breedOptions, setBreedOptions] = useState<SupportOption[]>([]);
  const [breedSearchValue, setBreedSearchValue] = useState('');
  const [breedOpen, setBreedOpen] = useState(false);
  const [sexOptions, setSexOptions] = useState<SupportOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [listPage, setListPage] = useState(1);
  const [listTutorFilter, setListTutorFilter] = useState('');
  const [listTotal, setListTotal] = useState(0);
  const [listTotalPages, setListTotalPages] = useState(1);
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

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await api.get('/patients', {
        params: listQueryParams(listPage, API_PAGE_SIZE, {
          tutor_id: listTutorFilter || undefined,
        }),
      });
      const p = parseListResponse<PatientRow>(response.data, listPage);
      setPatients(p.items);
      setListTotal(p.total);
      setListTotalPages(p.totalPages);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Erro ao carregar pacientes');
    } finally {
      setLoading(false);
    }
  };

  const fetchTutors = async () => {
    try {
      const all = await fetchAllListPages<PatientTutor>('/tutors');
      setTutors(all);
    } catch (error) {
      console.error('Error fetching tutors:', error);
    }
  };

  const BREED_DISCRIMINATOR: Record<string, string> = {
    CANINO: 'ANIMAL_RACA_CAO',
    FELINO: 'ANIMAL_RACA_GATO',
    BOVINO: 'ANIMAL_RACA_BOVINO',
    EQUINO: 'ANIMAL_RACA_EQUINO',
    OUTRO: 'ANIMAL_RACA_OUTRO',
  };

  /** Alinha valor salvo / legado ao código usado no catálogo support */
  const normalizeSpeciesCode = (species: string) => {
    const s = (species || '').trim().toUpperCase();
    if (s === 'CÃO' || s === 'CAO' || s === 'CACHORRO') return 'CANINO';
    if (s === 'GATO') return 'FELINO';
    return s;
  };

  const getBreedDiscriminator = (species: string) => {
    const code = normalizeSpeciesCode(species);
    return BREED_DISCRIMINATOR[code] ?? 'ANIMAL_RACA_OUTRO';
  };

  const fetchSupportOptions = async () => {
    try {
      const [speciesRes, sexRes] = await Promise.all([
        api.get('/catalog/support', {
          params: { discriminator: 'ANIMAL_ESPECIE' },
        }),
        api.get('/catalog/support', {
          params: { discriminator: 'ANIMAL_GENERO' },
        }),
      ]);
      setSpeciesOptions(normalizeSupportOptions(speciesRes.data));
      setSexOptions(normalizeSupportOptions(sexRes.data));
    } catch (error) {
      console.error('Error fetching support options:', error);
    }
  };

  const fetchBreedOptions = async (species: string) => {
    const disc = getBreedDiscriminator(species);
    try {
      const res = await api.get('/catalog/support', {
        params: { discriminator: disc },
      });
      setBreedOptions(normalizeSupportOptions(res.data));
    } catch (error) {
      console.error('Error fetching breed options:', error);
      setBreedOptions([]);
    }
  };

  const handleAddBreed = async (breedName?: string) => {
    const species = getValues('species');
    const disc = getBreedDiscriminator(species);
    const newBreed = (breedName ?? breedSearchValue)?.trim();
    if (!newBreed) return;
    try {
      await api.post('/catalog/support', {
        discriminator: disc,
        description: newBreed,
      });
      toast.success(`Raça "${newBreed}" cadastrada`);
      await fetchBreedOptions(species);
      setValue('breed', newBreed);
      setBreedSearchValue('');
      setBreedOpen(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao cadastrar raça'));
    }
  };

  useEffect(() => {
    fetchTutors();
    fetchSupportOptions();
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [listPage, listTutorFilter]);

  useEffect(() => {
    setListPage(1);
  }, [listTutorFilter]);

  const handleAdd = () => {
    setEditingId(null);
    reset();
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
    fetchBreedOptions(record.species);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/patients/${id}`);
      toast.success('Paciente removido com sucesso');
      fetchPatients();
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast.error('Erro ao remover paciente');
    }
  };

  const onSubmit = async (values: PatientFormValues) => {
    const { tutor_choice, ...rest } = values;
    const payload =
      tutor_choice === 'yes'
        ? { ...rest, tutor_id: rest.tutor_id || null, no_tutor_reason: null }
        : {
            ...rest,
            tutor_id: null,
            no_tutor_reason: rest.no_tutor_reason || null,
          };
    try {
      if (editingId) {
        await api.put(`/patients/${editingId}`, payload);
        toast.success('Paciente atualizado com sucesso');
      } else {
        await api.post('/patients', payload);
        toast.success('Paciente criado com sucesso');
      }
      setModalVisible(false);
      fetchPatients();
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
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 min-w-50">
            <Label className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
              {t('patients.dropdownLabel')}
            </Label>
            <Select value={listTutorFilter || '_all'} onValueChange={(v) => setListTutorFilter(v === '_all' ? '' : v)}>
              <SelectTrigger className="h-9 w-60">
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
          <Button onClick={handleAdd} className="bg-primary hover:bg-brand-deep/80">
            <Plus className="w-4 h-4 mr-2" /> {t('patients.createButton')}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : (
        <div>
          <div className="rounded-md border border-gray-300 overflow-hidden">
            <Table>
              <TableHeader className="h-15">
                {/* Borda ou fundo customizado para o cabeçalho se desejar */}
                <TableRow className="border-b border-gray-300">
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
                  <TableRow key={record.id} className="border-b border-gray-300">
                    <TableCell>{record.name}</TableCell>
                    <TableCell className="w-60">{record.species}</TableCell>
                    <TableCell className="w-60">{record.breed}</TableCell>
                    <TableCell className="w-100">
                      {record.tutor?.name ??
                        (record.no_tutor_reason
                          ? `Sem responsável (${NO_TUTOR_REASON_LABELS[record.no_tutor_reason] ?? record.no_tutor_reason})`
                          : '—')}
                    </TableCell>
                    <TableCell className="w-50">
                      <div className="flex items-center gap-1">
                        <Button asChild variant="ghost" size="icon" className="p-0" title="Ver timeline">
                          <Link href={`/dashboard/patients/${record.id}`}>
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
                {patients.length === 0 && (
                  /* Mantém o padrão visual mesmo se a tabela estiver vazia */
                  <TableRow className="border-b border-gray-300">
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum paciente cadastrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
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
                  className="flex h-11 items-center gap-0 border border-gray-300 rounded-lg overflow-hidden"
                >
                  {/* LADO ESQUERDO: Transforma a div em Label clicável */}
                  <label
                    htmlFor="tutor-yes"
                    className="w-1/2 h-full flex items-center gap-2 p-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <RadioGroupItem
                      value="yes"
                      id="tutor-yes"
                      className="size-4 bg-gray-300 data-[state=checked]:bg-transparent flex items-center justify-center [&_span]:flex [&_span]:items-center [&_span]:justify-center [&_span]:size-full [&_svg]:!size-[85%] [&_svg]:fill-current"
                    />
                    <span className="text-sm font-normal text-foreground">Informar responsável agora</span>
                  </label>

                  {/* Linha Divisória Central */}
                  <div className="w-px h-11 bg-gray-300 shrink-0"></div>

                  {/* LADO DIREITO: Transforma a div em Label clicável */}
                  <label
                    htmlFor="tutor-no"
                    className="w-1/2 h-full flex items-center gap-2 p-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <RadioGroupItem
                      value="no"
                      id="tutor-no"
                      className="size-4 bg-gray-300 data-[state=checked]:bg-transparent flex items-center justify-center [&_span]:flex [&_span]:items-center [&_span]:justify-center [&_span]:size-full [&_svg]:!size-[85%] [&_svg]:fill-current"
                    />
                    <span className="text-sm font-normal text-foreground">Não informar responsável</span>
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
                      setBreedOptions([]);
                      setBreedSearchValue('');
                      fetchBreedOptions(value);
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

            {/* Raça com Combobox */}
            <div className="space-y-1">
              <Label>Raça *</Label>
              <Controller
                name="breed"
                control={control}
                rules={{ required: 'Obrigatório' }}
                render={({ field }) => (
                  <Popover open={breedOpen} onOpenChange={setBreedOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        disabled={!watchedSpecies}
                        className="h-8 w-full justify-between font-normal sm:h-11"
                      >
                        <span className="truncate">
                          {field.value
                            ? field.value
                            : breedOptions.length
                              ? 'Selecione ou cadastre a raça'
                              : 'Selecione primeiro a espécie'}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0 popover-responsive" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Buscar raça..."
                          value={breedSearchValue}
                          onValueChange={setBreedSearchValue}
                        />
                        <CommandList>
                          {!canSearchBreed ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              Digite ao menos 3 letras para buscar a raça
                            </div>
                          ) : (
                          <>
                          <CommandEmpty>Nenhuma raça encontrada.</CommandEmpty>
                          <CommandGroup>
                            {filteredBreeds.map((o) => (
                              <CommandItem
                                key={o.id}
                                value={o.description}
                                onSelect={(val) => {
                                  field.onChange(val);
                                  setBreedSearchValue('');
                                  setBreedOpen(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    field.value === o.description ? 'opacity-100' : 'opacity-0'
                                  }`}
                                />
                                {o.description}
                              </CommandItem>
                            ))}
                            {showAddBreed && (
                              <CommandItem
                                value={`__NEW__:${breedSearchValue.trim()}`}
                                onSelect={() => handleAddBreed(breedSearchValue.trim())}
                              >
                                <Plus className="mr-2 h-4 w-4" />+ Cadastrar &quot;{breedSearchValue.trim()}
                                &quot;
                              </CommandItem>
                            )}
                          </CommandGroup>
                          </>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.breed && <p className="text-sm text-destructive">{errors.breed.message}</p>}
            </div>
          </div>

          {/* Idade, Peso, Sexo */}
          <div className="grid grid-cols-3 md:grid-cols-3 gap-4 md:gap-4 max-md:grid-cols-3">
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
          </div>

          {/* Microchip */}
          <div className="space-y-1">
            <Label htmlFor="chip_number">Nº Microchip</Label>
            <Controller
              name="chip_number"
              control={control}
              render={({ field }) => <Input id="chip_number" {...field} value={field.value ?? ''} />}
            />
          </div>
        </form>
      </DashboardCreateFormDialog>
    </div>
  );
}
