'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Plus, Package, ShoppingCart, Trash2, Pencil, Loader2, Tags, Truck, History, FileInput, LineChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardCreateFormDialog } from '@/components/dashboard-create-form-dialog';
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
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { Product, ProductPayload } from '@/app/types/product';
import {
  useCreateProductMutation,
  useDeleteProductMutation,
  useProductsQuery,
  useProductSalesQuery,
  useUpdateProductMutation,
} from '@/hooks/apiHooks/useProducts';
import { useProductCategoriesQuery, useSuppliersQuery } from '@/hooks/apiHooks/useStock';
import { useCurrencyFormatter } from '@/lib/i18n/currency';
import { CategoriesTab } from './_components/CategoriesTab';
import { SuppliersTab } from './_components/SuppliersTab';
import { MovementsTab } from './_components/MovementsTab';
import { CategorySelect } from './_components/CategorySelect';
import { StockEntriesTab } from './_components/StockEntriesTab';
import { CostHistoryTab } from './_components/CostHistoryTab';

function computeMargin(salePrice: number, cost: number, tax: number) {
  const tax_amount = Math.round(((salePrice * tax) / 100) * 100) / 100;
  const client_total = Math.round((salePrice + tax_amount) * 100) / 100;
  const margin_value = Math.round((salePrice - cost) * 100) / 100;
  const margin_percentage = salePrice > 0 ? Math.round((margin_value / salePrice) * 10000) / 100 : 0;
  return { tax_amount, client_total, margin_value, margin_percentage };
}

const EMPTY_FORM = {
  name: '',
  description: '',
  sku: '',
  cost_price: '',
  sale_price: '',
  tax_percentage: '',
  stock_quantity: '',
  active: true,
  item_type: 'product' as 'product' | 'consumable',
  category_id: null as string | null,
  supplier_id: null as string | null,
  minimum_stock: '',
  internal_code: '',
};

type ProdutosTab = 'products' | 'sales' | 'categories' | 'suppliers' | 'movements' | 'entries' | 'cost-history';
const VALID_TABS: ProdutosTab[] = [
  'products',
  'sales',
  'categories',
  'suppliers',
  'movements',
  'entries',
  'cost-history',
];

function ProdutosContent() {
  const { t } = useTranslation();
  const fmt = useCurrencyFormatter();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab');
  const [tab, setTab] = useState<ProdutosTab>(
    VALID_TABS.includes(tabParam as ProdutosTab) ? (tabParam as ProdutosTab) : 'products',
  );

  const changeTab = (next: ProdutosTab) => {
    setTab(next);
    const params = new URLSearchParams(searchParams?.toString());
    if (next === 'products') params.delete('tab');
    else params.set('tab', next);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : (pathname ?? '/settings/produtos'), { scroll: false });
  };

  const { data: products = [], isLoading: loadingProducts } = useProductsQuery(true);
  const { data: sales = [], isLoading: loadingSales } = useProductSalesQuery();
  const { data: categories = [] } = useProductCategoriesQuery();
  const { data: suppliers = [] } = useSuppliersQuery();

  const createProduct = useCreateProductMutation();
  const updateProduct = useUpdateProductMutation();
  const deleteProduct = useDeleteProductMutation();

  const loading = tab === 'products' ? loadingProducts : tab === 'sales' ? loadingSales : false;

  // Dialog produto
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [productDialog, setProductDialog] = useState(false);

  const openNewProduct = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setProductDialog(true);
  };

  // Entrada vinda do "+ Novo" (Command Palette / menu global) — abre o dialog de
  // criação já existente e limpa o parâmetro da URL logo em seguida.
  useEffect(() => {
    if (searchParams?.get('create') === '1') {
      openNewProduct();
      router.replace(pathname ?? '/settings/produtos', { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const openEditProduct = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? '',
      sku: p.sku ?? '',
      cost_price: p.cost_price != null ? String(p.cost_price) : '',
      sale_price: String(p.sale_price),
      tax_percentage: String(p.tax_percentage),
      stock_quantity: String(p.stock_quantity),
      active: p.active,
      item_type: p.item_type ?? 'product',
      category_id: p.category_id ?? null,
      supplier_id: p.supplier_id ?? null,
      minimum_stock: p.minimum_stock != null ? String(p.minimum_stock) : '',
      internal_code: p.internal_code ?? '',
    });
    setProductDialog(true);
  };

  const formPreview = useMemo(
    () => computeMargin(Number(form.sale_price) || 0, Number(form.cost_price) || 0, Number(form.tax_percentage) || 0),
    [form.sale_price, form.cost_price, form.tax_percentage],
  );

  const saveProduct = async () => {
    if (!form.name.trim() || !form.sale_price) {
      toast.error(t('settingsProdutos.missingFieldsError'));
      return;
    }
    const payload: ProductPayload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      sku: form.sku.trim() || undefined,
      cost_price: form.cost_price ? Number(form.cost_price) : undefined,
      sale_price: Number(form.sale_price),
      tax_percentage: form.tax_percentage ? Number(form.tax_percentage) : 0,
      stock_quantity: form.stock_quantity ? Number(form.stock_quantity) : 0,
      active: form.active,
      item_type: form.item_type,
      category_id: form.category_id,
      supplier_id: form.supplier_id,
      minimum_stock: form.minimum_stock ? Number(form.minimum_stock) : 0,
      internal_code: form.internal_code.trim() || null,
    };
    try {
      if (editing) {
        await updateProduct.mutateAsync({ id: editing.id, payload });
      } else {
        await createProduct.mutateAsync(payload);
      }
      setProductDialog(false);
    } catch {
      toast.error(t('settingsProdutos.saveProductError'));
    }
  };

  const savingProduct = createProduct.isPending || updateProduct.isPending;

  const handleDeleteProduct = async (p: Product) => {
    try {
      await deleteProduct.mutateAsync(p.id);
    } catch {
      toast.error(t('settingsProdutos.deleteProductError'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('settingsProdutos.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('settingsProdutos.subtitle')}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={openNewProduct} className="w-full sm:w-auto">
            <Plus className="mr-2 size-4" /> {t('settingsProdutos.newProduct')}
          </Button>
          <Button onClick={() => router.push('/balcao')} className="w-full sm:w-auto">
            <ShoppingCart className="mr-2 size-4" /> {t('settingsProdutos.newSale')}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={tab === 'products' ? 'default' : 'outline'} size="sm" onClick={() => changeTab('products')}>
          <Package className="mr-2 size-4" /> {t('settingsProdutos.tabProducts')}
        </Button>
        <Button variant={tab === 'sales' ? 'default' : 'outline'} size="sm" onClick={() => changeTab('sales')}>
          <ShoppingCart className="mr-2 size-4" /> {t('settingsProdutos.tabSales')}
        </Button>
        <Button variant={tab === 'categories' ? 'default' : 'outline'} size="sm" onClick={() => changeTab('categories')}>
          <Tags className="mr-2 size-4" /> {t('settingsProdutos.tabCategories')}
        </Button>
        <Button variant={tab === 'suppliers' ? 'default' : 'outline'} size="sm" onClick={() => changeTab('suppliers')}>
          <Truck className="mr-2 size-4" /> {t('settingsProdutos.tabSuppliers')}
        </Button>
        <Button variant={tab === 'movements' ? 'default' : 'outline'} size="sm" onClick={() => changeTab('movements')}>
          <History className="mr-2 size-4" /> {t('settingsProdutos.tabMovements')}
        </Button>
        <Button variant={tab === 'entries' ? 'default' : 'outline'} size="sm" onClick={() => changeTab('entries')}>
          <FileInput className="mr-2 size-4" /> {t('settingsProdutos.tabEntries')}
        </Button>
        <Button
          variant={tab === 'cost-history' ? 'default' : 'outline'}
          size="sm"
          onClick={() => changeTab('cost-history')}
        >
          <LineChart className="mr-2 size-4" /> {t('settingsProdutos.tabCostHistory')}
        </Button>
      </div>

      <div>
        {tab === 'categories' ? (
          <CategoriesTab />
        ) : tab === 'suppliers' ? (
          <SuppliersTab />
        ) : tab === 'movements' ? (
          <MovementsTab products={products} />
        ) : tab === 'entries' ? (
          <StockEntriesTab products={products} suppliers={suppliers} />
        ) : tab === 'cost-history' ? (
          <CostHistoryTab products={products} />
        ) : loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : tab === 'products' ? (
          products.length === 0 ? (
            <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
              {t('settingsProdutos.emptyProducts')}
            </div>
          ) : (
            <>
              {/* Desktop / tablet: tabela */}
              <div className="hidden overflow-x-auto rounded-lg border border-gray-300 md:block">
                <Table className="min-w-full border-collapse bg-white text-sm">
                  <TableHeader>
                    <TableRow className="border-b border-gray-300 h-15">
                      <TableHead>{t('settingsProdutos.colProduct')}</TableHead>
                      <TableHead className="text-right">{t('settingsProdutos.cost')}</TableHead>
                      <TableHead className="text-right">{t('settingsProdutos.colSalePrice')}</TableHead>
                      <TableHead className="text-right">{t('settingsProdutos.tax')}</TableHead>
                      <TableHead className="text-right">{t('settingsProdutos.colMargin')}</TableHead>
                      <TableHead className="text-right">{t('settingsProdutos.stock')}</TableHead>
                      <TableHead className="text-right">{t('settingsProdutos.colActions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((p) => (
                      <TableRow key={p.id} className={`border-b border-gray-300 h-15${!p.active ? ' opacity-50' : ''}`}>
                        <TableCell className="font-medium">
                          {p.name}
                          {p.sku ? <span className="ml-2 text-xs text-muted-foreground">{p.sku}</span> : null}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {p.cost_price_formatted ?? fmt(p.cost_price ?? 0)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {p.sale_price_formatted ?? fmt(p.sale_price)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{Number(p.tax_percentage)}%</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {p.pricing ? `${p.pricing.margin_percentage}%` : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{p.stock_quantity}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEditProduct(p)}>
                              <Pencil className="size-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost">
                                  <Trash2 className="size-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('settingsProdutos.deleteProductTitle')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('settingsProdutos.deleteProductDescription', { name: p.name })}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('settingsProdutos.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive hover:bg-destructive/90"
                                    onClick={() => handleDeleteProduct(p)}
                                  >
                                    {t('settingsProdutos.remove')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: cards */}
              <div className="space-y-3 md:hidden">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className={`rounded-lg border border-gray-300 bg-white p-4${!p.active ? ' opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.name}</p>
                        {p.sku ? <p className="text-xs text-muted-foreground">{p.sku}</p> : null}
                      </div>
                      {!p.active && (
                        <Badge variant="secondary" className="shrink-0">
                          {t('settingsProdutos.inactiveBadge')}
                        </Badge>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">{t('settingsProdutos.cost')}</p>
                        <p className="tabular-nums">{p.cost_price_formatted ?? fmt(p.cost_price ?? 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('settingsProdutos.colSalePrice')}</p>
                        <p className="tabular-nums">{p.sale_price_formatted ?? fmt(p.sale_price)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('settingsProdutos.tax')}</p>
                        <p className="tabular-nums">{Number(p.tax_percentage)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('settingsProdutos.colMargin')}</p>
                        <p className="tabular-nums">{p.pricing ? `${p.pricing.margin_percentage}%` : '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('settingsProdutos.stock')}</p>
                        <p className="tabular-nums">{p.stock_quantity}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end gap-1 border-t border-gray-200 pt-2">
                      <Button size="icon" variant="ghost" onClick={() => openEditProduct(p)}>
                        <Pencil className="size-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <Trash2 className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('settingsProdutos.deleteProductTitle')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('settingsProdutos.deleteProductDescription', { name: p.name })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('settingsProdutos.cancel')}</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive hover:bg-destructive/90"
                              onClick={() => handleDeleteProduct(p)}
                            >
                              {t('settingsProdutos.remove')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )
        ) : sales.length === 0 ? (
          <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
            {t('settingsProdutos.emptySales')}
          </div>
        ) : (
          <>
            {/* Desktop / tablet: tabela */}
            <div className="hidden overflow-x-auto rounded-lg border border-gray-300 md:block">
              <Table className="min-w-full border-collapse bg-white text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-300 h-15">
                    <TableHead>{t('settingsProdutos.colDate')}</TableHead>
                    <TableHead>{t('settingsProdutos.colItems')}</TableHead>
                    <TableHead className="text-right">{t('settingsProdutos.gross')}</TableHead>
                    <TableHead className="text-right">{t('settingsProdutos.tax')}</TableHead>
                    <TableHead className="text-right">{t('settingsProdutos.total')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((s) => (
                    <TableRow className="border-b border-gray-300 h-15" key={s.id}>
                      <TableCell>{new Date(s.sold_at).toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="max-w-[320px] truncate">
                        {(s.items ?? []).map((i) => `${i.quantity}× ${i.product_name}`).join(', ')}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(s.total_gross)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(s.total_tax)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{fmt(s.total_amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: cards */}
            <div className="space-y-3 md:hidden">
              {sales.map((s) => (
                <div key={s.id} className="rounded-lg border border-gray-300 bg-white p-4 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{new Date(s.sold_at).toLocaleString('pt-BR')}</span>
                    <span className="font-semibold tabular-nums">{fmt(s.total_amount)}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {(s.items ?? []).map((i) => `${i.quantity}× ${i.product_name}`).join(', ')}
                  </p>
                  <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 text-xs text-muted-foreground">
                    <span>{t('settingsProdutos.gross')}: {fmt(s.total_gross)}</span>
                    <span>{t('settingsProdutos.tax')}: {fmt(s.total_tax)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Dialog produto */}
      <DashboardCreateFormDialog
        open={productDialog}
        onOpenChange={setProductDialog}
        title={editing ? t('settingsProdutos.editProductTitle') : t('settingsProdutos.newProduct')}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setProductDialog(false)} disabled={savingProduct}>
              {t('settingsProdutos.cancel')}
            </Button>
            <Button type="submit" form="product-create-form" className="bg-primary" disabled={savingProduct}>
              {savingProduct && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t('settingsProdutos.save')}
            </Button>
          </div>
        }
      >
        <form
          id="product-create-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveProduct();
          }}
          className="space-y-4 md:space-y-6"
        >
          <div className="space-y-2">
            <Label htmlFor="name">{t('settingsProdutos.nameLabel')}</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('settingsProdutos.descriptionLabel')}</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sku">{t('settingsProdutos.skuLabel')}</Label>
            <Input id="sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cost">{t('settingsProdutos.cost')}</Label>
              <CurrencyInput
                id="cost"
                value={form.cost_price}
                onValueChange={(v) => setForm({ ...form, cost_price: v })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale">{t('settingsProdutos.salePriceLabel')}</Label>
              <CurrencyInput
                id="sale"
                value={form.sale_price}
                onValueChange={(v) => setForm({ ...form, sale_price: v })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax">{t('settingsProdutos.taxPercentLabel')}</Label>
              <Input
                id="tax"
                type="number"
                step="0.01"
                value={form.tax_percentage}
                onChange={(e) => setForm({ ...form, tax_percentage: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">{t('settingsProdutos.stock')}</Label>
              <Input
                id="stock"
                type="number"
                step="0.0001"
                min={0}
                value={form.stock_quantity}
                onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minimum-stock">{t('settingsProdutos.minimumStockLabel')}</Label>
              <Input
                id="minimum-stock"
                type="number"
                step="0.0001"
                min={0}
                value={form.minimum_stock}
                onChange={(e) => setForm({ ...form, minimum_stock: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="item-type">{t('settingsProdutos.itemTypeLabel')}</Label>
              <Select
                value={form.item_type}
                onValueChange={(v) => setForm({ ...form, item_type: v as 'product' | 'consumable' })}
              >
                <SelectTrigger id="item-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">{t('settingsProdutos.itemTypeProduct')}</SelectItem>
                  <SelectItem value="consumable">{t('settingsProdutos.itemTypeConsumable')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('settingsProdutos.itemTypeHint')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="internal-code">{t('settingsProdutos.internalCodeLabel')}</Label>
              <Input
                id="internal-code"
                value={form.internal_code}
                onChange={(e) => setForm({ ...form, internal_code: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">{t('settingsProdutos.categoryLabel')}</Label>
              <CategorySelect categories={categories} value={form.category_id} onChange={(v) => setForm({ ...form, category_id: v })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">{t('settingsProdutos.supplierLabel')}</Label>
              <Select
                value={form.supplier_id ?? '__none__'}
                onValueChange={(v) => setForm({ ...form, supplier_id: v === '__none__' ? null : v })}
              >
                <SelectTrigger id="supplier" className="w-full">
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
          </div>

          <div className="flex items-center justify-between rounded-md border border-gray-300 p-3">
            <Label htmlFor="active" className="cursor-pointer">
              {t('settingsProdutos.activeProductLabel')}
            </Label>
            <Switch
              id="active"
              checked={form.active}
              onCheckedChange={(checked) => setForm({ ...form, active: checked })}
            />
          </div>

          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('settingsProdutos.marginLabel')}</span>
              <span className="font-medium">
                {fmt(formPreview.margin_value)} ({formPreview.margin_percentage}%)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('settingsProdutos.taxOnTopLabel')}</span>
              <span>{fmt(formPreview.tax_amount)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>{t('settingsProdutos.clientTotalLabel')}</span>
              <span>{fmt(formPreview.client_total)}</span>
            </div>
          </div>
        </form>
      </DashboardCreateFormDialog>
    </div>
  );
}

export default function ProdutosPage() {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<div className="p-6">{t('settingsProdutos.loading')}</div>}>
      <ProdutosContent />
    </Suspense>
  );
}
