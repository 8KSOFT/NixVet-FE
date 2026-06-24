'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import axios from 'axios';
import { Plus, Pencil, Trash2, Users, Search, Loader2 } from 'lucide-react';

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

import api from '@/lib/axios';
import { formatCepMask } from '@/lib/format-cep';
import { API_PAGE_SIZE, listQueryParams, parseListResponse } from '@/lib/pagination';
import { ListPagination } from '@/components/list-pagination';

interface Tutor {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  address: string;
  cep: string;
}

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

export default function OwnersPage() {
  const { t } = useTranslation('common');
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(false);
  const [listPage, setListPage] = useState(1);
  const [listTotal, setListTotal] = useState(0);
  const [listTotalPages, setListTotalPages] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<Tutor | null>(null);
  const [loadingCep, setLoadingCep] = useState(false);

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

  const fetchTutors = async () => {
    setLoading(true);
    try {
      const response = await api.get('/tutors', {
        params: listQueryParams(listPage),
      });
      const p = parseListResponse<Tutor>(response.data, listPage);
      setTutors(p.items);
      setListTotal(p.total);
      setListTotalPages(p.totalPages);
    } catch (error) {
      console.error('Error fetching tutors:', error);
      toast.error('Erro ao carregar tutores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTutors();
  }, [listPage]);

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
      await api.delete(`/tutors/${id}`);
      toast.success('Tutor removido com sucesso');
      fetchTutors();
    } catch (error) {
      console.error('Error deleting tutor:', error);
      toast.error('Erro ao remover tutor');
    }
  };

  const handleCepSearch = async () => {
    const cepValue = getValues('cep');
    if (!cepValue) return;

    const cep = cepValue.replace(/\D/g, '');
    if (cep.length !== 8) {
      toast.warning('CEP inválido');
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
        toast.error('CEP não encontrado');
        return;
      }
      const { logradouro, bairro, localidade, uf } = response.data;
      setValue('street', logradouro);
      setValue('neighborhood', bairro);
      setValue('city', localidade);
      setValue('state', uf);
    } catch (error) {
      console.error('Error fetching CEP:', error);
      toast.error('Erro ao buscar CEP');
    } finally {
      setLoadingCep(false);
    }
  };

  const onSubmit = async (values: TutorFormValues) => {
    try {
      const fullAddress = `${values.street}, ${values.number}${values.complement ? ` - ${values.complement}` : ''} - ${values.neighborhood} - ${values.city}/${values.state}`;
      const payload = {
        name: values.name,
        cpf: values.cpf,
        email: values.email,
        cep: values.cep,
        phone: values.phone,
        address: fullAddress,
      };

      if (editingId) {
        await api.put(`/tutors/${editingId}`, payload);
        toast.success('Tutor atualizado com sucesso');
      } else {
        await api.post('/tutors', payload);
        toast.success('Tutor criado com sucesso');
      }
      setModalVisible(false);
      setEditingId(null);
      setEditingRecord(null);
      fetchTutors();
    } catch (error) {
      console.error('Error saving tutor:', error);
      toast.error('Erro ao salvar tutor');
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
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4">
        <h1 className="text-2xl font-extrabold font-['InterDoFigma'] flex items-center gap-2">{t('owners.title')}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleAdd} className="bg-primary hover:bg-brand-deep/80">
            <Plus className="w-4 h-4 mr-2" /> {t('owners.createButton')}
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-gray-300 overflow-hidden">
        <Table>
          <TableHeader className="h-15">
            <TableRow className="border-b border-gray-300">
              <TableHead>{t('owners.table.name')}</TableHead>
              <TableHead>{t('owners.table.email')}</TableHead>
              <TableHead>{t('owners.table.phone')}</TableHead>
              <TableHead>{t('owners.table.cpf')}</TableHead>
              <TableHead>{t('owners.table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : tutors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {t('owners.empty')}
                </TableCell>
              </TableRow>
            ) : (
              tutors.map((tutor) => (
                <TableRow key={tutor.id} className="border-b border-gray-300">
                  <TableCell>{tutor.name}</TableCell>
                  <TableCell className="w-60">{tutor.email}</TableCell>
                  <TableCell className="w-60">{formatPhoneDisplay(tutor.phone)}</TableCell>
                  <TableCell className="w-60">{formatCpfDisplay(tutor.cpf)}</TableCell>
                  <TableCell className="w-40">
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
              ))
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

      <DashboardCreateFormDialog
        open={modalVisible}
        onOpenChange={(open) => {
          if (!open) {
            closeModal();
            return;
          }
          setModalVisible(open);
        }}
        title={editingId ? 'Editar Tutor' : 'Novo Tutor'}
        containerClassName="max-w-2xl mx-auto"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="owner-create-form"
              disabled={isSubmitting}
              className="bg-primary hover:bg-brand-deep/80"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        }
      >
        <form id="owner-create-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" {...register('name')} placeholder="Nome completo" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                {...register('cpf')}
                placeholder="000.000.000-00"
                onChange={(e) => {
                  const formatted = formatCpf(e.target.value);
                  setValue('cpf', formatted);
                }}
              />
              {errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="(00) 00000-0000"
                onChange={(e) => {
                  const formatted = formatPhone(e.target.value);
                  setValue('phone', formatted);
                }}
              />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" {...register('email')} placeholder="email@exemplo.com" />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 space-y-1">
              <Label htmlFor="cep">CEP *</Label>
              <div className="flex gap-2">
                <Input
                  id="cep"
                  {...register('cep')}
                  placeholder="00000-000"
                  disabled={loadingCep}
                  onChange={(e) => {
                    const formatted = formatCep(e.target.value);
                    setValue('cep', formatted);
                  }}
                />
                <Button type="button" variant="outline" size="icon" onClick={handleCepSearch} disabled={loadingCep}>
                  {loadingCep ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
              {errors.cep && <p className="text-sm text-destructive">{errors.cep.message}</p>}
            </div>

            <div className="col-span-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="street">Logradouro *</Label>
                  <Input id="street" {...register('street')} placeholder="Rua, Av, etc" />
                  {errors.street && <p className="text-sm text-destructive">{errors.street.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="number">Número *</Label>
                  <Input id="number" {...register('number')} placeholder="123" />
                  {errors.number && <p className="text-sm text-destructive">{errors.number.message}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="complement">Complemento</Label>
              <Input id="complement" {...register('complement')} placeholder="Apto 101" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="neighborhood">Bairro *</Label>
              <Input id="neighborhood" {...register('neighborhood')} />
              {errors.neighborhood && <p className="text-sm text-destructive">{errors.neighborhood.message}</p>}
            </div>
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="city">Cidade *</Label>
                <Input id="city" {...register('city')} />
                {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
              </div>
              <div className="w-16 space-y-1">
                <Label htmlFor="state">UF *</Label>
                <Input id="state" {...register('state')} maxLength={2} />
                {errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}
              </div>
            </div>
          </div>
        </form>
      </DashboardCreateFormDialog>
    </div>
  );
}
