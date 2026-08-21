'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Tag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DashboardCreateFormDialog } from '@/components/dashboard-create-form-dialog';
import { toast } from 'sonner';
import { useCurrencyFormatter } from '@/lib/i18n/currency';
import type { Product, StockEntryExpenseCategory, StockEntryPayload, Supplier } from '@/app/types/product';
import { useCreateStockEntryMutation } from '@/hooks/apiHooks/useStock';

interface FormItem {
  product_id: string;
  quantity: string;
  unit_cost: string;
  update_sale_price: boolean;
  new_sale_price: string;
}

function emptyItem(): FormItem {
  return { product_id: '', quantity: '1', unit_cost: '', update_sale_price: false, new_sale_price: '' };
}

interface StockEntryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  suppliers: Supplier[];
}

export function StockEntryFormDialog({ open, onOpenChange, products, suppliers }: StockEntryFormDialogProps) {
  const { t } = useTranslation();
  const fmt = useCurrencyFormatter();
  const createEntry = useCreateStockEntryMutation();

  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('pending');
  const [expenseCategory, setExpenseCategory] = useState<StockEntryExpenseCategory>('material_purchase');
  const [items, setItems] = useState<FormItem[]>([emptyItem()]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const reset = () => {
    setSupplierId(null);
    setInvoiceNumber('');
    setEntryDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setPaymentStatus('pending');
    setExpenseCategory('material_purchase');
    setItems([emptyItem()]);
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));
  const updateItem = <K extends keyof FormItem>(index: number, key: K, value: FormItem[K]) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const selectItemProduct = (index: number, productId: string) => {
    const product = productById.get(productId);
    updateItem(index, 'product_id', productId);
    if (product?.cost_price != null) {
      updateItem(index, 'unit_cost', String(product.cost_price));
    }
  };

  const total = useMemo(
    () =>
      items.reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const cost = Number(item.unit_cost) || 0;
        return sum + qty * cost;
      }, 0),
    [items],
  );

  const saving = createEntry.isPending;

  const save = async () => {
    const validItems = items.filter((item) => item.product_id && Number(item.quantity) > 0);
    if (validItems.length === 0) {
      toast.error(t('settingsProdutos.entries.missingItemsError'));
      return;
    }
    const payload: StockEntryPayload = {
      supplier_id: supplierId,
      invoice_number: invoiceNumber.trim() || undefined,
      entry_date: entryDate,
      notes: notes.trim() || undefined,
      payment_status: paymentStatus,
      expense_category: expenseCategory,
      items: validItems.map((item) => ({
        product_id: item.product_id,
        quantity: Number(item.quantity),
        unit_cost: Number(item.unit_cost) || 0,
        update_sale_price: item.update_sale_price,
        new_sale_price: item.update_sale_price ? Number(item.new_sale_price) || 0 : undefined,
      })),
    };
    try {
      await createEntry.mutateAsync(payload);
      reset();
      onOpenChange(false);
    } catch {
      toast.error(t('settingsProdutos.entries.saveError'));
    }
  };

  return (
    <DashboardCreateFormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title={t('settingsProdutos.entries.new')}
      contentClassName="max-w-[min(calc(100%-4rem),64rem)] sm:max-w-[min(calc(100%-4rem),64rem)]"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {t('settingsProdutos.entries.totalLabel')}: <span className="font-semibold text-foreground">{fmt(total)}</span>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t('settingsProdutos.cancel')}
            </Button>
            <Button type="submit" form="stock-entry-form" className="bg-primary" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t('settingsProdutos.entries.submit')}
            </Button>
          </div>
        </div>
      }
    >
      <form
        id="stock-entry-form"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="space-y-4 md:space-y-6"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('settingsProdutos.supplierLabel')}</Label>
            <Select value={supplierId ?? '__none__'} onValueChange={(v) => setSupplierId(v === '__none__' ? null : v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('settingsProdutos.supplierNone')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t('settingsProdutos.supplierNone')}</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-number">{t('settingsProdutos.entries.invoiceNumberLabel')}</Label>
            <Input id="invoice-number" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="entry-date">{t('settingsProdutos.entries.entryDateLabel')}</Label>
            <Input
              id="entry-date"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('settingsProdutos.entries.expenseCategoryLabel')}</Label>
            <Select value={expenseCategory} onValueChange={(v) => setExpenseCategory(v as StockEntryExpenseCategory)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="material_purchase">{t('settingsProdutos.entries.expenseMaterial')}</SelectItem>
                <SelectItem value="medication_purchase">{t('settingsProdutos.entries.expenseMedication')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border border-gray-300 p-3">
          <div>
            <Label className="cursor-pointer">{t('settingsProdutos.entries.paidLabel')}</Label>
            <p className="text-xs text-muted-foreground">{t('settingsProdutos.entries.paidHint')}</p>
          </div>
          <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as 'paid' | 'pending')}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">{t('settingsProdutos.entries.pending')}</SelectItem>
              <SelectItem value="paid">{t('settingsProdutos.entries.paid')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label>{t('settingsProdutos.entries.itemsLabel')}</Label>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              {t('settingsProdutos.entries.addItemButton')}
            </Button>
          </div>
          <div className="hidden gap-2 px-3 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-12">
            <span className="col-span-4">{t('settingsProdutos.entries.colProduct')}</span>
            <span className="col-span-2">{t('settingsProdutos.entries.colQuantity')}</span>
            <span className="col-span-2">{t('settingsProdutos.entries.colUnitCost')}</span>
            <span className="col-span-2">{t('settingsProdutos.entries.colLineTotal')}</span>
            <span className="col-span-2" />
          </div>
          <div className="space-y-2">
            {items.map((item, i) => {
              const lineTotal = (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0);
              return (
                <div key={i} className="space-y-2 rounded-lg border p-3">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-12">
                    <Select value={item.product_id} onValueChange={(v) => selectItemProduct(i, v)}>
                      <SelectTrigger className="col-span-2 h-9 sm:col-span-4">
                        <SelectValue placeholder={t('settingsProdutos.entries.selectProductPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={0.0001}
                      step="0.0001"
                      placeholder={t('settingsProdutos.entries.colQuantity')}
                      value={item.quantity}
                      onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                      className="col-span-1 h-9 sm:col-span-2"
                    />
                    <CurrencyInput
                      placeholder={t('settingsProdutos.entries.colUnitCost')}
                      value={item.unit_cost}
                      onValueChange={(v) => updateItem(i, 'unit_cost', v)}
                      wrapperClassName="col-span-1 sm:col-span-2"
                      className="h-9"
                    />
                    <div className="col-span-2 flex h-9 items-center justify-end px-2 text-sm font-medium tabular-nums sm:col-span-2">
                      {fmt(lineTotal)}
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1 sm:col-span-2">
                      <Button
                        type="button"
                        variant={item.update_sale_price ? 'default' : 'ghost'}
                        size="icon"
                        className="h-9"
                        onClick={() => updateItem(i, 'update_sale_price', !item.update_sale_price)}
                        title={t('settingsProdutos.entries.updateSalePriceToggle')}
                      >
                        <Tag className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(i)}
                        disabled={items.length === 1}
                        title={t('settingsProdutos.entries.removeItemTitle')}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                  {item.update_sale_price ? (
                    <div className="flex items-center gap-2 pl-1">
                      <Label className="shrink-0 text-xs text-muted-foreground">
                        {t('settingsProdutos.entries.newSalePriceLabel')}
                      </Label>
                      <CurrencyInput
                        value={item.new_sale_price}
                        onValueChange={(v) => updateItem(i, 'new_sale_price', v)}
                        className="h-9 max-w-40"
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="entry-notes">{t('settingsProdutos.entries.notesLabel')}</Label>
          <Textarea id="entry-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </form>
    </DashboardCreateFormDialog>
  );
}
