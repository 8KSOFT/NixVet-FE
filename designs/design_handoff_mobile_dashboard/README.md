# Handoff: Dashboard Mobile Redesign (NixVetApp)

## Overview
Redesign do dashboard mobile ("Visão geral") com card de destaque (Atendimentos hoje) + gráfico sparkline, grid de cards menores com mini-gráficos (barra/linha) e chips de ícone coloridos por categoria.

## About the Design Files
`mobile-dashboard-design.html` é uma **referência visual** (HTML/CSS estático) — mostra o visual e a estrutura, não é código de produção. Recrie essa UI no código atual do NixVetApp, usando o framework, componentes e state management existentes. Onde faltar um primitivo (Card, Chip, Sparkline), crie seguindo os padrões já usados no projeto.

## Fidelidade
**Alta fidelidade** em cores, espaçamento, raios e tipografia. Textos em português devem ser mantidos exatamente. Os gráficos (sparkline, mini barras) são ilustrativos — usar dados reais do backend na implementação, mas manter o estilo visual (linha fina, barras arredondadas, sem eixos/labels).

## Design Tokens
- Cores: brand-600 `#0c8a5f` (card de destaque, FAB), brand-50 `#eefaf4`, brand-700 `#0a7350`; ink `#1a2420`, ink-2 `#5a6a63`; line `#e2e8e5`, line-2 `#eef2f0`; blue `#2563eb`/`#eaf1ff`; warn `#d97706`/`#fef3e2`; rosa (pacientes) `#c2417a`/`#fdeef5`.
- Radius: 14px (cards, hero, topo dos icon-buttons 10px).
- Fonte: Inter, pesos 400/700/800.
- Cards: fundo branco, borda 1px `var(--line)`, sem sombra (exceto o FAB, que tem sombra verde suave).

## Estrutura da tela
1. **Topbar**: menu hambúrguer, busca, sino de notificação, avatar circular com iniciais.
2. **Título** "Visão geral", 26px bold.
3. **Card de destaque (hero)**: fundo brand-600 sólido, label + valor grande em branco (38px), sparkline SVG (linha branca) no canto superior direito, texto de variação "+2 vs. ontem" com seta para cima.
4. **Grid 2 colunas** de cards menores (Novos pacientes, Receita do mês, Canceladas, Conversas não respondidas): cada um com chip de ícone tonal (32px, radius 9px) e, quando fizer sentido, um mini-gráfico (barras ou linha) ao lado do chip; valor grande (22px bold) + label (12px, ink-2) abaixo.
5. **Seção "Consultas de hoje"** com link "Ver agenda" à direita.
6. **FAB fixo** inferior: pill verde "Configuração 25%" com ícone de check, sombra verde suave.

## Interações
- Sem novas interações além do hover padrão; os cards do grid podem ser clicáveis para navegar à tela detalhada da métrica (mesma lógica que hoje).
- Sparkline/mini-gráficos são apenas visuais (sem interação).

## Assets
Ícones stroke-style (Lucide/Feather): grid/calendário, pata (pacientes), cifrão, x-circle (canceladas), balão de mensagem (conversas), menu, busca, sino, seta-cima.

## Arquivos
- `mobile-dashboard-design.html` — referência HTML completa da tela.
