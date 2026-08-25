'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import axios from 'axios';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Search, Loader2, ChevronDown, PawPrint } from 'lucide-react';

import { DashboardCreateFormDialog } from '@/components/dashboard-create-form-dialog';
import { Button } from '@/components/ui/button';
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

import { formatCepMask } from '@/lib/format-cep';
import { API_PAGE_SIZE } from '@/lib/pagination';
import { ListPagination } from '@/components/list-pagination';
import type { Tutor, TutorPayload } from '@/app/types/tutor';
import {
  useCreateTutorMutation,
  useDeleteTutorMutation,
  useTutorsQuery,
  useUpdateTutorMutation,
  tutorKeys,
} from '@/hooks/apiHooks/useTutors';
import { usePatientsListQuery } from '@/hooks/apiHooks/usePatients';
import { ProfilePhoto, ProfilePhotoUploader } from '@/components/shared/profile-photo';
import { cn } from '@/lib/utils';

const tutorSchema = z.object({
  name: z.string().min(1, 'Obrigatório'),
  cpf: z.string().min(1, 'Obrigatório'),
  phone: z.string().min(1, 'Obrigatório'),
  email: z.string().email('Email inválido'),
  cep: z.string().min(1, 'Obrigatório'),
  street: z.string().min(1, 'Obrigatório'),
  number: z.string().min(1, 'Obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, 'Obrigatório'),
  city: z.string().min(1, 'Obrigatório'),
  state: z.string().min(1, 'Obrigatório'),
});

type TutorFormValues = z.infer<typeof tutorSchema>;

const formatCpf = (value: string) => {
  const cleaned = value.replace(/\D/g, '').slice(0, 11);
  return cleaned
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const formatPhone = (value: string) => {
  const cleaned = value.replace(/\D/g, '').slice(0, 11);
  if (cleaned.length <= 10) {
    return cleaned.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return cleaned.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2');
};

const formatCep = (value: string) => {
  const cleaned = value.replace(/\D/g, '').slice(0, 8);
  return cleaned.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
};

const formatPhoneDisplay = (text: string) => {
  if (!text) return '';
  const cleaned = ('' + text).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
  if (match) return `(${match[1]}) ${match[2]}-${match[3]}`;
  const matchLand = cleaned.match(/^(\d{2})(\d{4})(\d{4})$/);
  if (matchLand) return `(${matchLand[1]}) ${matchLand[2]}-${matchLand[3]}`;
  return text;
};

const formatCpfDisplay = (text: string) => {
  if (!text) return '';
  const cleaned = ('' + text).replace(/\D/g, '');
  if (cleaned.length === 11) return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '***.$2.$3-**');
  return text;
};

/** Lista de pets de um responsável — só busca quando a sanfona é aberta (o componente só monta nesse momento). */
function OwnerPetsList({ tutorId }: { tutorId: string }) {
  const { t } = useTranslation('common');
  const { data: pets, isLoading } = usePatientsListQuery(tutorId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pets || pets.length === 0) {
    return <p className="py-2 text-sm text-slate-500">{t('owners.pets.empty')}</p>;
  }

  return (
    <ul className="divide-y divide-gray-200">
      {pets.map((pet) => (
        <li key={pet.id} className="flex items-center justify-between gap-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <ProfilePhoto url={pet.photo_url} name={pet.name} className="size-8 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{pet.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {pet.species}
                {pet.breed ? ` · ${pet.breed}` : ''}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="shrink-0" asChild>
            <Link href={`/medical-records/prontuario/${pet.id}`}>{t('owners.pets.viewRecord')}</Link>
          </Button>
        </li>
      ))}
    </ul>
  );
}

export default function OwnersPage() {
  const { t } = useTranslation('common');
  const [listPage, setListPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<Tutor | null>(null);
  const [loadingCep, setLoadingCep] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const togglePets = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<TutorFormValues>({
    resolver: zodResolver(tutorSchema),
  });

  const [somentePendentes, setSomentePendentes] = useState(false);
  const { data: tutorsPage, isLoading: loading } = useTutorsQuery(listPage, {
    incomplete: somentePendentes,
  });
  const tutors = tutorsPage?.items ?? [];
  const editingTutor = tutors.find((tu) => tu.id === editingId);
  const listTotal = tutorsPage?.total ?? 0;
  const listTotalPages = tutorsPage?.totalPages ?? 1;

  const createTutor = useCreateTutorMutation();
  const updateTutor = useUpdateTutorMutation();
  const deleteTutor = useDeleteTutorMutation();

  useEffect(() => {
    if (!modalVisible) return;

    if (!editingId || !editingRecord || editingRecord.id !== editingId) {
      reset({
        name: '',
        email: '',
        phone: '',
        cpf: '',
        cep: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
      });
      return;
    }

    const record = editingRecord;
    let street = record.address;
    let number = '';
    let complement = '';
    let neighborhood = '';
    let city = '';
    let state = '';

    const parts = record.address ? record.address.split(' - ') : [];

    if (parts.length >= 3) {
      const firstPart = parts[0].split(',');
      street = firstPart[0];
      number = firstPart[1] ? firstPart[1].trim() : '';

      if (parts.length >= 4) {
        complement = parts[1];
        neighborhood = parts[2];
        const cityState = parts[3].split('/');
        city = cityState[0];
        state = cityState[1] || '';
      } else {
        neighborhood = parts[1];
        const cityState = parts[2].split('/');
        city = cityState[0];
        state = cityState[1] || '';
      }
    }

    reset({
      name: record.name,
      email: record.email,
      phone: record.phone,
      cpf: record.cpf,
      cep: formatCepMask(record.cep),
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
    });
  }, [modalVisible, editingId, editingRecord, reset]);

  const handleAdd = () => {
    setEditingId(null);
    setEditingRecord(null);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTutor.mutateAsync(id);
    } catch (error) {
      console.error('Error deleting tutor:', error);
      toast.error(t('owners.deleteError'));
    }
  };

  const handleCepSearch = async () => {
    const cepValue = getValues('cep');
    if (!cepValue) return;

    const cep = cepValue.replace(/\D/g, '');
    if (cep.length !== 8) {
      toast.warning(t('owners.form.cepInvalid'));
      return;
    }

    setValue('street', '');
    setValue('neighborhood', '');
    setValue('city', '');
    setValue('state', '');

    setLoadingCep(true);
    try {
      const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
      if (response.data.erro) {
        toast.error(t('owners.form.cepNotFound'));
        return;
      }
      const { logradouro, bairro, localidade, uf } = response.data;
      setValue('street', logradouro);
      setValue('neighborhood', bairro);
      setValue('city', localidade);
      setValue('state', uf);
    } catch (error) {
      console.error('Error fetching CEP:', error);
      toast.error(t('owners.form.cepFetchError'));
    } finally {
      setLoadingCep(false);
    }
  };

  const onSubmit = async (values: TutorFormValues) => {
    try {
      const fullAddress = `${values.street}, ${values.number}${values.complement ? ` - ${values.complement}` : ''} - ${values.neighborhood} - ${values.city}/${values.state}`;
      const payload: TutorPayload = {
        name: values.name,
        cpf: values.cpf,
        email: values.email,
        cep: values.cep,
        phone: values.phone,
        address: fullAddress,
      };

      if (editingId) {
        await updateTutor.mutateAsync({ id: editingId, payload });
      } else {
        await createTutor.mutateAsync(payload);
      }
      setModalVisible(false);
      setEditingId(null);
      setEditingRecord(null);
    } catch (error) {
      console.error('Error saving tutor:', error);
      toast.error(t('owners.saveError'));
    }
  };

  const handleEdit = (record: Tutor) => {
    setEditingId(record.id);
    setEditingRecord(record);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setEditingRecord(null);
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-8">
        <h1 className="text-2xl font-extrabold flex items-center gap-2">{t('owners.title')}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-gray-300 bg-white p-0.5">
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={!somentePendentes}
              className={!somentePendentes ? 'bg-slate-100 font-semibold' : 'text-slate-500'}
              onClick={() => {
                setSomentePendentes(false);
                setListPage(1);
              }}
            >
              {t('owners.pendingAll')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={somentePendentes}
              title={t('owners.pendingHint')}
              className={somentePendentes ? 'bg-amber-100 font-semibold text-amber-900' : 'text-slate-500'}
              onClick={() => {
                // Volta para a primeira página: a página 3 da lista completa
                // quase nunca existe na lista filtrada, e cairia em "vazio".
                setSomentePendentes(true);
                setListPage(1);
              }}
            >
              {t('owners.pendingFilter')}
            </Button>
          </div>
          <Button onClick={handleAdd} className="w-full bg-primary hover:bg-brand-deep/80 sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> {t('owners.createButton')}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-gray-300 bg-white py-8 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tutors.length === 0 ? (
        <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
          {somentePendentes ? t('owners.pendingEmpty') : t('owners.empty')}
        </div>
      ) : (
        <>
          {/* Desktop / tablet: tabela */}
          <div className="hidden overflow-x-auto rounded-lg border border-gray-300 md:block">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-15">
                  <TableHead>{t('owners.table.name')}</TableHead>
                  <TableHead>{t('owners.table.email')}</TableHead>
                  <TableHead>{t('owners.table.phone')}</TableHead>
                  <TableHead>{t('owners.table.cpf')}</TableHead>
                  <TableHead>{t('owners.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tutors.map((tutor) => {
                  const expanded = expandedIds.has(tutor.id);
                  return (
                  <React.Fragment key={tutor.id}>
                  <TableRow
                    className="border-b border-gray-300 h-15 cursor-pointer"
                    onClick={() => togglePets(tutor.id)}
                    aria-expanded={expanded}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePets(tutor.id);
                          }}
                          aria-expanded={expanded}
                          aria-label={t('owners.pets.toggleAria', { name: tutor.name })}
                          className="shrink-0 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
                        </button>
                        <ProfilePhoto url={tutor.photo_url} name={tutor.name} className="size-8" />
                        <span>{tutor.name}</span>
                        {tutor.incomplete_profile && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                            {t('owners.pendingBadge')}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{tutor.email}</TableCell>
                    <TableCell>{formatPhoneDisplay(tutor.phone)}</TableCell>
                    <TableCell>{formatCpfDisplay(tutor.cpf)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="p-0" onClick={() => handleEdit(tutor)}>
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
                              <AlertDialogTitle>{t('owners.confirmDeleteTitle')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('owners.confirmDeleteDescription', {
                                  name: tutor.name,
                                })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('owners.cancel')}</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={() => handleDelete(tutor.id)}
                              >
                                {t('owners.remove')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expanded && (
                    <TableRow className="border-b border-gray-300 bg-slate-50 hover:bg-slate-50">
                      <TableCell colSpan={5} className="py-3">
                        <div className="flex items-center gap-1.5 pb-1 text-xs font-medium text-slate-500">
                          <PawPrint className="h-3.5 w-3.5" />
                          {t('owners.pets.sectionTitle', { name: tutor.name })}
                        </div>
                        <OwnerPetsList tutorId={tutor.id} />
                      </TableCell>
                    </TableRow>
                  )}
                  </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {tutors.map((tutor) => {
              const expanded = expandedIds.has(tutor.id);
              return (
              <div
                key={tutor.id}
                className="cursor-pointer rounded-lg border border-gray-300 bg-white p-4"
                onClick={() => togglePets(tutor.id)}
                aria-expanded={expanded}
              >
                <div className="flex items-center gap-2">
                  <ProfilePhoto url={tutor.photo_url} name={tutor.name} className="size-9 shrink-0" />
                  <p className="truncate font-medium">{tutor.name}</p>
                  {tutor.incomplete_profile && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                      {t('owners.pendingBadge')}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePets(tutor.id);
                    }}
                    aria-expanded={expanded}
                    aria-label={t('owners.pets.toggleAria', { name: tutor.name })}
                    className="ml-auto shrink-0 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">{t('owners.table.email')}</p>
                    <p className="truncate">{tutor.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('owners.table.phone')}</p>
                    <p>{formatPhoneDisplay(tutor.phone)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('owners.table.cpf')}</p>
                    <p>{formatCpfDisplay(tutor.cpf)}</p>
                  </div>
                </div>

                {expanded && (
                  <div className="mt-3 border-t border-gray-200 pt-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5 pb-1 text-xs font-medium text-slate-500">
                      <PawPrint className="h-3.5 w-3.5" />
                      {t('owners.pets.sectionTitle', { name: tutor.name })}
                    </div>
                    <OwnerPetsList tutorId={tutor.id} />
                  </div>
                )}

                <div
                  className="mt-3 flex items-center justify-end gap-1 border-t border-gray-200 pt-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button variant="ghost" size="icon" className="p-0" onClick={() => handleEdit(tutor)}>
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
                        <AlertDialogTitle>{t('owners.confirmDeleteTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('owners.confirmDeleteDescription', {
                            name: tutor.name,
                          })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('owners.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={() => handleDelete(tutor.id)}
                        >
                          {t('owners.remove')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              );
            })}
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

      <DashboardCreateFormDialog
        open={modalVisible}
        onOpenChange={(open) => {
          if (!open) {
            closeModal();
            return;
          }
          setModalVisible(open);
        }}
        title={editingId ? t('owners.dialog.editTitle') : t('owners.dialog.createTitle')}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeModal}>
              {t('owners.cancel')}
            </Button>
            <Button
              type="submit"
              form="owner-create-form"
              disabled={isSubmitting}
              className="bg-primary hover:bg-brand-deep/80"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? t('owners.dialog.save') : t('owners.dialog.create')}
            </Button>
          </div>
        }
      >
        <form id="owner-create-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
          {/* Só em edição: a foto precisa de um cadastro já criado para ter onde morar. */}
          {editingId ? (
            <ProfilePhotoUploader
              target={`/tutors/${editingId}`}
              invalidate={[tutorKeys.all]}
              label="foto"
              url={editingTutor?.photo_url}
              name={editingTutor?.name}
            />
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="name">{t('owners.form.nameLabel')}</Label>
            <Input id="name" {...register('name')} placeholder={t('owners.form.namePlaceholder')} />
            {errors.name && <p className="text-sm text-destructive">{t('owners.form.requiredField')}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="cpf">{t('owners.form.cpfLabel')}</Label>
              <Input
                id="cpf"
                {...register('cpf')}
                placeholder={t('owners.form.cpfPlaceholder')}
                onChange={(e) => {
                  const formatted = formatCpf(e.target.value);
                  setValue('cpf', formatted);
                }}
              />
              {errors.cpf && <p className="text-sm text-destructive">{t('owners.form.requiredField')}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">{t('owners.form.phoneLabel')}</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder={t('owners.form.phonePlaceholder')}
                onChange={(e) => {
                  const formatted = formatPhone(e.target.value);
                  setValue('phone', formatted);
                }}
              />
              {errors.phone && <p className="text-sm text-destructive">{t('owners.form.requiredField')}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('owners.form.emailLabel')}</Label>
            <Input id="email" type="email" {...register('email')} placeholder={t('owners.form.emailPlaceholder')} />
            {errors.email && <p className="text-sm text-destructive">{t('owners.form.emailInvalid')}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="cep">{t('owners.form.cepLabel')}</Label>
              <div className="flex gap-2">
                <Input
                  id="cep"
                  {...register('cep')}
                  placeholder={t('owners.form.cepPlaceholder')}
                  disabled={loadingCep}
                  onChange={(e) => {
                    const formatted = formatCep(e.target.value);
                    setValue('cep', formatted);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={handleCepSearch}
                  disabled={loadingCep}
                >
                  {loadingCep ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
              {errors.cep && <p className="text-sm text-destructive">{t('owners.form.requiredField')}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="city">{t('owners.form.cityLabel')}</Label>
              <Input id="city" {...register('city')} />
              {errors.city && <p className="text-sm text-destructive">{t('owners.form.requiredField')}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="street">{t('owners.form.streetLabel')}</Label>
            <Input id="street" {...register('street')} placeholder={t('owners.form.streetPlaceholder')} />
            {errors.street && <p className="text-sm text-destructive">{t('owners.form.requiredField')}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="number">{t('owners.form.numberLabel')}</Label>
              <Input id="number" {...register('number')} placeholder={t('owners.form.numberPlaceholder')} />
              {errors.number && <p className="text-sm text-destructive">{t('owners.form.requiredField')}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="state">{t('owners.form.stateLabel')}</Label>
              <Input id="state" {...register('state')} placeholder={t('owners.form.statePlaceholder')} maxLength={2} />
              {errors.state && <p className="text-sm text-destructive">{t('owners.form.requiredField')}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="complement">{t('owners.form.complementLabel')}</Label>
              <Input id="complement" {...register('complement')} placeholder={t('owners.form.complementPlaceholder')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="neighborhood">{t('owners.form.neighborhoodLabel')}</Label>
              <Input id="neighborhood" {...register('neighborhood')} />
              {errors.neighborhood && <p className="text-sm text-destructive">{t('owners.form.requiredField')}</p>}
            </div>
          </div>
        </form>
      </DashboardCreateFormDialog>
    </div>
  );
}
