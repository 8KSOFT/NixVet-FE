'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, KeyRound, Plus, Settings2, Save, MessageCircle } from 'lucide-react';
import api from '@/lib/axios';
import { API_PAGE_SIZE, listQueryParams, parseListResponse } from '@/lib/pagination';
import { ListPagination } from '@/components/list-pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { getStoredUserRole } from '@/lib/role-permissions';

type ClinicRow = {
  id: string;
  name: string;
  code: string;
  email: string | null;
  phone: string | null;
  whatsapp_ai_chatbot_enabled: boolean;
  ai_platform_enabled: boolean;
  billing_plan: string | null;
  admin_email: string | null;
  admin_name: string | null;
};

const PLAN_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'basic', label: 'Basic' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
];

const emptyCreate = () => ({
  name: '',
  code: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
  whatsapp_ai_chatbot_enabled: false,
  ai_platform_enabled: false,
  billing_plan: 'basic',
});

export default function SuperadminClinicsPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [rows, setRows] = useState<ClinicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listPage, setListPage] = useState(1);
  const [listTotal, setListTotal] = useState(0);
  const [listTotalPages, setListTotalPages] = useState(1);

  const [resetTenantId, setResetTenantId] = useState<string | null>(null);
  const [resetClinicName, setResetClinicName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreate());
  const [creating, setCreating] = useState(false);

  const [editRow, setEditRow] = useState<ClinicRow | null>(null);
  const [editForm, setEditForm] = useState<Partial<ClinicRow>>({});
  const [editing, setEditing] = useState(false);

  // WhatsApp provisioning
  const [whatsappTenantId, setWhatsappTenantId] = useState<string | null>(null);
  const [whatsappClinicName, setWhatsappClinicName] = useState('');
  const [whatsappProvisioning, setWhatsappProvisioning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/superadmin/tenants', { params: listQueryParams(listPage) });
      const p = parseListResponse<ClinicRow>(data, listPage);
      setRows(p.items);
      setListTotal(p.total);
      setListTotalPages(p.totalPages);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      if (err.response?.status === 403) {
        toast.error('Apenas superadmin pode acessar. Faça logout e entre com uma conta superadmin.');
        router.replace('/dashboard');
        return;
      }
      toast.error('Falha ao carregar clínicas');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [router, listPage]);

  useEffect(() => {
    const role = getStoredUserRole();
    if (role !== 'superadmin') {
      toast.error(`Você está logado como "${role ?? 'desconhecido'}". Faça logout e logue como superadmin.`);
      router.replace('/dashboard');
      return;
    }
    void load();
  }, [load, router]);

  const openReset = (row: ClinicRow) => {
    setResetTenantId(row.id);
    setResetClinicName(row.name);
    setNewPassword('');
  };

  const submitReset = async () => {
    if (!resetTenantId || newPassword.trim().length < 8) {
      toast.error('Senha precisa ter no mínimo 8 caracteres');
      return;
    }
    setResetting(true);
    try {
      await api.post(`/superadmin/tenants/${resetTenantId}/reset-admin-password`, {
        newPassword: newPassword.trim(),
      });
      toast.success('Senha do admin redefinida');
      setResetTenantId(null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string | string[] } } };
      const msg = err.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(' | ') : (msg as string) || 'Erro';
      toast.error(text);
    } finally {
      setResetting(false);
    }
  };

  const submitCreate = async () => {
    if (!createForm.name.trim() || !createForm.code.trim()) {
      toast.error('Informe nome e código');
      return;
    }
    setCreating(true);
    try {
      await api.post('/superadmin/tenants', {
        ...createForm,
        name: createForm.name.trim(),
        code: createForm.code.trim().toLowerCase(),
        adminEmail: createForm.adminEmail.trim().toLowerCase() || undefined,
        adminPassword: createForm.adminPassword || undefined,
        adminName: createForm.adminName.trim() || undefined,
      });
      toast.success('Clínica criada');
      setCreateOpen(false);
      setCreateForm(emptyCreate());
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string | string[] } } };
      const msg = err.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(' | ') : (msg as string) || 'Erro ao criar';
      toast.error(text);
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (row: ClinicRow) => {
    setEditRow(row);
    setEditForm({
      name: row.name,
      email: row.email,
      phone: row.phone,
      whatsapp_ai_chatbot_enabled: row.whatsapp_ai_chatbot_enabled,
      ai_platform_enabled: row.ai_platform_enabled,
      billing_plan: row.billing_plan ?? 'basic',
    });
  };

  const submitEdit = async () => {
    if (!editRow) return;
    setEditing(true);
    try {
      await api.patch(`/superadmin/tenants/${editRow.id}`, editForm);
      toast.success('Clínica atualizada');
      setEditRow(null);
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string | string[] } } };
      const msg = err.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(' | ') : (msg as string) || 'Erro';
      toast.error(text);
    } finally {
      setEditing(false);
    }
  };

  const submitProvisionWhatsapp = async () => {
    if (!whatsappTenantId) return;
    setWhatsappProvisioning(true);
    try {
      await api.post('/whatsapp/provision', {
        tenantId: whatsappTenantId,
        instanceName: `NixVet - ${whatsappClinicName}`,
      });
      toast.success(`Instância Z-API provisionada para ${whatsappClinicName}. A clínica pode escanear o QR Code em Configurações → WhatsApp.`);
      setWhatsappTenantId(null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string | string[] } } };
      const msg = err.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(' | ') : (msg as string) || 'Erro ao provisionar';
      toast.error(text);
    } finally {
      setWhatsappProvisioning(false);
    }
  };

  const quickToggle = async (row: ClinicRow, field: 'whatsapp_ai_chatbot_enabled' | 'ai_platform_enabled', value: boolean) => {
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, [field]: value } : r)));
    try {
      await api.patch(`/superadmin/tenants/${row.id}`, { [field]: value });
    } catch {
      toast.error('Falha ao atualizar — recarregue');
      await load();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Clínicas (global)</h1>
          <p className="text-muted-foreground mt-1">Painel exclusivo do superadmin — crie, edite e gerencie os tenants.</p>
        </div>
        <Button className="bg-primary" onClick={() => { setCreateForm(emptyCreate()); setCreateOpen(true); }}>
          <Plus className="size-4 mr-1" /> Nova clínica
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <Loader2 className="size-5 animate-spin" /> Carregando...
          </div>
        ) : (
          <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clínica</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Chatbot WhatsApp</TableHead>
                <TableHead>Plataforma IA</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    Nenhuma clínica cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground">{row.email ?? ''} {row.phone ? `· ${row.phone}` : ''}</div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{row.code}</TableCell>
                    <TableCell className="text-sm">
                      <div>{row.admin_name ?? '—'}</div>
                      <div className="text-muted-foreground text-xs">{row.admin_email ?? ''}</div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={row.whatsapp_ai_chatbot_enabled}
                        onCheckedChange={(v) => quickToggle(row, 'whatsapp_ai_chatbot_enabled', v)}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={row.ai_platform_enabled}
                        onCheckedChange={(v) => quickToggle(row, 'ai_platform_enabled', v)}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {row.billing_plan?.trim() || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => openEdit(row)}>
                        <Settings2 className="size-3.5" /> Editar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => openReset(row)}
                        disabled={!row.admin_email}
                      >
                        <KeyRound className="size-3.5" /> Senha
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1 text-green-700 border-green-200 hover:bg-green-50"
                        title="Provisionar WhatsApp (Z-API)"
                        onClick={() => { setWhatsappTenantId(row.id); setWhatsappClinicName(row.name); }}
                      >
                        <MessageCircle className="size-3.5" /> WhatsApp
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <ListPagination
            page={listPage}
            totalPages={listTotalPages}
            total={listTotal}
            pageSize={API_PAGE_SIZE}
            onPageChange={setListPage}
            disabled={loading}
          />
          </>
        )}
      </div>

      {/* Reset password */}
      <Dialog open={Boolean(resetTenantId)} onOpenChange={(o) => !o && setResetTenantId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Redefinir senha do admin</DialogTitle>
            <DialogDescription>Clínica: <strong>{resetClinicName}</strong></DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="new-admin-pw">Nova senha</Label>
            <Input
              id="new-admin-pw"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setResetTenantId(null)}>Cancelar</Button>
            <Button type="button" onClick={() => void submitReset()} disabled={resetting}>
              {resetting && <Loader2 className="size-4 animate-spin mr-1" />} Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create clinic */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova clínica</DialogTitle>
            <DialogDescription>Cria o tenant e, opcionalmente, o primeiro administrador.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Código *</Label>
              <Input value={createForm.code} onChange={(e) => setCreateForm((p) => ({ ...p, code: e.target.value.toLowerCase() }))} placeholder="ex: vetazul" />
            </div>
            <div className="space-y-1 col-span-2 border-t pt-3 mt-1">
              <p className="text-xs text-muted-foreground">Admin inicial (opcional)</p>
            </div>
            <div className="space-y-1">
              <Label>Nome do admin</Label>
              <Input value={createForm.adminName} onChange={(e) => setCreateForm((p) => ({ ...p, adminName: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Email do admin</Label>
              <Input type="email" value={createForm.adminEmail} onChange={(e) => setCreateForm((p) => ({ ...p, adminEmail: e.target.value }))} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Senha (mín 8)</Label>
              <Input type="password" value={createForm.adminPassword} onChange={(e) => setCreateForm((p) => ({ ...p, adminPassword: e.target.value }))} />
            </div>
            <div className="space-y-1 col-span-2 border-t pt-3 mt-1">
              <p className="text-xs text-muted-foreground">Plano & recursos</p>
            </div>
            <div className="space-y-1">
              <Label>Plano</Label>
              <Select value={createForm.billing_plan} onValueChange={(v) => setCreateForm((p) => ({ ...p, billing_plan: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLAN_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={createForm.whatsapp_ai_chatbot_enabled}
                  onCheckedChange={(v) => setCreateForm((p) => ({ ...p, whatsapp_ai_chatbot_enabled: v }))}
                />
                Chatbot WhatsApp
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={createForm.ai_platform_enabled}
                  onCheckedChange={(v) => setCreateForm((p) => ({ ...p, ai_platform_enabled: v }))}
                />
                Plataforma IA
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button className="bg-primary" onClick={() => void submitCreate()} disabled={creating}>
              {creating && <Loader2 className="size-4 animate-spin mr-1" />} Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit clinic */}
      <Dialog open={Boolean(editRow)} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar clínica</DialogTitle>
            <DialogDescription>{editRow?.name} — <span className="font-mono text-xs">{editRow?.code}</span></DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1 col-span-2">
              <Label>Nome</Label>
              <Input value={(editForm.name as string) ?? ''} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={(editForm.email as string) ?? ''} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input value={(editForm.phone as string) ?? ''} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Plano</Label>
              <Select
                value={(editForm.billing_plan as string) || 'basic'}
                onValueChange={(v) => setEditForm((p) => ({ ...p, billing_plan: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLAN_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 pt-5">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={Boolean(editForm.whatsapp_ai_chatbot_enabled)}
                  onCheckedChange={(v) => setEditForm((p) => ({ ...p, whatsapp_ai_chatbot_enabled: v }))}
                />
                Chatbot WhatsApp
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={Boolean(editForm.ai_platform_enabled)}
                  onCheckedChange={(v) => setEditForm((p) => ({ ...p, ai_platform_enabled: v }))}
                />
                Plataforma IA
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditRow(null)}>Cancelar</Button>
            <Button className="bg-primary" onClick={() => void submitEdit()} disabled={editing}>
              {editing ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp provisioning */}
      <Dialog open={Boolean(whatsappTenantId)} onOpenChange={(o) => !o && setWhatsappTenantId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="size-5 text-green-600" /> Provisionar WhatsApp
            </DialogTitle>
            <DialogDescription>
              Cria uma instância Z-API para <strong>{whatsappClinicName}</strong> e salva as credenciais no tenant.
              A clínica verá o QR Code em <strong>Configurações → WhatsApp</strong>.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Requer <code className="text-xs">ZAPI_PARTNER_TOKEN</code> configurado no servidor. Se a clínica já tiver
            uma instância, uma segunda será criada.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setWhatsappTenantId(null)}>Cancelar</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => void submitProvisionWhatsapp()}
              disabled={whatsappProvisioning}
            >
              {whatsappProvisioning && <Loader2 className="size-4 animate-spin mr-1" />}
              Provisionar instância
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
