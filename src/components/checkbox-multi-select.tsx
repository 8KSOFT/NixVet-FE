'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type CheckboxMultiSelectOption = {
  value: string;
  label: string;
  description?: string;
};

type Props = {
  options: CheckboxMultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
};

export function CheckboxMultiSelect({ options, selected, onChange, emptyMessage, className, disabled }: Props) {
  const toggle = (value: string, checked: boolean) => {
    if (checked) {
      onChange([...selected, value]);
    } else {
      onChange(selected.filter((v) => v !== value));
    }
  };

  if (options.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">{emptyMessage ?? 'Nenhum item disponível.'}</p>
    );
  }

  return (
    <div
      className={cn(
        'max-h-64 space-y-2 overflow-y-auto rounded-md border border-gray-300 p-3',
        disabled && 'opacity-60',
        className,
      )}
    >
      {options.map((option) => {
        const id = `checkbox-multi-${option.value}`;
        const checked = selected.includes(option.value);
        return (
          <div key={option.value} className="flex items-start gap-2">
            <Checkbox
              id={id}
              checked={checked}
              disabled={disabled}
              onCheckedChange={(value) => toggle(option.value, value === true)}
            />
            <div className="min-w-0">
              <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
                {option.label}
              </Label>
              {option.description && <p className="text-xs text-muted-foreground">{option.description}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
