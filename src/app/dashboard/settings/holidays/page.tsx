'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, Sparkles, CalendarOff } from 'lucide-react';
import api from '@/lib/axios';

interface Holiday {
  id: string;
  date: string;
  name: string;
  is_recurring: boolean;
  is_regional: boolean;
  city: string | null;
  state: string | null;
}

interface AiSuggestion {
  date: string;
  name: string;
  is_recurring?: boolean;
  is_regional?: boolean;
}

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());

  // Add form
  const [addOpen, setAddOpen] = useState(false);
  const [formDate, setFormDate] = useState('');
  const [formName, setFormName] = useState('');
  const [formRecurring, setFormRecurring] = useState(true);
  const [formRegional, setFormRegional] = useState(false);
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [saving, setSaving] = useState(false);

  // AI suggestions
  const [aiOpen, setAiOpen] = useState(false);
  const [aiCity, setAiCity] = useState('');
  const [aiState, setAiState] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [aiSaving, setAiSaving] = useState(false);

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/availability/config/holidays?year=${year}`);
      setHolidays(res.data ?? []);
    } catch {
      toast.error('Erro ao carregar feriados');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const handleAdd = async () => {
    if (!formDate || !formName) {
      toast.error('Preencha data e nome');
      return;
    }
    setSaving(true);
    try {
      await api.post('/availability/config/holidays', {
        date: formDate,
        name: formName,
        is_recurring: formRecurring,
        is_regional: formRegional,
        city: formRegional ? formCity : null,
        state: formRegional ? formState : null,
      });
      toast.success('Feriado adicionado');
      setAddOpen(false);
      resetAddForm();
      fetchHolidays();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/availability/config/holidays/${id}`);
      toast.success('Feriado removido');
      fetchHolidays();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao remover');
    }
  };

  const resetAddForm = () => {
    setFormDate('');
    setFormName('');
    setFormRecurring(true);
    setFormRegional(false);
    setFormCity('');
    setFormState('');
  };

  // AI suggestions
  const handleAiSearch = async () => {
    if (!aiCity || !aiState) {
      toast.error('Informe cidade e estado');
      return;
    }
    setAiLoading(true);
    setSuggestions([]);
    setSelectedSuggestions(new Set());
    try {
      const res = await api.post('/availability/config/holidays/ai-suggest', {
        city: aiCity,
        state: aiState,
        year,
      });
      const list: AiSuggestion[] = res.data?.holidays ?? [];
      setSuggestions(list);
      setSelectedSuggestions(new Set(list.map((_, i) => i)));
      if (list.length === 0) toast.info('Nenhum feriado sugerido pela IA');
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro na consulta à IA');
    } finally {
      setAiLoading(false);
    }
  };

  const toggleSuggestion = (idx: number) => {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleSaveSuggestions = async () => {
    const selected = suggestions.filter((_, i) => selectedSuggestions.has(i));
    if (selected.length === 0) {
      toast.error('Selecione ao menos um feriado');
      return;
    }
    setAiSaving(true);
    try {
      await api.post('/availability/config/holidays/batch', {
        holidays: selected.map((s) => ({
          date: s.date,
          name: s.name,
          is_recurring: s.is_recurring ?? true,
          is_regional: s.is_regional ?? false,
        })),
        city: aiCity,
        state: aiState,
      });
      toast.success(`${selected.length} feriados salvos`);
      setAiOpen(false);
      setSuggestions([]);
      fetchHolidays();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao salvar feriados');
    } finally {
      setAiSaving(false);
    }
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
    } catch {
      return d;
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-600 mb-6">Feriados</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarOff className="w-5 h-5" />
            Feriados de {year}
          </CardTitle>
          <CardDescription>
            Gerencie os feriados nacionais e regionais. A IA pode buscar os feriados para sua cidade automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Label>Ano</Label>
              <Input
                type="number"
                className="w-24"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                min={2024}
                max={2030}
              />
            </div>
            <Button onClick={() => { resetAddForm(); setAddOpen(true); }} className="bg-blue-600">
              <Plus className="w-4 h-4 mr-2" /> Adicionar
            </Button>
            <Button onClick={() => setAiOpen(true)} variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
              <Sparkles className="w-4 h-4 mr-2" /> Buscar com IA
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : holidays.length === 0 ? (
            <p className="text-slate-500 text-center py-8">
              Nenhum feriado cadastrado para {year}. Use o botão &quot;Buscar com IA&quot; para importar automaticamente.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Recorrente</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-mono">{formatDate(h.date)}</TableCell>
                    <TableCell>{h.name}</TableCell>
                    <TableCell>
                      {h.is_regional ? (
                        <Badge variant="outline" className="border-orange-300 text-orange-700">
                          Regional {h.city ? `(${h.city}/${h.state})` : ''}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-blue-300 text-blue-700">Nacional</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {h.is_recurring ? (
                        <Badge className="bg-green-500">Sim</Badge>
                      ) : (
                        <Badge variant="secondary">Não</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon" className="h-7 w-7">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover feriado?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover &quot;{h.name}&quot;?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(h.id)}>Remover</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Dialog adicionar feriado manualmente ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar feriado</DialogTitle>
            <DialogDescription>Cadastre um feriado manualmente.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label>Data</Label>
              <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Nome</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Carnaval" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formRecurring} onCheckedChange={setFormRecurring} id="h_recur" />
              <Label htmlFor="h_recur">Recorrente (repete todo ano)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formRegional} onCheckedChange={setFormRegional} id="h_regional" />
              <Label htmlFor="h_regional">Feriado regional/municipal</Label>
            </div>
            {formRegional && (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Cidade</Label>
                  <Input value={formCity} onChange={(e) => setFormCity(e.target.value)} placeholder="Ex: São Paulo" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Estado (UF)</Label>
                  <Input value={formState} onChange={(e) => setFormState(e.target.value.toUpperCase())} maxLength={2} placeholder="SP" />
                </div>
              </div>
            )}
            <Button onClick={handleAdd} disabled={saving} className="bg-blue-600">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog IA buscar feriados ── */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Buscar feriados com IA
            </DialogTitle>
            <DialogDescription>
              Informe a cidade e o estado para que a IA traga os feriados nacionais e regionais de {year}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Cidade</Label>
                <Input value={aiCity} onChange={(e) => setAiCity(e.target.value)} placeholder="Ex: São Paulo" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Estado (UF)</Label>
                <Input value={aiState} onChange={(e) => setAiState(e.target.value.toUpperCase())} maxLength={2} placeholder="SP" />
              </div>
            </div>
            <Button onClick={handleAiSearch} disabled={aiLoading} variant="outline" className="border-purple-300 text-purple-700">
              {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {aiLoading ? 'Consultando IA...' : 'Buscar feriados'}
            </Button>

            {suggestions.length > 0 && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-600">{suggestions.length} feriados encontrados. Selecione os que deseja salvar:</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSuggestions(new Set(suggestions.map((_, i) => i)))}
                    >
                      Todos
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedSuggestions(new Set())}>
                      Nenhum
                    </Button>
                  </div>
                </div>
                <div className="max-h-[40vh] overflow-y-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suggestions.map((s, i) => (
                        <TableRow key={i} className={selectedSuggestions.has(i) ? '' : 'opacity-50'}>
                          <TableCell>
                            <Checkbox
                              checked={selectedSuggestions.has(i)}
                              onCheckedChange={() => toggleSuggestion(i)}
                            />
                          </TableCell>
                          <TableCell className="font-mono">{formatDate(s.date)}</TableCell>
                          <TableCell>{s.name}</TableCell>
                          <TableCell>
                            {s.is_regional ? (
                              <Badge variant="outline" className="border-orange-300 text-orange-700 text-xs">Regional</Badge>
                            ) : (
                              <Badge variant="outline" className="border-blue-300 text-blue-700 text-xs">Nacional</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Button onClick={handleSaveSuggestions} disabled={aiSaving || selectedSuggestions.size === 0} className="bg-blue-600">
                  {aiSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar {selectedSuggestions.size} feriado{selectedSuggestions.size !== 1 ? 's' : ''}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
