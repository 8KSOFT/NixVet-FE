'use client';

import React, { useState } from 'react';
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
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import {
  useHolidaysQuery,
  useCreateHolidayMutation,
  useDeleteHolidayMutation,
  useAiSuggestHolidaysMutation,
  useSaveHolidaySuggestionsMutation,
} from '@/hooks/apiHooks/useHolidays';
import type { AiHolidaySuggestion as AiSuggestion } from '@/app/types/holiday';

export default function HolidaysPage() {
  const [year, setYear] = useState(new Date().getFullYear());

  const { data: holidays = [], isLoading: loading } = useHolidaysQuery(year);
  const createMutation = useCreateHolidayMutation(year);
  const deleteMutation = useDeleteHolidayMutation(year);
  const aiSuggestMutation = useAiSuggestHolidaysMutation();
  const saveSuggestionsMutation = useSaveHolidaySuggestionsMutation(year);

  // Add form
  const [addOpen, setAddOpen] = useState(false);
  const [formDate, setFormDate] = useState('');
  const [formName, setFormName] = useState('');
  const [formRecurring, setFormRecurring] = useState(true);
  const [formRegional, setFormRegional] = useState(false);
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const saving = createMutation.isPending;

  // AI suggestions
  const [aiOpen, setAiOpen] = useState(false);
  const [aiCity, setAiCity] = useState('');
  const [aiState, setAiState] = useState('');
  const aiLoading = aiSuggestMutation.isPending;
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const aiSaving = saveSuggestionsMutation.isPending;

  const handleAdd = async () => {
    if (!formDate || !formName) {
      toast.error('Preencha data e nome');
      return;
    }
    try {
      await createMutation.mutateAsync({
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
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Feriado removido');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao remover'));
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
    setSuggestions([]);
    setSelectedSuggestions(new Set());
    try {
      const list = await aiSuggestMutation.mutateAsync({ city: aiCity, state: aiState, year });
      setSuggestions(list);
      setSelectedSuggestions(new Set(list.map((_, i) => i)));
      if (list.length === 0) toast.info('Nenhum feriado sugerido pela IA');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro na consulta à IA'));
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
    try {
      await saveSuggestionsMutation.mutateAsync({
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
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar feriados'));
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
      <h1 className="text-2xl font-heading font-bold text-primary mb-6">Feriados</h1>

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
          <div className="flex flex-wrap items-center gap-3 mb-4">
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
            <Button onClick={() => { resetAddForm(); setAddOpen(true); }} className="bg-primary">
              <Plus className="w-4 h-4 mr-2" /> Adicionar
            </Button>
            <Button onClick={() => setAiOpen(true)} variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
              <Sparkles className="w-4 h-4 mr-2" /> Buscar com IA
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : holidays.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum feriado cadastrado para {year}. Use o botão &quot;Buscar com IA&quot; para importar automaticamente.
            </p>
          ) : (
            <div className="overflow-x-auto">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-15">
                  <TableHead>Data</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Recorrente</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((h) => (
                  <TableRow className="border-b border-gray-300 h-15" key={h.id}>
                    <TableCell className="font-mono">{formatDate(h.date)}</TableCell>
                    <TableCell>{h.name}</TableCell>
                    <TableCell>
                      {h.is_regional ? (
                        <Badge variant="outline" className="border-orange-300 text-orange-700">
                          Regional {h.city ? `(${h.city}/${h.state})` : ''}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-primary/40 text-primary">Nacional</Badge>
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
            </div>
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <Button onClick={handleAdd} disabled={saving} className="bg-primary">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog IA buscar feriados ── */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-h-[80vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Buscar feriados com IA
            </DialogTitle>
            <DialogDescription>
              Informe a cidade e o estado para que a IA traga os feriados nacionais e regionais de {year}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Cidade</Label>
                <Input value={aiCity} onChange={(e) => setAiCity(e.target.value)} placeholder="Ex: São Paulo" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Estado (UF)</Label>
                <Input value={aiState} onChange={(e) => setAiState(e.target.value.toUpperCase())} maxLength={2} placeholder="SP" />
              </div>
            </div>
            <Button onClick={handleAiSearch} disabled={aiLoading} variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
              {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {aiLoading ? 'Consultando IA...' : 'Buscar feriados'}
            </Button>

            {suggestions.length > 0 && (
              <>
                <Separator />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">{suggestions.length} feriados encontrados. Selecione os que deseja salvar:</p>
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
                <div className="max-h-[40vh] overflow-y-auto overflow-x-auto border border-gray-300 rounded-lg">
                  <Table className="min-w-full border-collapse bg-white text-sm">
                    <TableHeader>
                      <TableRow className="border-b border-gray-300 h-15">
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suggestions.map((s, i) => (
                        <TableRow key={i} className={selectedSuggestions.has(i) ? 'border-b border-gray-300 h-15' : 'opacity-50 border-b border-gray-300 h-15'}>
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
                              <Badge variant="outline" className="border-primary/40 text-primary text-xs">Nacional</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Button onClick={handleSaveSuggestions} disabled={aiSaving || selectedSuggestions.size === 0} className="bg-primary">
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
