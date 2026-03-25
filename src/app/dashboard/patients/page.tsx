'use client';

import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Stethoscope, History, ChevronsUpDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

const NO_TUTOR_REASON_LABELS: Record<string, string> = {
  EMERGENCIA: 'Emergência',
  ABANDONO: 'Abandono',
};

interface Tutor {
  id: string;
  name: string;
}

interface Patient {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  weight: number;
  sex: string;
  chip_number?: string;
  tutor_id: string | null;
  no_tutor_reason?: string | null;
  tutor?: Tutor | null;
}

interface SupportOption {
  id: number;
  description: string;
}

interface FormValues {
  name: string;
  tutor_choice: 'yes' | 'no';
  tutor_id?: string;
  no_tutor_reason?: string;
  species: string;
  breed: string;
  age: number;
  weight: number;
  sex: string;
  chip_number?: string;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [speciesOptions, setSpeciesOptions] = useState<SupportOption[]>([]);
  const [breedOptions, setBreedOptions] = useState<SupportOption[]>([]);
  const [breedSearchValue, setBreedSearchValue] = useState('');
  const [breedOpen, setBreedOpen] = useState(false);
  const [sexOptions, setSexOptions] = useState<SupportOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>();

  const watchedSpecies = watch('species');
  const watchedTutorChoice = watch('tutor_choice');

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await api.get('/patients');
      setPatients(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Erro ao carregar pacientes');
    } finally {
      setLoading(false);
    }
  };

  const fetchTutors = async () => {
    try {
      const response = await api.get('/tutors');
      setTutors(response.data);
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

  const getBreedDiscriminator = (species: string) =>
    BREED_DISCRIMINATOR[species] ?? 'ANIMAL_RACA_OUTRO';

  const fetchSupportOptions = async () => {
    try {
      const [species, sex] = await Promise.all([
        api.get<SupportOption[]>('/catalog/support', { params: { discriminator: 'ANIMAL_ESPECIE' } }),
        api.get<SupportOption[]>('/catalog/support', { params: { discriminator: 'ANIMAL_GENERO' } }),
      ]);
      setSpeciesOptions(species.data ?? []);
      setSexOptions(sex.data ?? []);
    } catch (error) {
      console.error('Error fetching support options:', error);
    }
  };

  const fetchBreedOptions = async (species: string) => {
    const disc = getBreedDiscriminator(species);
    try {
      const res = await api.get<SupportOption[]>('/catalog/support', { params: { discriminator: disc } });
      setBreedOptions(res.data ?? []);
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
      await api.post('/catalog/support', { discriminator: disc, description: newBreed });
      toast.success(`Raça "${newBreed}" cadastrada`);
      await fetchBreedOptions(species);
      setValue('breed', newBreed);
      setBreedSearchValue('');
      setBreedOpen(false);
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao cadastrar raça');
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchTutors();
    fetchSupportOptions();
  }, []);

  const handleAdd = () => {
    setEditingId(null);
    reset();
    setModalVisible(true);
  };

  const handleEdit = (record: Patient) => {
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

  const onSubmit = async (values: FormValues) => {
    const { tutor_choice, ...rest } = values;
    const payload =
      tutor_choice === 'yes'
        ? { ...rest, tutor_id: rest.tutor_id || null, no_tutor_reason: null }
        : { ...rest, tutor_id: null, no_tutor_reason: rest.no_tutor_reason || null };
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

  const filteredBreeds = breedOptions.filter((o) =>
    o.description.toLowerCase().includes(breedSearchValue.toLowerCase()),
  );
  const showAddBreed =
    breedSearchValue.trim() !== '' &&
    !breedOptions.some(
      (o) => o.description.toLowerCase() === breedSearchValue.trim().toLowerCase(),
    );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
          <Stethoscope className="w-6 h-6" /> Pacientes
        </h1>
        <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Novo Paciente
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Espécie</TableHead>
              <TableHead>Raça</TableHead>
              <TableHead>Tutor</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{record.name}</TableCell>
                <TableCell>{record.species}</TableCell>
                <TableCell>{record.breed}</TableCell>
                <TableCell>
                  {record.tutor?.name ??
                    (record.no_tutor_reason
                      ? `Sem tutor (${NO_TUTOR_REASON_LABELS[record.no_tutor_reason] ?? record.no_tutor_reason})`
                      : '—')}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Link href={`/dashboard/patients/${record.id}`}>
                      <Button variant="outline" size="icon" title="Ver timeline">
                        <History className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button variant="outline" size="icon" onClick={() => handleEdit(record)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon">
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
                          <AlertDialogAction onClick={() => handleDelete(record.id)}>
                            Confirmar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {patients.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhum paciente cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={modalVisible} onOpenChange={setModalVisible}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Nome */}
            <div className="space-y-1">
              <Label htmlFor="name">Nome *</Label>
              <Controller
                name="name"
                control={control}
                rules={{ required: 'Obrigatório' }}
                render={({ field }) => (
                  <Input id="name" {...field} value={field.value ?? ''} />
                )}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Tutor choice */}
            <div className="space-y-2">
              <Label>Tutor *</Label>
              {editingId && (
                <p className="text-xs text-muted-foreground">
                  Você pode vincular ou alterar o tutor ao editar o paciente.
                </p>
              )}
              <Controller
                name="tutor_choice"
                control={control}
                rules={{ required: 'Defina se informa o tutor agora ou não' }}
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="yes" id="tutor-yes" />
                      <Label htmlFor="tutor-yes" className="font-normal cursor-pointer">
                        Informar tutor agora
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="no" id="tutor-no" />
                      <Label htmlFor="tutor-no" className="font-normal cursor-pointer">
                        Não informar tutor (emergência ou abandono)
                      </Label>
                    </div>
                  </RadioGroup>
                )}
              />
              {errors.tutor_choice && (
                <p className="text-sm text-destructive">{errors.tutor_choice.message}</p>
              )}
            </div>

            {/* Conditional: tutor_id */}
            {watchedTutorChoice === 'yes' && (
              <div className="space-y-1">
                <Label>Selecione o tutor *</Label>
                <Controller
                  name="tutor_id"
                  control={control}
                  rules={{ required: 'Selecione um tutor' }}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um tutor" />
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
                {errors.tutor_id && (
                  <p className="text-sm text-destructive">{errors.tutor_id.message}</p>
                )}
              </div>
            )}

            {/* Conditional: no_tutor_reason */}
            {watchedTutorChoice === 'no' && (
              <div className="space-y-1">
                <Label>Motivo *</Label>
                <Controller
                  name="no_tutor_reason"
                  control={control}
                  rules={{ required: 'Informe o motivo' }}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o motivo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EMERGENCIA">
                          {NO_TUTOR_REASON_LABELS.EMERGENCIA}
                        </SelectItem>
                        <SelectItem value="ABANDONO">
                          {NO_TUTOR_REASON_LABELS.ABANDONO}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.no_tutor_reason && (
                  <p className="text-sm text-destructive">{errors.no_tutor_reason.message}</p>
                )}
              </div>
            )}

            {/* Espécie + Raça */}
            <div className="grid grid-cols-2 gap-4">
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
                        setValue('breed', '' as any);
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
                {errors.species && (
                  <p className="text-sm text-destructive">{errors.species.message}</p>
                )}
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
                          className="w-full justify-between font-normal"
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
                      <PopoverContent className="w-64 p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar raça..."
                            value={breedSearchValue}
                            onValueChange={setBreedSearchValue}
                          />
                          <CommandList>
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
                                  <Plus className="mr-2 h-4 w-4" />
                                  + Cadastrar &quot;{breedSearchValue.trim()}&quot;
                                </CommandItem>
                              )}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.breed && (
                  <p className="text-sm text-destructive">{errors.breed.message}</p>
                )}
              </div>
            </div>

            {/* Idade, Peso, Sexo */}
            <div className="grid grid-cols-3 gap-4">
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
                {errors.age && (
                  <p className="text-sm text-destructive">{errors.age.message}</p>
                )}
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
                {errors.weight && (
                  <p className="text-sm text-destructive">{errors.weight.message}</p>
                )}
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
                {errors.sex && (
                  <p className="text-sm text-destructive">{errors.sex.message}</p>
                )}
              </div>
            </div>

            {/* Microchip */}
            <div className="space-y-1">
              <Label htmlFor="chip_number">Nº Microchip</Label>
              <Controller
                name="chip_number"
                control={control}
                render={({ field }) => (
                  <Input id="chip_number" {...field} value={field.value ?? ''} />
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalVisible(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingId ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
