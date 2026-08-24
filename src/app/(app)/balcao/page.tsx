'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import {
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  Loader2,
  PackageX,
  AlertTriangle,
  ArrowLeft,
  Wallet,
  Boxes,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { useCreateProductSaleMutation, useProductsQuery } from '@/hooks/apiHooks/useProducts';
import { useProductCategoriesQuery } from '@/hooks/apiHooks/useStock';
import { usePaymentOptionsMutation } from '@/hooks/apiHooks/useFinancialReports';
import { useCurrencyFormatter } from '@/lib/i18n/currency';

const ALL_CATEGORIES = '__all__';

const METHOD_LABEL_KEYS: Record<string, string> = {
  cash: 'cash',
  pix: 'pix',
  debit: 'debit',
  credit_1x: 'credit1x',
  credit_2_6x: 'credit26x',
  credit_7_12x: 'credit712x',
  boleto: 'boleto',
};

interface CartLine {
  product_id: string;
  quantity: number;
}

export default function BalcaoPage() {
  const { t } = useTranslation();
  const fmt = useCurrencyFormatter();
  const { data: products = [], isLoading } = useProductsQuery();
  const { data: categories = [] } = useProductCategoriesQuery();
  const createSale = useCreateProductSaleMutation();
  const paymentOptions = usePaymentOptionsMutation();

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>(ALL_CATEGORIES);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<'cart' | 'payment'>('cart');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const sellable = useMemo(() => products.filter((p) => p.item_type === 'product' && p.active), [products]);
  const productById = useMemo(() => new Map(sellable.map((p) => [p.id, p])), [sellable]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sellable.filter((p) => {
      if (categoryId !== ALL_CATEGORIES && p.category_id !== categoryId) return false;
      if (!query) return true;
      return (
        p.name.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query) ||
        p.internal_code?.toLowerCase().includes(query)
      );
    });
  }, [sellable, search, categoryId]);

  const addToCart = (productId: string) => {
    if (step === 'payment') return;
    const product = productById.get(productId);
    if (!product || Number(product.stock_quantity) <= 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === productId);
      if (existing) {
        const nextQty = existing.quantity + 1;
        if (nextQty > Number(product.stock_quantity)) return prev;
        return prev.map((i) => (i.product_id === productId ? { ...i, quantity: nextQty } : i));
      }
      return [...prev, { product_id: productId, quantity: 1 }];
    });
  };

  const setQty = (productId: string, qty: number) => {
    const product = productById.get(productId);
    const clamped = product ? Math.min(qty, Number(product.stock_quantity)) : qty;
    setCart((prev) =>
      prev.map((i) => (i.product_id === productId ? { ...i, quantity: clamped } : i)).filter((i) => i.quantity > 0),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product_id !== productId));
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

  const totalItems = useMemo(() => cart.reduce((sum, i) => sum + i.quantity, 0), [cart]);

  const goToPayment = async () => {
    if (cart.length === 0) {
      toast.error(t('balcao.emptyCartError'));
      return;
    }
    setSelectedMethod(null);
    try {
      await paymentOptions.mutateAsync(cartTotals.total);
      setStep('payment');
    } catch {
      toast.error(t('balcao.paymentOptionsError'));
    }
  };

  const backToCart = () => {
    setStep('cart');
    setSelectedMethod(null);
  };

  const finishSale = async () => {
    if (!selectedMethod) {
      toast.error(t('balcao.selectPaymentMethodError'));
      return;
    }
    try {
      await createSale.mutateAsync({
        items: cart,
        notes: notes.trim() || undefined,
        payment_method: selectedMethod,
      });
      toast.success(t('balcao.saleSuccess'));
      setCart([]);
      setNotes('');
      setStep('cart');
      setSelectedMethod(null);
      setCartOpen(false);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      const backendMessage = axiosError.response?.data?.message;
      toast.error(backendMessage || t('balcao.saleError'));
    }
  };

  const cartStepContent = (
    <>
      <div className="flex items-center gap-2 font-semibold">
        <ShoppingCart className="size-4" /> {t('balcao.cartTitle')}
      </div>

      {cart.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t('balcao.emptyCart')}</p>
      ) : (
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {cart.map((item) => {
            const p = productById.get(item.product_id);
            if (!p) return null;
            return (
              <div key={item.product_id} className="space-y-1 rounded-md border p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{p.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeFromCart(item.product_id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-7"
                      onClick={() => setQty(item.product_id, item.quantity - 1)}
                    >
                      <Minus className="size-3.5" />
                    </Button>
                    <span className="w-8 text-center text-sm tabular-nums">{item.quantity}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-7"
                      onClick={() => setQty(item.product_id, item.quantity + 1)}
                      disabled={item.quantity >= Number(p.stock_quantity)}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                  <span className="text-sm font-medium tabular-nums">
                    {fmt(Number(p.sale_price) * item.quantity)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Textarea
        placeholder={t('balcao.notesPlaceholder')}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="min-h-16"
      />

      <div className="space-y-1 border-t pt-2 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>{t('settingsProdutos.gross')}</span>
          <span>{fmt(cartTotals.gross)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>{t('settingsProdutos.tax')}</span>
          <span>{fmt(cartTotals.tax)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold">
          <span>{t('settingsProdutos.total')}</span>
          <span>{fmt(cartTotals.total)}</span>
        </div>
      </div>

      <Button className="w-full" disabled={cart.length === 0 || paymentOptions.isPending} onClick={goToPayment}>
        {paymentOptions.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
        {t('balcao.goToPayment')}
      </Button>
    </>
  );

  const paymentStepContent = (
    <>
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="icon" className="size-7 -ml-1" onClick={backToCart}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-2 font-semibold">
          <Wallet className="size-4" /> {t('balcao.paymentTitle')}
        </div>
      </div>

      <div className="rounded-md bg-muted/50 p-3 text-sm">
        <div className="flex justify-between text-base font-semibold">
          <span>{t('settingsProdutos.total')}</span>
          <span>{fmt(cartTotals.total)}</span>
        </div>
      </div>

      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {paymentOptions.data === undefined || paymentOptions.data.length === 0 ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          paymentOptions.data.map((o) => {
            const key = METHOD_LABEL_KEYS[o.method];
            const label = key ? t(`balcao.methodLabels.${key}`) : o.method;
            return (
              <button
                type="button"
                key={o.method}
                onClick={() => setSelectedMethod(o.method)}
                className={`flex w-full items-center justify-between rounded-md border p-3 text-left text-sm transition ${
                  selectedMethod === o.method
                    ? 'border-primary ring-1 ring-primary'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <span className="font-medium">{label}</span>
                <div className="text-right">
                  <div className="font-semibold">{fmt(o.client_pays)}</div>
                  {o.fee_amount > 0 ? (
                    <div className="text-xs text-muted-foreground">
                      {t('balcao.feeAmountSuffix', { amount: fmt(o.fee_amount) })}
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })
        )}
      </div>

      <Button className="w-full" disabled={!selectedMethod || createSale.isPending} onClick={finishSale}>
        {createSale.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
        {t('balcao.finishSale')}
      </Button>
    </>
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_380px]">
      <div
        className={`space-y-4 ${cart.length > 0 ? 'pb-24 md:pb-0' : ''} ${step === 'payment' ? 'md:pointer-events-none md:opacity-50' : ''}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('balcao.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('balcao.subtitle')}</p>
          </div>
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/settings/produtos">
              <Boxes className="mr-2 size-4" /> {t('balcao.manageStock')}
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder={t('balcao.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES}>{t('balcao.allCategories')}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-lg border border-gray-300 bg-white py-12 text-center text-sm text-slate-500">
            {t('balcao.noProductsFound')}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((p) => {
              const outOfStock = Number(p.stock_quantity) <= 0;
              const lowStock = !outOfStock && Number(p.stock_quantity) <= Number(p.minimum_stock);
              const inCart = cart.find((i) => i.product_id === p.id);
              return (
                <Card
                  key={p.id}
                  className={`cursor-pointer p-0 transition-colors ${outOfStock ? 'cursor-not-allowed opacity-50' : 'hover:border-primary'}${inCart ? ' border-primary' : ''}`}
                  onClick={() => !outOfStock && addToCart(p.id)}
                >
                  <CardContent className="flex h-32 flex-col justify-between p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      {p.sku ? <p className="truncate text-xs text-muted-foreground">{p.sku}</p> : null}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold tabular-nums">{p.sale_price_formatted ?? fmt(p.sale_price)}</p>
                      {outOfStock ? (
                        <Badge variant="destructive" className="gap-1">
                          <PackageX className="size-3" /> {t('balcao.outOfStock')}
                        </Badge>
                      ) : lowStock ? (
                        <Badge className="gap-1 bg-amber-100 text-amber-700 hover:bg-amber-100">
                          <AlertTriangle className="size-3" /> {t('balcao.lowStock')}
                        </Badge>
                      ) : inCart ? (
                        <Badge variant="secondary">{t('balcao.inCart', { count: inCart.quantity })}</Badge>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop: painel do carrinho fixo ao lado, sempre visível */}
      <div className="hidden md:sticky md:top-4 md:block md:self-start">
        <Card>
          <CardContent className="space-y-3 p-4">
            {step === 'cart' ? cartStepContent : paymentStepContent}
          </CardContent>
        </Card>
      </div>

      {/* Mobile: barra fixa no rodapé (some quando o carrinho está vazio) +
          modal (bottom sheet, base do Dialog) com o mesmo conteúdo do
          carrinho/checkout do desktop — abrir o carrinho não deveria exigir
          rolar a página inteira pra baixo, passando por toda a grade de
          produtos. */}
      {cart.length > 0 && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 flex items-center justify-between gap-3 rounded-full bg-primary px-5 py-3.5 text-white shadow-lg md:hidden"
        >
          <span className="flex items-center gap-3 font-semibold">
            <span className="relative flex shrink-0 items-center">
              <ShoppingCart className="size-5" />
              <span className="absolute -top-2 -right-2 flex size-4.5 min-w-4.5 items-center justify-center rounded-full bg-white px-0.5 text-[10px] font-bold text-primary">
                {totalItems}
              </span>
            </span>
            {t('balcao.viewCart')}
          </span>
          <span className="font-semibold tabular-nums">{fmt(cartTotals.total)}</span>
        </button>
      )}

      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="md:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{step === 'cart' ? t('balcao.cartTitle') : t('balcao.paymentTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">{step === 'cart' ? cartStepContent : paymentStepContent}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
