import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EstadoErro } from './estado-erro';

const erroDaApi = (status: number, data: object) => ({ isAxiosError: true, response: { status, data } });

describe('EstadoErro', () => {
  it('é um alerta com a mensagem padrão', () => {
    render(<EstadoErro />);
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os dados.');
  });

  it('mostra a mensagem do servidor', () => {
    render(<EstadoErro error={erroDaApi(403, { statusCode: 403, message: 'Sem permissão' })} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Sem permissão');
  });

  it('em 5xx acrescenta o código para o suporte achar o log', () => {
    render(<EstadoErro error={erroDaApi(500, { statusCode: 500, message: 'Falha', requestId: 'abcdef1234567890' })} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Falha Código: abcdef12');
  });

  it('sem conexão não mostra o texto técnico em inglês', () => {
    render(<EstadoErro error={{ isAxiosError: true, code: 'ERR_NETWORK', message: 'Network Error' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Sem conexão com o servidor');
    expect(screen.getByRole('alert')).not.toHaveTextContent('Network Error');
  });

  it('"Tentar de novo" só aparece com onRetry e chama a função', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = render(<EstadoErro />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(<EstadoErro onRetry={onRetry} />);
    await user.click(screen.getByRole('button', { name: /tentar de novo/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
