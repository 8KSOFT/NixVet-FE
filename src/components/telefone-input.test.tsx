import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TelefoneInput } from './telefone-input';

function Campo({ inicial = '', aoMudar }: { inicial?: string; aoMudar?: (v: string) => void }) {
  const [v, setV] = useState(inicial);
  return (
    <TelefoneInput
      aria-label="Telefone"
      value={v}
      onValueChange={(novo) => {
        setV(novo);
        aoMudar?.(novo);
      }}
    />
  );
}

describe('TelefoneInput', () => {
  it('aplica a máscara a cada tecla', async () => {
    const user = userEvent.setup();
    render(<Campo />);
    const campo = screen.getByLabelText('Telefone');
    await user.type(campo, '11912345678');
    expect(campo).toHaveValue('(11) 91234-5678');
  });

  it('mostra a máscara mesmo quando o valor chega só com dígitos', () => {
    render(<Campo inicial="11912345678" />);
    expect(screen.getByLabelText('Telefone')).toHaveValue('(11) 91234-5678');
  });

  it('colar com +55 vira número nacional (sem maxLength cortando antes)', async () => {
    const user = userEvent.setup();
    const aoMudar = vi.fn();
    render(<Campo aoMudar={aoMudar} />);
    await user.click(screen.getByLabelText('Telefone'));
    await user.paste('+55 11 91234-5678');
    expect(screen.getByLabelText('Telefone')).toHaveValue('(11) 91234-5678');
    expect(aoMudar).toHaveBeenLastCalledWith('(11) 91234-5678');
  });

  it('ignora letras', async () => {
    const user = userEvent.setup();
    render(<Campo />);
    await user.type(screen.getByLabelText('Telefone'), 'abc11');
    expect(screen.getByLabelText('Telefone')).toHaveValue('(11');
  });

  it('é um campo de telefone: teclado numérico, autocompletar e placeholder', () => {
    render(<Campo />);
    const campo = screen.getByLabelText('Telefone');
    expect(campo).toHaveAttribute('type', 'tel');
    expect(campo).toHaveAttribute('inputmode', 'tel');
    expect(campo).toHaveAttribute('placeholder', '(11) 91234-5678');
    expect(campo).not.toHaveAttribute('maxlength');
  });

  it('vazio quando o valor é null', () => {
    render(<TelefoneInput aria-label="Telefone" value={null} onValueChange={() => {}} />);
    expect(screen.getByLabelText('Telefone')).toHaveValue('');
  });
});
