# Onboarding Fase 4 — o que mudou e como reverter

Data: 2026-07-31
Só frontend, nenhuma mudança de backend/schema. Reverter é só reverter código.

## O que essa fase adiciona

Widget flutuante (`src/components/onboarding/SetupChecklistWidget.tsx`),
canto inferior direito, visível só para `admin`/`manager` (nunca superadmin),
com uma lista de 8 itens opcionais que não bloqueiam o uso do sistema:
mais veterinários, agenda por veterinário, salas/equipamentos, convênios,
identidade visual, WhatsApp, Google Agenda, modelos de termo. Cada item
reaproveita hooks já existentes das telas de Settings (nenhum endpoint novo)
pra saber se já foi feito ou não.

- Progresso e "dispensar" são salvos em `localStorage`, por `userId` — não
  por clínica. Um veterinário novo que loga depois ainda vê suas próprias
  pendências, mesmo que o admin já tenha dispensado o widget dele.
- Some sozinho quando chega a 100% ou quando o usuário clica em dispensar
  (ícone "×" no painel expandido).

## Checklist rápido pra validar o deploy

- Logar como admin numa clínica recém-onboardada → widget aparece com % baixo.
- Clicar num item pendente → abre a tela de Settings correspondente.
- Completar um item (ex.: cadastrar um segundo veterinário) e voltar pro
  dashboard → percentual sobe.
- Clicar no "×" → widget some e não volta nem depois de recarregar a página
  (mesmo usuário, mesmo navegador).
- Logar como `veterinarian`/`reception` → widget nunca aparece.
- Logar como `superadmin` → widget nunca aparece.

## Como reverter

Reversão de código simples, sem dependência de outras fases:
```bash
git revert <hash-do-commit-fase-4>
```
Nada no backend ou no banco depende disso — reverter é seguro isoladamente,
ao contrário das Fases 1/2/3.
