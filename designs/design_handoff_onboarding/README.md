# Handoff: Onboarding Redesign (NixVetApp)

## Overview
Redesign do fluxo de onboarding (6 etapas: Clínica, Responsável, Fiscal, Horário, Atendimentos, Pronto). Layout dividido: painel esquerdo de marca fixo + painel direito com formulário por etapa, stepper de progresso no topo. Mantido o verde da identidade visual.

## About the Design Files
`onboarding-design.html` é uma **referência visual/interativa** (HTML/CSS/JS estático, navegável por Continuar/Voltar) — não é código de produção. Recrie essa UI no código atual do NixVetApp, usando o framework, componentes, validação e state management existentes. Onde faltar um primitivo (Stepper, Input com ícone, Switch, Card de resumo), crie seguindo os padrões já usados no projeto.

## Fidelidade
**Alta fidelidade** em cores, espaçamento, raios, tipografia e microcopy (textos em português mantidos exatamente, sem travessões). Validação e lógica de submissão devem seguir o que já existe no backend/formulário atual — aqui é só a camada visual.

## Design Tokens
- Cores: brand-600 `#0c8a5f` (painel lateral, botão primário, foco), brand-700 `#0a7350`, brand-50 `#eefaf4`, brand-100 `#d3f0e2`; ink `#1a2420`, ink-2 `#5a6a63`, ink-3 `#8a9791`; line `#e2e8e5`.
- Radius: 10px (inputs, botões), 12px (cards), 20px (container geral).
- Fonte: Inter, pesos 400/500/600/700/800.
- Sombra do container: `0 30px 60px -20px rgba(10,40,25,.25)`.

## Estrutura

### Painel esquerdo (fixo, 380px, gradiente verde)
- Logo (marca de 4 círculos) + "NixVetApp" + tagline "Software de Gestão Veterinária".
- Textura de pontos sutil de fundo + círculo decorativo translúcido no canto inferior direito.
- Badge pill "14 dias grátis, sem cartão" com ícone de check.
- Título grande "Configure sua clínica em minutos" + subtítulo.
- Lista de 4 diferenciais com ícone em chip translúcido: Prontuário eletrônico completo, Agenda e lembretes automáticos, WhatsApp integrado, IA clínica e chatbot inteligente.
- Rodapé "Já tem conta? Fazer login".

### Painel direito (formulário)
- **Stepper** no topo: 6 círculos numerados conectados por linha; etapa atual com anel verde claro ao redor, etapas concluídas viram check verde preenchido, linha de conexão preenche conforme progresso.
- **Inputs**: pill com ícone à esquerda, borda cinza clara, foco = borda verde + halo verde suave (`box-shadow` brand-50).
- **Etapa 1 — Clínica**: Nome da clínica, Código de acesso (com hint de formato).
- **Etapa 2 — Responsável**: Nome completo, E-mail, Senha, Confirmar senha.
- **Etapa 3 — Fiscal**: CPF/CNPJ, Telefone/WhatsApp (opcional). Sem resumo nesta etapa. Texto legal de Termos/Privacidade abaixo dos botões.
- **Etapa 4 — Horário**: linha "Segunda a sexta" com dois campos de horário; dois toggles (switch) para "Abre aos sábados" / "Abre aos domingos", card fica destacado (borda + fundo verde claro) quando ativado.
- **Etapa 5 — Atendimentos**: lista de serviços com checkbox + nome + campo de duração em minutos (Consulta Clínica, Retorno, Vacinação, Curativo, Avaliação Pré-cirúrgica).
- **Etapa 6 — Pronto**: ícone de check em card verde claro, título "Tudo pronto!", texto explicativo, e um **card "Resumo"** em lista (ícone + linha) com: nome da clínica/código, nome/e-mail do responsável, "14 dias de acesso completo gratuito", "Sem cobrança automática. Você escolhe o plano depois". Botões "Voltar" e "Entrar no sistema".
- **Botões**: "Continuar" (verde preenchido, sombra verde suave, ícone seta) sempre à direita; "Voltar" (outline branco) à esquerda quando aplicável.

## Interações
- Continuar/Voltar navegam entre as 6 etapas, atualizando o stepper (preenchido = concluído, anel = ativo).
- Switches de sábado/domingo alternam estado visual (borda + fundo).
- Validação de campos deve seguir a lógica já existente no formulário atual (apenas atualizar o visual).

## Arquivos
- `onboarding-design.html` — referência HTML/CSS/JS completa e navegável das 6 etapas.
