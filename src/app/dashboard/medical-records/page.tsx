"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardCreateFormDialog } from "@/components/dashboard-create-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Search,
  UserPlus,
  PawPrint,
  ChevronRight,
} from "lucide-react";
import api from "@/lib/axios";
import { fetchAllListPages } from "@/lib/pagination";
import dayjs from "dayjs";

interface Patient {
  id: string;
  name: string;
  species?: string;
  breed?: string;
  tutor_id?: string | null;
  tutor?: { id: string; name: string } | null;
}
interface Tutor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}
interface Vet {
  id: string;
  name: string;
}
interface MedicalRecord {
  id: string;
  patient_id: string;
  veterinarian_id: string | null;
  record_type: string;
  record_date: string;
  chief_complaint: string | null;
  diagnosis: string | null;
  status: string;
  patient?: Patient;
  veterinarian?: Vet;
  created_at: string;
}

const emptyForm = () => ({
  patient_id: "",
  veterinarian_id: "",
  record_type: "atendimento",
  record_date: dayjs().format("YYYY-MM-DD"),
  chief_complaint: "",
});

const emptyTutor = () => ({
  name: "",
  cpf: "",
  phone: "",
  email: "",
  cep: "",
  street: "",
  number: "",
});
const emptyPatient = () => ({
  name: "",
  species: "Canino",
  breed: "",
  sex: "M",
  age: "0",
  weight: "0",
  tutor_id: "" as string | "_none",
});

export default function MedicalRecordsListPage() {
  const router = useRouter();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [vets, setVets] = useState<Vet[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState(emptyForm());

  const [tutorModal, setTutorModal] = useState(false);
  const [tutorForm, setTutorForm] = useState(emptyTutor());
  const [tutorSaving, setTutorSaving] = useState(false);

  const [patientModal, setPatientModal] = useState(false);
  const [patientForm, setPatientForm] = useState(emptyPatient());
  const [patientSaving, setPatientSaving] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const all = await fetchAllListPages<MedicalRecord>("/medical-records");
      setRecords(all);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const all = await fetchAllListPages<Patient>("/patients");
      setPatients(all);
    } catch {
      setPatients([]);
    }
  };
  const fetchTutors = async () => {
    try {
      const all = await fetchAllListPages<Tutor>("/tutors");
      setTutors(all);
    } catch {
      setTutors([]);
    }
  };
  const fetchVets = async () => {
    try {
      const all = await fetchAllListPages<Vet>("/users/veterinarians");
      setVets(all);
    } catch {
      setVets([]);
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchTutors();
    fetchVets();
    fetchRecords();
  }, []);

  const handleCreate = async () => {
    if (!form.patient_id) {
      toast.error("Selecione ou cadastre um paciente");
      return;
    }
    try {
      const res = await api.post<MedicalRecord>("/medical-records", form);
      toast.success("Ficha criada");
      setModalVisible(false);
      router.push(`/dashboard/medical-records/${res.data.id}`);
    } catch {
      toast.error("Erro ao criar ficha");
    }
  };

  const handleCreateTutor = async () => {
    if (
      !tutorForm.name ||
      !tutorForm.cpf ||
      !tutorForm.phone ||
      !tutorForm.email ||
      !tutorForm.cep
    ) {
      toast.error("Preencha nome, CPF, telefone, email e CEP");
      return;
    }
    setTutorSaving(true);
    try {
      const res = await api.post<Tutor>("/tutors", tutorForm);
      toast.success("Responsável cadastrado");
      await fetchTutors();
      setTutorModal(false);
      setTutorForm(emptyTutor());
      setPatientForm((p) => ({ ...p, tutor_id: res.data.id }));
      if (!patientModal) setPatientModal(true);
    } catch {
      toast.error("Erro ao cadastrar responsável");
    } finally {
      setTutorSaving(false);
    }
  };

  const handleCreatePatient = async () => {
    if (!patientForm.name || !patientForm.species || !patientForm.breed) {
      toast.error("Preencha nome, espécie e raça");
      return;
    }
    setPatientSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: patientForm.name,
        species: patientForm.species,
        breed: patientForm.breed,
        sex: patientForm.sex,
        age: Number(patientForm.age) || 0,
        weight: Number(patientForm.weight) || 0,
      };
      if (patientForm.tutor_id && patientForm.tutor_id !== "_none") {
        payload.tutor_id = patientForm.tutor_id;
      } else {
        payload.no_tutor_reason = "EMERGENCIA";
      }
      const res = await api.post<Patient>("/patients", payload);
      toast.success("Animal cadastrado");
      await fetchPatients();
      setForm((p) => ({ ...p, patient_id: res.data.id }));
      setPatientModal(false);
      setPatientForm(emptyPatient());
    } catch {
      toast.error("Erro ao cadastrar animal");
    } finally {
      setPatientSaving(false);
    }
  };

  // Um prontuário por animal: agrega as fichas (medical-records) por paciente.
  const prontuarios = useMemo(() => {
    const stats = new Map<string, { count: number; lastDate: string | null; lastComplaint: string | null }>();
    for (const r of records) {
      const s = stats.get(r.patient_id) ?? { count: 0, lastDate: null, lastComplaint: null };
      s.count += 1;
      if (!s.lastDate || r.record_date > s.lastDate) {
        s.lastDate = r.record_date;
        s.lastComplaint = r.chief_complaint ?? null;
      }
      stats.set(r.patient_id, s);
    }

    const rows = patients.map((p) => {
      const s = stats.get(p.id);
      return {
        patient: p,
        count: s?.count ?? 0,
        lastDate: s?.lastDate ?? null,
        lastComplaint: s?.lastComplaint ?? null,
      };
    });

    const q = search.trim().toLowerCase();
    const visible = q
      ? rows.filter(
          (row) =>
            row.patient.name.toLowerCase().includes(q) ||
            (row.patient.tutor?.name || "").toLowerCase().includes(q) ||
            (row.patient.species || "").toLowerCase().includes(q) ||
            (row.patient.breed || "").toLowerCase().includes(q),
        )
      : rows;

    // Prontuários com atendimento mais recente primeiro; sem fichas ao final (por nome).
    return visible.sort((a, b) => {
      if (a.lastDate && b.lastDate) return a.lastDate < b.lastDate ? 1 : a.lastDate > b.lastDate ? -1 : 0;
      if (a.lastDate) return -1;
      if (b.lastDate) return 1;
      return a.patient.name.localeCompare(b.patient.name);
    });
  }, [records, patients, search]);

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-8">
        <h1 className="text-2xl font-extrabold font-['InterDoFigma'] flex items-center gap-2">
          Prontuário
        </h1>
        <Button
          onClick={() => {
            setForm(emptyForm());
            setModalVisible(true);
          }}
          className="bg-primary hover:bg-primary/70"
        >
          <Plus className="h-4 w-4 mr-1" /> Nova ficha
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-50 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7" />
          <Input
            placeholder="Buscar por animal, tutor, espécie..."
            className="pl-12 rounded-full h-15! placeholder:text-black/80"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-transparent border-none shadow-none">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/60" />
          </div>
        ) : prontuarios.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum prontuário encontrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {prontuarios.map(({ patient, count, lastDate, lastComplaint }) => (
              <button
                key={patient.id}
                type="button"
                onClick={() =>
                  router.push(`/dashboard/medical-records/prontuario/${patient.id}`)
                }
                className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-primary/50 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <PawPrint className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold text-slate-900">
                      {patient.name}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {[patient.species, patient.breed].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {count} ficha{count === 1 ? "" : "s"}
                  </Badge>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="truncate">
                    <span className="font-medium">Tutor:</span>{" "}
                    {patient.tutor?.name || "—"}
                  </div>
                  <div>
                    <span className="font-medium">Último atendimento:</span>{" "}
                    {lastDate ? dayjs(lastDate).format("DD/MM/YYYY") : "Nenhum"}
                  </div>
                  {lastComplaint && (
                    <div className="truncate">
                      <span className="font-medium">Queixa:</span> {lastComplaint}
                    </div>
                  )}
                </div>

                <span className="mt-auto flex items-center gap-1 text-xs font-medium text-primary">
                  Abrir prontuário
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Nova ficha */}
      <DashboardCreateFormDialog
        open={modalVisible}
        onOpenChange={setModalVisible}
        title="Nova ficha"
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
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Paciente *</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select
                  value={form.patient_id}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, patient_id: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        patients.length
                          ? "Selecione"
                          : "Nenhum animal cadastrado"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.species ? `(${p.species})` : ""}
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
              >
                <PawPrint className="h-4 w-4 mr-1" /> Novo animal
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Sem responsável cadastrado? Use o botão <strong>Novo animal</strong> e
              clique em <strong>+ Novo responsável</strong> dentro dele — ou deixe sem
              responsável (emergência).
            </p>
          </div>

          <div className="space-y-1">
            <Label>Veterinário</Label>
            <Select
              value={form.veterinarian_id || "_none"}
              onValueChange={(v) =>
                setForm((p) => ({
                  ...p,
                  veterinarian_id: v === "_none" ? "" : v,
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select
                value={form.record_type}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, record_type: v }))
                }
              >
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
                onChange={(e) =>
                  setForm((p) => ({ ...p, record_date: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Queixa principal</Label>
            <Textarea
              rows={2}
              value={form.chief_complaint}
              onChange={(e) =>
                setForm((p) => ({ ...p, chief_complaint: e.target.value }))
              }
              placeholder="Descreva a queixa do responsável..."
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
            <Button
              onClick={handleCreatePatient}
              disabled={patientSaving}
              className="bg-primary"
            >
              {patientSaving && (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              )}{" "}
              Salvar animal
            </Button>
          </div>
        }
      >
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Responsável</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select
                  value={patientForm.tutor_id || "_none"}
                  onValueChange={(v) =>
                    setPatientForm((p) => ({
                      ...p,
                      tutor_id: v === "_none" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        tutors.length ? "Selecione" : "Nenhum responsável cadastrado"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">
                      Sem responsável (emergência)
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
                type="button"
                variant="outline"
                onClick={() => {
                  setTutorForm(emptyTutor());
                  setTutorModal(true);
                }}
                title="Cadastrar novo responsável"
              >
                <UserPlus className="h-4 w-4 mr-1" /> Novo responsável
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input
                value={patientForm.name}
                onChange={(e) =>
                  setPatientForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Sexo</Label>
              <Select
                value={patientForm.sex}
                onValueChange={(v) => setPatientForm((p) => ({ ...p, sex: v }))}
              >
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Espécie *</Label>
              <Input
                value={patientForm.species}
                onChange={(e) =>
                  setPatientForm((p) => ({ ...p, species: e.target.value }))
                }
                placeholder="Canino, Felino..."
              />
            </div>
            <div className="space-y-1">
              <Label>Raça *</Label>
              <Input
                value={patientForm.breed}
                onChange={(e) =>
                  setPatientForm((p) => ({ ...p, breed: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Idade (anos)</Label>
              <Input
                type="number"
                step="0.1"
                value={patientForm.age}
                onChange={(e) =>
                  setPatientForm((p) => ({ ...p, age: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Peso (kg)</Label>
              <Input
                type="number"
                step="0.1"
                value={patientForm.weight}
                onChange={(e) =>
                  setPatientForm((p) => ({ ...p, weight: e.target.value }))
                }
              />
            </div>
          </div>
        </div>
      </DashboardCreateFormDialog>

      {/* Novo Tutor inline */}
      <DashboardCreateFormDialog
        open={tutorModal}
        onOpenChange={setTutorModal}
        title="Cadastrar novo responsável"
        containerClassName="max-w-lg mx-auto"
        preventOutsideClose
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setTutorModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateTutor}
              disabled={tutorSaving}
              className="bg-primary"
            >
              {tutorSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}{" "}
              Salvar responsável
            </Button>
          </div>
        }
      >
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input
                value={tutorForm.name}
                onChange={(e) =>
                  setTutorForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>CPF *</Label>
              <Input
                value={tutorForm.cpf}
                onChange={(e) =>
                  setTutorForm((p) => ({ ...p, cpf: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Telefone *</Label>
              <Input
                value={tutorForm.phone}
                onChange={(e) =>
                  setTutorForm((p) => ({ ...p, phone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input
                type="email"
                value={tutorForm.email}
                onChange={(e) =>
                  setTutorForm((p) => ({ ...p, email: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>CEP *</Label>
              <Input
                value={tutorForm.cep}
                onChange={(e) =>
                  setTutorForm((p) => ({ ...p, cep: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Rua</Label>
              <Input
                value={tutorForm.street}
                onChange={(e) =>
                  setTutorForm((p) => ({ ...p, street: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Número</Label>
            <Input
              value={tutorForm.number}
              onChange={(e) =>
                setTutorForm((p) => ({ ...p, number: e.target.value }))
              }
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Cadastro rápido — campos de endereço completos podem ser preenchidos
            depois em <strong>Responsáveis</strong>.
          </p>
        </div>
      </DashboardCreateFormDialog>
    </div>
  );
}
