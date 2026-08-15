# Handoff: Lançamentos Financeiros (Desktop + Mobile) — NixVetApp

## Overview
Redesign da tela de Lançamentos Financeiros: cards de resumo (Receitas, Despesas, Pendentes, Resultado do período em destaque), tabs (Sugeridos/Confirmados/Cancelados), filtros, e lista de lançamentos com ação de confirmar forma de pagamento. Duas referências: desktop (`lancamentos-desktop.html`) e mobile (`lancamentos-mobile.html`).

## About the Design Files
Referências visuais estáticas (HTML/CSS), não código de produção. Recrie no código atual do NixVetApp com o framework, componentes e state management existentes. Onde faltar um primitivo (Card de stat, Tabs, Badge, Item de lista), crie seguindo os padrões já usados no projeto.

## Fidelidade
Alta fidelidade em cores, espaçamento, raios e textos (português mantido exatamente). Dados mostrados são ilustrativos — usar dados reais do backend na implementação.

## Design Tokens
- Cores: brand-600 `#0c8a5f` (destaque, botões), brand-700 `#0a7350`, brand-50 `#eefaf4`, brand-100 `#d3f0e2`; ink `#1a2420`, ink-2 `#5a6a63`, ink-3 `#8a9791`; line `#e2e8e5`, line-2 `#eef2f0`; verde receita `#0a7350`/`#e3f7ee`; vermelho despesa `#b4394a`/`#fdeef0`; warn `#d97706`/`#fef3e2`.
- Radius: 10px (botões, inputs, badges), 12–14px (cards).
- Fonte: Inter, pesos 400/600/700/800.

## Desktop (`lancamentos-desktop.html`)
- Sidebar fixa 248px (já existente no app) com submenu Financeiro expandido, item "Lançamentos" ativo.
- Topbar: busca, notificações, seletor de idioma, usuário.
- Header da página: título + subtítulo + botão primário "Lançamento".
- **4 cards de resumo** em grid: Receitas do período, Despesas do período, Pendentes de confirmação, e **Resultado do período** (card destacado em verde sólido, com variação percentual).
- Tabs: Sugeridos (com contador), Confirmados, Cancelados.
- Barra de filtros: De/Até (datas), Tipo, Categoria, Busca, Limpar filtros, Exportar (.xlsx).
- Tabela: Descrição (+ subtexto de origem), Categoria (badge), Data, Forma de pagamento (ícone + label), Valor (verde=entrada com "+", vermelho=saída com "−"), botão "Confirmar" por linha.
- FAB fixo inferior direito.

## Mobile (`lancamentos-mobile.html`)
- Topbar simplificada: menu + avatar.
- Título + subtítulo.
- **Hero card** de Resultado do período em verde sólido no topo.
- Mini-cards de Receitas/Despesas/Pendentes em scroll horizontal.
- Tabs horizontais com scroll.
- Campo de busca.
- Lista vertical de lançamentos em cards (descrição, valor, badge de categoria, forma de pagamento, botão "Confirmar" full-width).
- FAB fixo inferior direito.

## Interações
- Tabs alternam o filtro da lista/tabela (client-side).
- Botão "Confirmar" dispara a ação de confirmação já existente no backend — aqui é só o visual.
- Filtros desktop (datas, tipo, categoria, busca) devem se conectar à lógica de filtragem já existente.
- Exportar (.xlsx) usa a exportação já existente no sistema, se houver.

## Arquivos
- `lancamentos-desktop.html`
- `lancamentos-mobile.html`
