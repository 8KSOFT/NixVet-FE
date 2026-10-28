import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ListPagination } from './list-pagination';

const base = { page: 2, totalPages: 5, total: 230, pageSize: 50, onPageChange: () => {} };

describe('ListPagination', () => {
  it('mostra o intervalo e o total', () => {
    render(<ListPagination {...base} />);
    expect(screen.getByText(/51–100 de 230/)).toBeInTheDocument();
    expect(screen.getByText(/Pág\. 2 \/ 5/)).toBeInTheDocument();
  });

  it('a última página mostra só o que sobra', () => {
    render(<ListPagination {...base} page={5} />);
    expect(screen.getByText(/201–230 de 230/)).toBeInTheDocument();
  });

  it('navega: primeira, anterior, próxima e última', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<ListPagination {...base} onPageChange={onPageChange} />);
    await user.click(screen.getByLabelText('Primeira página'));
    await user.click(screen.getByLabelText('Página anterior'));
    await user.click(screen.getByLabelText('Próxima página'));
    await user.click(screen.getByLabelText('Última página'));
    expect(onPageChange.mock.calls.map((c) => c[0])).toEqual([1, 1, 3, 5]);
  });

  it('na primeira página os botões de voltar ficam desabilitados, na última os de avançar', () => {
    const { rerender } = render(<ListPagination {...base} page={1} />);
    expect(screen.getByLabelText('Primeira página')).toBeDisabled();
    expect(screen.getByLabelText('Página anterior')).toBeDisabled();
    expect(screen.getByLabelText('Próxima página')).toBeEnabled();
    rerender(<ListPagination {...base} page={5} />);
    expect(screen.getByLabelText('Próxima página')).toBeDisabled();
    expect(screen.getByLabelText('Última página')).toBeDisabled();
  });

  it('disabled trava tudo', () => {
    render(<ListPagination {...base} disabled />);
    for (const rotulo of ['Primeira página', 'Página anterior', 'Próxima página', 'Última página']) {
      expect(screen.getByLabelText(rotulo)).toBeDisabled();
    }
  });

  it('sem itens não desenha nada, e total inválido conta como zero', () => {
    const { container, rerender } = render(<ListPagination {...base} total={0} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<ListPagination {...base} total={Number.NaN} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('uma página só: mostra o total e nenhum botão', () => {
    render(<ListPagination {...base} page={1} totalPages={1} total={12} />);
    expect(screen.getByText(/1–12 de 12/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Próxima página')).not.toBeInTheDocument();
  });

  it('showTotal=false esconde o texto do total', () => {
    render(<ListPagination {...base} showTotal={false} />);
    expect(screen.queryByText(/de 230/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Próxima página')).toBeInTheDocument();
  });
});
