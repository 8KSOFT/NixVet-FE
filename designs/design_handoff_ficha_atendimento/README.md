# Handoff: Ficha de Atendimento — Desktop + Mobile (NixVetApp)

## Overview
Redesign da ficha de atendimento clínico (prontuário do paciente). O problema anterior: todos os campos com a mesma intensidade visual, amontoados, sem hierarquia. Nova versão organiza o conteúdo em seções com eyebrow label + cards distintos por tipo de informação, dando peso visual proporcional à importância de cada bloco.

## About the Design Files
`ficha-desktop.html` e `ficha-mobile.html` são **referências visuais estáticas** — não código de produção. Recrie no código atual do NixVetApp, usando o framework, componentes, validação e state management existentes. Onde faltar um primitivo (Card de seção, campo com unidade sufixa, card tracejado), crie seguindo os padrões já usados no projeto.

## Fidelidade
Alta fidelidade em cores, espaçamento, hierarquia visual e textos (português mantido exatamente). Dados são ilustrativos.

## Design Tokens
- Cores: brand-600 `#0c8a5f`, brand-700 `#0a7350`, brand-50 `#eefaf4`, brand-100 `#d3f0e2`; ink `#1a2420`, ink-2 `#5a6a63`, ink-3 `#8a9791`; line `#e2e8e5`, line-2 `#eef2f0`.
- Radius: 9-10px (inputs, botões), 14px (cards).
- Fonte: Inter.

## Hierarquia visual (a mudança principal)
1. **Cabeçalho** (card branco): ícone de documento + nome do pet + badge "Aberto"; pills de metadados (espécie/raça, data, veterinário) com ícone; ações "Salvar" (preenchido) e "Fechar ficha" (outline) alinhadas à direita.
2. **Eyebrow labels** (texto pequeno maiúsculo cinza) acima de cada seção — "Motivo da consulta", "Exame físico", "Avaliação", "Complementar" — para o olho escanear rapidamente o que é o quê.
3. **Motivo da consulta**: card branco simples com Queixa principal (input) + Anamnese (textarea) + botão "Formatar com IA" (chip verde claro).
4. **Exame físico**: card com **cabeçalho tintado** (fundo verde claro, ícone, título, seta de collapse) para destacá-lo como bloco de dados estruturados; grid de campos com **unidade sufixa dentro do input** (kg, °C, bpm, mpm, s) em vez de label separado — reduz ruído visual.
5. **Diagnóstico presuntivo**: card com **fundo gradiente verde claro sutil e borda verde** — destaca esse campo como o mais importante da ficha (é a conclusão clínica).
6. **Notas da equipe / Observações para o tutor**: cards com **borda tracejada** e fundo levemente acinzentado — sinaliza visualmente que são complementares/secundários, lado a lado no desktop.
7. Tabs (Clínico/Prescrições/Exames/Vacinas/Anexos) permanecem no topo do conteúdo, mesmo padrão do app.

## Desktop (`ficha-desktop.html`)
- Sidebar e topbar padrão do app.
- Grid de Exame físico em 4 colunas.
- Notas da equipe / Observações lado a lado (2 colunas).
- FAB fixo "Configuração 25%" mantido.

## Mobile (`ficha-mobile.html`)
- Topbar simplificada: "‹ Voltar" + menu de opções.
- Cabeçalho compacto, pills de metadados com wrap.
- Tabs em scroll horizontal.
- Grid de Exame físico em 2 colunas.
- Notas da equipe / Observações empilhadas.
- **Barra de ações fixa no rodapé** (Fechar / Salvar) em vez de botões no cabeçalho.

## Interações
- Botão de collapse no card "Exame físico" recolhe/expande a seção (estado local).
- "Formatar com IA" dispara a ação de IA já existente no backend — apenas o visual mudou.
- Validação e submit seguem a lógica já existente no formulário atual.

## Arquivos
- `ficha-desktop.html`
- `ficha-mobile.html`
