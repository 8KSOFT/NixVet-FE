'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ProductCategory } from '@/app/types/product';

interface CategorySelectProps {
  categories: ProductCategory[];
  value: string | null;
  onChange: (categoryId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

const NONE_VALUE = '__none__';

/**
 * Não existe nenhum componente de árvore no projeto — grupo por categoria-mãe
 * (SelectGroup/SelectLabel) com as subcategorias como itens do grupo é a opção
 * mais barata dado o que já existe no design system (shadcn Select).
 */
export function CategorySelect({ categories, value, onChange, placeholder, disabled }: CategorySelectProps) {
  const { t } = useTranslation();

  const roots = useMemo(
    () => categories.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [categories],
  );
  const childrenByParent = useMemo(() => {
    const map = new Map<string, ProductCategory[]>();
    for (const category of categories) {
      if (!category.parent_id) continue;
      const list = map.get(category.parent_id) ?? [];
      list.push(category);
      map.set(category.parent_id, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    }
    return map;
  }, [categories]);

  return (
    <Select
      value={value ?? NONE_VALUE}
      onValueChange={(v) => onChange(v === NONE_VALUE ? null : v)}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder ?? t('settingsProdutos.categories.selectPlaceholder')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE}>{t('settingsProdutos.categories.none')}</SelectItem>
        {roots.map((root) => {
          const children = childrenByParent.get(root.id) ?? [];
          return (
            <SelectGroup key={root.id}>
              <SelectLabel>{root.name}</SelectLabel>
              <SelectItem value={root.id}>{root.name}</SelectItem>
              {children.map((child) => (
                <SelectItem key={child.id} value={child.id}>
                  <span className="pl-3">{child.name}</span>
                </SelectItem>
              ))}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
}
