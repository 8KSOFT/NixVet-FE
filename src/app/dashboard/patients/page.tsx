"use client";

import { useForm, Controller } from "react-hook-form";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";

import {
  Plus,
  Pencil,
  Trash2,
  Stethoscope,
  History,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import {
  API_PAGE_SIZE,
  fetchAllListPages,
  listQueryParams,
  parseListResponse,
} from "@/lib/pagination";
import api from "@/lib/axios";

import { ListPagination } from "@/components/list-pagination";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const NO_TUTOR_REASON_LABELS: Record<string, string> = {
  EMERGENCIA: "Emergência",
  ABANDONO: "Abandono",
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
  tutor_choice: "yes" | "no";
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
  const [breedSearchValue, setBreedSearchValue] = useState("");
  const [breedOpen, setBreedOpen] = useState(false);
  const [sexOptions, setSexOptions] = useState<SupportOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [listPage, setListPage] = useState(1);
  const [listTutorFilter, setListTutorFilter] = useState("");
  const [listTotal, setListTotal] = useState(0);
  const [listTotalPages, setListTotalPages] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { t } = useTranslation("common");
  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>();

  const watchedSpecies = watch("species");
  const watchedTutorChoice = watch("tutor_choice");

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await api.get("/patients", {
        params: listQueryParams(listPage, API_PAGE_SIZE, {
          tutor_id: listTutorFilter || undefined,
        }),
      });
      const p = parseListResponse<Patient>(response.data, listPage);
      setPatients(p.items);
      setListTotal(p.total);
      setListTotalPages(p.totalPages);
    } catch (error) {
      console.error("Error fetching patients:", error);
      toast.error("Erro ao carregar pacientes");
    } finally {
      setLoading(false);
    }
  };

  const fetchTutors = async () => {
    try {
      const all = await fetchAllListPages<Tutor>("/tutors");
      setTutors(all);
    } catch (error) {
      console.error("Error fetching tutors:", error);
    }
  };

  const BREED_DISCRIMINATOR: Record<string, string> = {
    CANINO: "ANIMAL_RACA_CAO",
    FELINO: "ANIMAL_RACA_GATO",
    BOVINO: "ANIMAL_RACA_BOVINO",
    EQUINO: "ANIMAL_RACA_EQUINO",
    OUTRO: "ANIMAL_RACA_OUTRO",
  };

  /** Alinha valor salvo / legado ao código usado no catálogo support */
  const normalizeSpeciesCode = (species: string) => {
    const s = (species || "").trim().toUpperCase();
    if (s === "CÃO" || s === "CAO" || s === "CACHORRO") return "CANINO";
    if (s === "GATO") return "FELINO";
    return s;
  };

  const getBreedDiscriminator = (species: string) => {
    const code = normalizeSpeciesCode(species);
    return BREED_DISCRIMINATOR[code] ?? "ANIMAL_RACA_OUTRO";
  };

  const fetchSupportOptions = async () => {
    const normalize = (res: any): SupportOption[] => {
      if (!res) return [];
      // axios response wrapper
      if (Array.isArray(res)) return res;
      if (Array.isArray(res.data)) return res.data;
      // possible paginated envelopes
      if (Array.isArray(res.data?.items)) return res.data.items;
      if (Array.isArray(res.data?.content)) return res.data.content;
      return [];
    };

    try {
      const [speciesRes, sexRes] = await Promise.all([
        api.get("/catalog/support", {
          params: { discriminator: "ANIMAL_ESPECIE" },
        }),
        api.get("/catalog/support", {
          params: { discriminator: "ANIMAL_GENERO" },
        }),
      ]);
      setSpeciesOptions(normalize(speciesRes));
      setSexOptions(normalize(sexRes));
    } catch (error) {
      console.error("Error fetching support options:", error);
    }
  };

  const fetchBreedOptions = async (species: string) => {
    const disc = getBreedDiscriminator(species);
    try {
      const res = await api.get("/catalog/support", {
        params: { discriminator: disc },
      });
      // reuse same normalization logic as support options
      const normalize = (r: any): SupportOption[] => {
        if (!r) return [];
        if (Array.isArray(r)) return r;
        if (Array.isArray(r.data)) return r.data;
        if (Array.isArray(r.data?.items)) return r.data.items;
        if (Array.isArray(r.data?.content)) return r.data.content;
        return [];
      };

      setBreedOptions(normalize(res));
    } catch (error) {
      console.error("Error fetching breed options:", error);
      setBreedOptions([]);
    }
  };

  const handleAddBreed = async (breedName?: string) => {
    const species = getValues("species");
    const disc = getBreedDiscriminator(species);
    const newBreed = (breedName ?? breedSearchValue)?.trim();
    if (!newBreed) return;
    try {
      await api.post("/catalog/support", {
        discriminator: disc,
        description: newBreed,
      });
      toast.success(`Raça "${newBreed}" cadastrada`);
      await fetchBreedOptions(species);
      setValue("breed", newBreed);
      setBreedSearchValue("");
      setBreedOpen(false);
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Erro ao cadastrar raça");
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
      tutor_choice: hasTutor ? "yes" : "no",
      no_tutor_reason: record.no_tutor_reason ?? undefined,
    });
    fetchBreedOptions(record.species);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/patients/${id}`);
      toast.success("Paciente removido com sucesso");
      fetchPatients();
    } catch (error) {
      console.error("Error deleting patient:", error);
      toast.error("Erro ao remover paciente");
    }
  };

  const onSubmit = async (values: FormValues) => {
    const { tutor_choice, ...rest } = values;
    const payload =
      tutor_choice === "yes"
        ? { ...rest, tutor_id: rest.tutor_id || null, no_tutor_reason: null }
        : {
            ...rest,
            tutor_id: null,
            no_tutor_reason: rest.no_tutor_reason || null,
          };
    try {
      if (editingId) {
        await api.put(`/patients/${editingId}`, payload);
        toast.success("Paciente atualizado com sucesso");
      } else {
        await api.post("/patients", payload);
        toast.success("Paciente criado com sucesso");
      }
      setModalVisible(false);
      fetchPatients();
    } catch (error) {
      console.error("Error saving patient:", error);
      toast.error("Erro ao salvar paciente");
    }
  };

  const filteredBreeds = breedOptions.filter((o) =>
    o.description.toLowerCase().includes(breedSearchValue.toLowerCase()),
  );
  const showAddBreed =
    breedSearchValue.trim() !== "" &&
    !breedOptions.some(
      (o) =>
        o.description.toLowerCase() === breedSearchValue.trim().toLowerCase(),
    );

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4">
        <h1 className="text-2xl font-extrabold font-['InterDoFigma'] flex items-center gap-2">
          {t("patients.title")}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 min-w-50">
            <Label className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
              {t("patients.dropdownLabel")}
            </Label>
            <Select
              value={listTutorFilter || "_all"}
              onValueChange={(v) => setListTutorFilter(v === "_all" ? "" : v)}
            >
              <SelectTrigger className="h-9 w-60">
                <SelectValue
                  placeholder={t("patients.dropdownStandardOption")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">
                  {t("patients.dropdownStandardOption")}
                </SelectItem>
                {tutors.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleAdd}
            className="bg-primary hover:bg-brand-deep/80"
          >
            <Plus className="w-4 h-4 mr-2" /> {t("patients.createButton")}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Carregando...
        </div>
      ) : (
        <div>
          <div className="rounded-md border border-gray-300 overflow-hidden">
            <Table>
              <TableHeader className="h-15">
                {/* Borda ou fundo customizado para o cabeçalho se desejar */}
                <TableRow className="border-b border-gray-300">
                  <TableHead>{t("patients.table.name")}</TableHead>
                  <TableHead>{t("patients.table.species")}</TableHead>
                  <TableHead>{t("patients.table.breed")}</TableHead>
                  <TableHead>{t("patients.table.guardian")}</TableHead>
                  <TableHead>{t("patients.table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((record) => (
                  /* Aplica a cor gray-300 na borda inferior da linha */
                  <TableRow
                    key={record.id}
                    className="border-b border-gray-300"
                  >
                    <TableCell>{record.name}</TableCell>
                    <TableCell className="w-60">{record.species}</TableCell>
                    <TableCell className="w-60">{record.breed}</TableCell>
                    <TableCell className="w-100">
                      {record.tutor?.name ??
                        (record.no_tutor_reason
                          ? `Sem tutor (${NO_TUTOR_REASON_LABELS[record.no_tutor_reason] ?? record.no_tutor_reason})`
                          : "—")}
                    </TableCell>
                    <TableCell className="w-50">
                      <div className="flex items-center gap-1">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="p-0"
                          title="Ver timeline"
                        >
                          <Link href={`/dashboard/patients/${record.id}`}>
                            <History className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="p-0"
                          onClick={() => handleEdit(record)}
                        >
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
                                Esta ação não pode ser desfeita. O paciente será
                                removido permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(record.id)}
                              >
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
                  /* Mantém o padrão visual mesmo se a tabela estiver vazia */
                  <TableRow className="border-b border-gray-300">
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-8"
                    >
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

      <Dialog open={modalVisible} onOpenChange={setModalVisible}>
        <DialogContent className="max-h-[90vh] bg-white h-fit rounded-none border-none overflow-y-auto p-2 max-w-[calc(100%-4rem)] modal-responsive">
          <DialogHeader className="flex flex-col items-start justify-between bg-[#F2F2F7] rounded-2xl border border-gray-300">
            <DialogTitle className="h-18 flex items-center">
              <span className="pl-5 text-[22px] font-semibold">
                {editingId ? "Editar Paciente" : "Novo Paciente"}
              </span>
            </DialogTitle>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="w-full h-full space-y-4 md:space-y-4 p-5 border-t border-gray-300 rounded-2xl bg-[#FFFFFF]"
            >
              {/* Nome */}
              <div className="space-y-1">
                <Label htmlFor="name">Nome *</Label>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: "Obrigatório" }}
                  render={({ field }) => (
                    <Input
                      className="ring-none border-gray-300 shadow-none"
                      id="name"
                      {...field}
                      value={field.value ?? ""}
                    />
                  )}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
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
                  rules={{
                    required: "Defina se informa o tutor agora ou não",
                  }}
                  render={({ field }) => (
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex flex-col gap-2 md:gap-2"
                    >
                      <div className="h-12 md:h-12 flex items-center gap-2 rounded-lg border p-2 border-gray-300">
                        <RadioGroupItem value="yes" id="tutor-yes" />
                        <Label
                          htmlFor="tutor-yes"
                          className="font-normal cursor-pointer"
                        >
                          Informar tutor agora
                        </Label>
                      </div>
                      <div className="h-12 md:h-12 flex items-center gap-2 rounded-lg border p-4 border-gray-300">
                        <RadioGroupItem value="no" id="tutor-no" />
                        <Label
                          htmlFor="tutor-no"
                          className="font-normal cursor-pointer"
                        >
                          Não informar tutor (emergência ou abandono)
                        </Label>
                      </div>
                    </RadioGroup>
                  )}
                />
                {errors.tutor_choice && (
                  <p className="text-sm text-destructive">
                    {errors.tutor_choice.message}
                  </p>
                )}
              </div>

              {/* Conditional: tutor_id */}
              {watchedTutorChoice === "yes" && (
                <div className="space-y-1">
                  <Label>Selecione o tutor *</Label>
                  <Controller
                    name="tutor_id"
                    control={control}
                    rules={{ required: "Selecione um tutor" }}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                      >
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
                    <p className="text-sm text-destructive">
                      {errors.tutor_id.message}
                    </p>
                  )}
                </div>
              )}

              {/* Conditional: no_tutor_reason */}
              {watchedTutorChoice === "no" && (
                <div className="space-y-1">
                  <Label>Motivo *</Label>
                  <Controller
                    name="no_tutor_reason"
                    control={control}
                    rules={{ required: "Informe o motivo" }}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                      >
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
                    <p className="text-sm text-destructive">
                      {errors.no_tutor_reason.message}
                    </p>
                  )}
                </div>
              )}

              {/* Espécie + Raça */}
              <div className="grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-4 max-md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Espécie *</Label>
                  <Controller
                    name="species"
                    control={control}
                    rules={{ required: "Obrigatório" }}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(value) => {
                          field.onChange(value);
                          setValue("breed", "" as any);
                          setBreedOptions([]);
                          setBreedSearchValue("");
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
                    <p className="text-sm text-destructive">
                      {errors.species.message}
                    </p>
                  )}
                </div>

                {/* Raça com Combobox */}
                <div className="space-y-1">
                  <Label>Raça *</Label>
                  <Controller
                    name="breed"
                    control={control}
                    rules={{ required: "Obrigatório" }}
                    render={({ field }) => (
                      <Popover open={breedOpen} onOpenChange={setBreedOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            disabled={!watchedSpecies}
                            className="h-8 w-full justify-between font-normal sm:h-12"
                          >
                            <span className="truncate">
                              {field.value
                                ? field.value
                                : breedOptions.length
                                  ? "Selecione ou cadastre a raça"
                                  : "Selecione primeiro a espécie"}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-64 p-0 popover-responsive"
                          align="start"
                        >
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Buscar raça..."
                              value={breedSearchValue}
                              onValueChange={setBreedSearchValue}
                            />
                            <CommandList>
                              <CommandEmpty>
                                Nenhuma raça encontrada.
                              </CommandEmpty>
                              <CommandGroup>
                                {filteredBreeds.map((o) => (
                                  <CommandItem
                                    key={o.id}
                                    value={o.description}
                                    onSelect={(val) => {
                                      field.onChange(val);
                                      setBreedSearchValue("");
                                      setBreedOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        field.value === o.description
                                          ? "opacity-100"
                                          : "opacity-0"
                                      }`}
                                    />
                                    {o.description}
                                  </CommandItem>
                                ))}
                                {showAddBreed && (
                                  <CommandItem
                                    value={`__NEW__:${breedSearchValue.trim()}`}
                                    onSelect={() =>
                                      handleAddBreed(breedSearchValue.trim())
                                    }
                                  >
                                    <Plus className="mr-2 h-4 w-4" />+ Cadastrar
                                    &quot;{breedSearchValue.trim()}
                                    &quot;
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
                    <p className="text-sm text-destructive">
                      {errors.breed.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Idade, Peso, Sexo */}
              <div className="grid grid-cols-3 md:grid-cols-3 gap-4 md:gap-4 max-md:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="age">Idade (anos) *</Label>
                  <Controller
                    name="age"
                    control={control}
                    rules={{ required: "Obrigatório" }}
                    render={({ field }) => (
                      <Input
                        id="age"
                        type="number"
                        min={0}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                  {errors.age && (
                    <p className="text-sm text-destructive">
                      {errors.age.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="weight">Peso (kg) *</Label>
                  <Controller
                    name="weight"
                    control={control}
                    rules={{ required: "Obrigatório" }}
                    render={({ field }) => (
                      <Input
                        id="weight"
                        type="number"
                        min={0}
                        step={0.1}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                  {errors.weight && (
                    <p className="text-sm text-destructive">
                      {errors.weight.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Sexo *</Label>
                  <Controller
                    name="sex"
                    control={control}
                    rules={{ required: "Obrigatório" }}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                      >
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
                    <p className="text-sm text-destructive">
                      {errors.sex.message}
                    </p>
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
                    <Input
                      id="chip_number"
                      {...field}
                      value={field.value ?? ""}
                    />
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
                <Button type="submit">{editingId ? "Salvar" : "Criar"}</Button>
              </DialogFooter>
            </form>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
