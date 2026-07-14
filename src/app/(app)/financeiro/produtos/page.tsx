'use client';

import React, { useMemo, useState } from 'react';
import { Plus, Package, ShoppingCart, Trash2, Pencil, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import type { Product, ProductPayload } from '@/app/types/product';
import {
  useCreateProductMutation,
  useCreateProductSaleMutation,
  useDeleteProductMutation,
  useProductsQuery,
  useProductSalesQuery,
  useUpdateProductMutation,
} from '@/hooks/apiHooks/useProducts';

function fmt(n: number | null | undefined) {
  return Number(n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

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
};

export default function ProdutosPage() {
  const [tab, setTab] = useState<'products' | 'sales'>('products');

  const { data: products = [], isLoading: loadingProducts } = useProductsQuery(true);
  const { data: sales = [], isLoading: loadingSales } = useProductSalesQuery();

  const createProduct = useCreateProductMutation();
  const updateProduct = useUpdateProductMutation();
  const deleteProduct = useDeleteProductMutation();
  const createSale = useCreateProductSaleMutation();

  const loading = tab === 'products' ? loadingProducts : loadingSales;

  // Dialog produto
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [productDialog, setProductDialog] = useState(false);

  // Dialog venda
  const [saleDialog, setSaleDialog] = useState(false);
  const [cart, setCart] = useState<{ product_id: string; quantity: number }[]>([]);

  const openNewProduct = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setProductDialog(true);
  };

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
    });
    setProductDialog(true);
  };

  const formPreview = useMemo(
    () => computeMargin(Number(form.sale_price) || 0, Number(form.cost_price) || 0, Number(form.tax_percentage) || 0),
    [form.sale_price, form.cost_price, form.tax_percentage],
  );

  const saveProduct = async () => {
    if (!form.name.trim() || !form.sale_price) {
      toast.error('Informe nome e preço de venda');
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
    };
    try {
      if (editing) {
        await updateProduct.mutateAsync({ id: editing.id, payload });
        toast.success('Produto atualizado');
      } else {
        await createProduct.mutateAsync(payload);
        toast.success('Produto criado');
      }
      setProductDialog(false);
    } catch {
      toast.error('Erro ao salvar produto');
    }
  };

  const savingProduct = createProduct.isPending || updateProduct.isPending;

  const handleDeleteProduct = async (p: Product) => {
    try {
      await deleteProduct.mutateAsync(p.id);
      toast.success('Produto removido');
    } catch {
      toast.error('Erro ao remover produto');
    }
  };

  // ----- Venda -----
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const addToCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === productId);
      if (existing) return prev.map((i) => (i.product_id === productId ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { product_id: productId, quantity: 1 }];
    });
  };

  const setQty = (productId: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product_id === productId ? { ...i, quantity: qty } : i))
        .filter((i) => i.quantity > 0),
    );
  };

  const cartTotals = useMemo(() => {
    let gross = 0;
    let tax = 0;
    for (const item of cart) {
      const p = productById.get(item.product_id);
      if (!p) continue;
      const lineGross = Number(p.sale_price) * item.quantity;
      gross += lineGross;
      tax += (lineGross * Number(p.tax_percentage)) / 100;
    }
    return { gross, tax, total: gross + tax };
  }, [cart, productById]);

  const openSale = () => {
    setCart([]);
    setSaleDialog(true);
  };

  const submitSale = async () => {
    if (cart.length === 0) {
      toast.error('Adicione ao menos um produto');
      return;
    }
    try {
      await createSale.mutateAsync({ items: cart });
      toast.success('Venda registrada — lançamento financeiro gerado');
      setSaleDialog(false);
    } catch {
      toast.error('Erro ao registrar venda');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produtos / Farmácia</h1>
          <p className="text-sm text-muted-foreground">
            Cadastro de produtos e vendas. Cada venda gera um lançamento financeiro sugerido.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openNewProduct}>
            <Plus className="mr-2 size-4" /> Novo produto
          </Button>
          <Button onClick={openSale}>
            <ShoppingCart className="mr-2 size-4" /> Nova venda
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === 'products' ? 'default' : 'outline'} size="sm" onClick={() => setTab('products')}>
          <Package className="mr-2 size-4" /> Produtos
        </Button>
        <Button variant={tab === 'sales' ? 'default' : 'outline'} size="sm" onClick={() => setTab('sales')}>
          <ShoppingCart className="mr-2 size-4" /> Vendas
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : tab === 'products' ? (
            products.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum produto cadastrado.</p>
            ) : (
              <div className="overflow-x-auto">
              <Table className="min-w-full border-collapse bg-white text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-300 h-15">
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Venda</TableHead>
                    <TableHead className="text-right">Imposto</TableHead>
                    <TableHead className="text-right">Margem</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
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
                        {p.cost_price_formatted ?? fmt(p.cost_price)}
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
                                <AlertDialogTitle>Remover produto</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja remover &quot;{p.name}&quot;? Essa ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive hover:bg-destructive/90"
                                  onClick={() => handleDeleteProduct(p)}
                                >
                                  Remover
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
            )
          ) : sales.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma venda registrada.</p>
          ) : (
            <div className="overflow-x-auto">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-15">
                  <TableHead>Data</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead className="text-right">Bruto</TableHead>
                  <TableHead className="text-right">Imposto</TableHead>
                  <TableHead className="text-right">Total</TableHead>
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
          )}
        </CardContent>
      </Card>

      {/* Dialog produto */}
      <Dialog open={productDialog} onOpenChange={setProductDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar produto' : 'Novo produto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="sku">SKU / código (opcional)</Label>
              <Input id="sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cost">Custo (R$)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={form.cost_price}
                  onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="sale">Preço de venda (R$)</Label>
                <Input
                  id="sale"
                  type="number"
                  step="0.01"
                  value={form.sale_price}
                  onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="tax">Imposto (%)</Label>
                <Input
                  id="tax"
                  type="number"
                  step="0.01"
                  value={form.tax_percentage}
                  onChange={(e) => setForm({ ...form, tax_percentage: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="stock">Estoque</Label>
                <Input
                  id="stock"
                  type="number"
                  value={form.stock_quantity}
                  onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <Label htmlFor="active" className="cursor-pointer">
                Produto ativo
              </Label>
              <Switch
                id="active"
                checked={form.active}
                onCheckedChange={(checked) => setForm({ ...form, active: checked })}
              />
            </div>

            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Margem (lucro)</span>
                <span className="font-medium">
                  {fmt(formPreview.margin_value)} ({formPreview.margin_percentage}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Imposto por cima</span>
                <span>{fmt(formPreview.tax_amount)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total ao cliente (à vista)</span>
                <span>{fmt(formPreview.client_total)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialog(false)} disabled={savingProduct}>
              Cancelar
            </Button>
            <Button onClick={saveProduct} disabled={savingProduct}>
              {savingProduct && <Loader2 className="mr-2 size-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog venda */}
      <Dialog open={saleDialog} onOpenChange={setSaleDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova venda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {products.filter((p) => p.active).map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => addToCart(p.id)}
                  className="flex w-full items-center justify-between rounded-md border border-border p-2 text-left text-sm hover:bg-muted/50"
                >
                  <span>{p.name}</span>
                  <span className="text-muted-foreground">{p.sale_price_formatted ?? fmt(p.sale_price)}</span>
                </button>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="space-y-2 border-t pt-3">
                {cart.map((item) => {
                  const p = productById.get(item.product_id);
                  if (!p) return null;
                  return (
                    <div key={item.product_id} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 truncate">{p.name}</span>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => setQty(item.product_id, Number(e.target.value))}
                        className="w-16"
                      />
                      <span className="w-24 text-right tabular-nums">
                        {fmt(Number(p.sale_price) * item.quantity)}
                      </span>
                    </div>
                  );
                })}
                <div className="border-t pt-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bruto</span>
                    <span>{fmt(cartTotals.gross)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Imposto</span>
                    <span>{fmt(cartTotals.tax)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{fmt(cartTotals.total)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaleDialog(false)} disabled={createSale.isPending}>
              Cancelar
            </Button>
            <Button onClick={submitSale} disabled={createSale.isPending || cart.length === 0}>
              {createSale.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Registrar venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
