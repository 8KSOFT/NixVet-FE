'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      toast.error(t('settingsHolidays.fillDateAndName'));
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
      setAddOpen(false);
      resetAddForm();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('settingsHolidays.saveError')));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('settingsHolidays.removeError')));
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
      toast.error(t('settingsHolidays.fillCityAndState'));
      return;
    }
    setSuggestions([]);
    setSelectedSuggestions(new Set());
    try {
      const list = await aiSuggestMutation.mutateAsync({ city: aiCity, state: aiState, year });
      setSuggestions(list);
      setSelectedSuggestions(new Set(list.map((_, i) => i)));
      if (list.length === 0) toast.info(t('settingsHolidays.noAiSuggestions'));
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('settingsHolidays.aiQueryError')));
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
      toast.error(t('settingsHolidays.selectAtLeastOne'));
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
      setAiOpen(false);
      setSuggestions([]);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('settingsHolidays.saveHolidaysError')));
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
      <h1 className="text-2xl font-heading font-bold text-primary mb-6">{t('settingsHolidays.title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarOff className="w-5 h-5" />
            {t('settingsHolidays.holidaysOf', { year })}
          </CardTitle>
          <CardDescription>
            {t('settingsHolidays.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-2">
              <Label>{t('settingsHolidays.year')}</Label>
              <Input
                type="number"
                className="w-24"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                min={2024}
                max={2030}
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => { resetAddForm(); setAddOpen(true); }} className="w-full bg-primary sm:w-auto">
                <Plus className="w-4 h-4 mr-2" /> {t('settingsHolidays.add')}
              </Button>
              <Button
                onClick={() => setAiOpen(true)}
                variant="outline"
                className="w-full border-primary/40 text-primary hover:bg-primary/10 sm:w-auto"
              >
                <Sparkles className="w-4 h-4 mr-2" /> {t('settingsHolidays.searchWithAi')}
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : holidays.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {t('settingsHolidays.emptyState', { year })}
            </p>
          ) : (
            <>
              {/* Desktop / tablet: tabela */}
              <div className="hidden overflow-x-auto md:block">
              <Table className="min-w-full border-collapse bg-white text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-300 h-15">
                    <TableHead>{t('settingsHolidays.date')}</TableHead>
                    <TableHead>{t('settingsHolidays.name')}</TableHead>
                    <TableHead>{t('settingsHolidays.type')}</TableHead>
                    <TableHead>{t('settingsHolidays.recurring')}</TableHead>
                    <TableHead>{t('settingsHolidays.actions')}</TableHead>
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
                            {t('settingsHolidays.regional')} {h.city ? `(${h.city}/${h.state})` : ''}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-primary/40 text-primary">{t('settingsHolidays.national')}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {h.is_recurring ? (
                          <Badge className="bg-green-500">{t('settingsHolidays.yes')}</Badge>
                        ) : (
                          <Badge variant="secondary">{t('settingsHolidays.no')}</Badge>
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
                              <AlertDialogTitle>{t('settingsHolidays.removeConfirmTitle')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('settingsHolidays.removeConfirmDescription', { name: h.name })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('settingsHolidays.cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(h.id)}>{t('settingsHolidays.remove')}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>

              {/* Mobile: cards */}
              <div className="space-y-2 md:hidden">
                {holidays.map((h) => (
                  <div key={h.id} className="rounded-lg border border-gray-300 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{h.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{formatDate(h.date)}</p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon" className="h-7 w-7 shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('settingsHolidays.removeConfirmTitle')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('settingsHolidays.removeConfirmDescription', { name: h.name })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('settingsHolidays.cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(h.id)}>{t('settingsHolidays.remove')}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {h.is_regional ? (
                        <Badge variant="outline" className="border-orange-300 text-orange-700">
                          {t('settingsHolidays.regional')} {h.city ? `(${h.city}/${h.state})` : ''}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-primary/40 text-primary">{t('settingsHolidays.national')}</Badge>
                      )}
                      {h.is_recurring ? (
                        <Badge className="bg-green-500">{t('settingsHolidays.recurringBadge')}</Badge>
                      ) : (
                        <Badge variant="secondary">{t('settingsHolidays.notRecurringBadge')}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Dialog adicionar feriado manualmente ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settingsHolidays.addDialogTitle')}</DialogTitle>
            <DialogDescription>{t('settingsHolidays.addDialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label>{t('settingsHolidays.date')}</Label>
              <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('settingsHolidays.name')}</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={t('settingsHolidays.namePlaceholder')} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formRecurring} onCheckedChange={setFormRecurring} id="h_recur" />
              <Label htmlFor="h_recur">{t('settingsHolidays.recurringLabel')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formRegional} onCheckedChange={setFormRegional} id="h_regional" />
              <Label htmlFor="h_regional">{t('settingsHolidays.regionalLabel')}</Label>
            </div>
            {formRegional && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>{t('settingsHolidays.city')}</Label>
                  <Input value={formCity} onChange={(e) => setFormCity(e.target.value)} placeholder={t('settingsHolidays.cityPlaceholder')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>{t('settingsHolidays.state')}</Label>
                  <Input value={formState} onChange={(e) => setFormState(e.target.value.toUpperCase())} maxLength={2} placeholder="SP" />
                </div>
              </div>
            )}
            <Button onClick={handleAdd} disabled={saving} className="bg-primary">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('settingsHolidays.save')}
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
              {t('settingsHolidays.aiDialogTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('settingsHolidays.aiDialogDescription', { year })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>{t('settingsHolidays.city')}</Label>
                <Input value={aiCity} onChange={(e) => setAiCity(e.target.value)} placeholder={t('settingsHolidays.cityPlaceholder')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('settingsHolidays.state')}</Label>
                <Input value={aiState} onChange={(e) => setAiState(e.target.value.toUpperCase())} maxLength={2} placeholder="SP" />
              </div>
            </div>
            <Button onClick={handleAiSearch} disabled={aiLoading} variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
              {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {aiLoading ? t('settingsHolidays.consultingAi') : t('settingsHolidays.searchHolidays')}
            </Button>

            {suggestions.length > 0 && (
              <>
                <Separator />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">{t('settingsHolidays.suggestionsFound', { count: suggestions.length })}</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSuggestions(new Set(suggestions.map((_, i) => i)))}
                    >
                      {t('settingsHolidays.selectAll')}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedSuggestions(new Set())}>
                      {t('settingsHolidays.selectNone')}
                    </Button>
                  </div>
                </div>
                {/* Desktop / tablet: tabela */}
                <div className="hidden max-h-[40vh] overflow-y-auto overflow-x-auto rounded-lg border border-gray-300 md:block">
                  <Table className="min-w-full border-collapse bg-white text-sm">
                    <TableHeader>
                      <TableRow className="border-b border-gray-300 h-15">
                        <TableHead className="w-10"></TableHead>
                        <TableHead>{t('settingsHolidays.date')}</TableHead>
                        <TableHead>{t('settingsHolidays.name')}</TableHead>
                        <TableHead>{t('settingsHolidays.type')}</TableHead>
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
                              <Badge variant="outline" className="border-orange-300 text-orange-700 text-xs">{t('settingsHolidays.regional')}</Badge>
                            ) : (
                              <Badge variant="outline" className="border-primary/40 text-primary text-xs">{t('settingsHolidays.national')}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile: cards */}
                <div className="max-h-[40vh] space-y-2 overflow-y-auto md:hidden">
                  {suggestions.map((s, i) => (
                    <label
                      key={i}
                      className={`flex items-start gap-3 rounded-lg border border-gray-300 p-3 ${
                        selectedSuggestions.has(i) ? '' : 'opacity-50'
                      }`}
                    >
                      <Checkbox
                        checked={selectedSuggestions.has(i)}
                        onCheckedChange={() => toggleSuggestion(i)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate font-medium">{s.name}</p>
                          {s.is_regional ? (
                            <Badge variant="outline" className="shrink-0 border-orange-300 text-xs text-orange-700">{t('settingsHolidays.regional')}</Badge>
                          ) : (
                            <Badge variant="outline" className="shrink-0 border-primary/40 text-xs text-primary">{t('settingsHolidays.national')}</Badge>
                          )}
                        </div>
                        <p className="font-mono text-xs text-muted-foreground">{formatDate(s.date)}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <Button onClick={handleSaveSuggestions} disabled={aiSaving || selectedSuggestions.size === 0} className="bg-primary">
                  {aiSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t('settingsHolidays.saveHolidaysCount', { count: selectedSuggestions.size })}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
