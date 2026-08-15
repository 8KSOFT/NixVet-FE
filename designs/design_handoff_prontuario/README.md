# Handoff: Prontuário — Cabeçalho Redesenhado (NixVetApp)

## Overview
Redesign do cabeçalho da tela de Prontuário do paciente. Antes era uma tag simples + campo com nome do responsável + chips soltos. Agora é um banner de identidade em destaque (verde da marca, gradiente sutil + textura de pontos), com avatar do pet, tag "Paciente ativo", nome grande, responsável com ícone, e os dados (espécie/raça/idade/peso/sexo) como pills com ícone dentro do próprio banner. A foto do pet em estilo Polaroid presa com clipe (elemento que o usuário já gostava) foi mantida, agora sobreposta ao card, levemente rotacionada.

## About the Design Files
`prontuario-design.html` é uma **referência visual estática** — não é código de produção. Recrie no código atual do NixVetApp, com o framework, componentes e state management existentes. Onde faltar um primitivo (Banner de identidade, Stat pill, Polaroid), crie seguindo os padrões já usados no projeto. O restante da tela (sidebar, topbar, tabs, lista de fichas, linha do tempo) segue o padrão já existente no app — só o cabeçalho muda de fato.

## Fidelidade
**Alta fidelidade** no cabeçalho (cores, gradiente, pills, polaroid). O resto da tela pode seguir os componentes já existentes no app sem precisar recriar do zero — o objetivo principal é o cabeçalho.

## Design Tokens
- Cores do banner: gradiente diagonal `var(--brand-700) → var(--brand-600) → #0d9d68`, textura de pontos sutil sobreposta, círculo decorativo translúcido no canto superior direito.
- Pills de dado: fundo `rgba(255,255,255,.13)`, borda `rgba(255,255,255,.22)`, radius 12px, label pequeno maiúsculo + valor em negrito.
- Tag "Paciente ativo": pill translúcida com ícone de check.
- Avatar do pet: 76×76px, radius 20px, fundo translúcido, ícone de pata em branco.
- Polaroid: card branco pequeno (108px), padding, sombra `0 14px 30px -8px rgba(0,0,0,.35)`, rotação 4°, clipe de metal (SVG stroke) preso no topo, foto do pet listrada (placeholder) ou real quando disponível.
- Radius geral do banner: 22px.

## Estrutura do cabeçalho
1. Breadcrumb "‹ Prontuários" acima do banner, botão "+ Nova ficha" fixo no canto superior direito da página.
2. **Banner** (linha superior): avatar do pet + coluna com tag "Paciente ativo", nome do pet em 36px bold, linha "Responsável: [nome]" com ícone de usuário.
3. **Faixa de stats** dentro do banner: pills com ícone para Espécie, Raça, Idade, Peso, Sexo — cada um com label pequeno + valor.
4. **Foto Polaroid** ancorada no canto superior direito do banner, sobre o gradiente, com clipe de metal preso no topo e leve rotação.
5. Abaixo do banner: tabs (Visão geral / Vacinas / Acompanhamento) e o conteúdo em duas colunas (Fichas de atendimento + Linha do tempo) — sem mudanças estruturais, mesmo padrão do app atual.

## Interações
- Sem novas interações; tabs e lista de fichas mantêm a lógica já existente.
- A foto Polaroid deve aceitar upload/preview da foto real do pet quando disponível (hoje é placeholder).

## Arquivos
- `prontuario-design.html` — referência HTML completa da tela com o novo cabeçalho.
