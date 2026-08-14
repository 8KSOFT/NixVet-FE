# Handoff: Prontuário Mobile (NixVetApp)

## Overview
Versão mobile do cabeçalho de Prontuário (mesmo padrão visual da versão desktop já implementada): banner verde com gradiente, avatar do pet, tag "Paciente ativo", nome, responsável, stats em pills com scroll horizontal, e foto Polaroid presa com clipe, agora ancorada na parte inferior do banner (sobreposta) para caber na largura mobile.

## About the Design Files
`prontuario-mobile-design.html` é uma **referência visual estática** para telas estreitas — não é código de produção. Implemente como o breakpoint mobile da mesma tela de Prontuário (reaproveitando os componentes já criados para o desktop), ajustando apenas layout/responsividade.

## Fidelidade
Alta fidelidade em cores, radius e textos. Mesma paleta e tokens do cabeçalho desktop.

## Diferenças em relação ao desktop
- Avatar do pet menor (58px) e nome do pet 26px.
- Stats em **scroll horizontal** (pills) em vez de wrap.
- Foto Polaroid menor (86px), ancorada saindo por baixo do banner (bottom: -40px, overflow visível) em vez de no canto superior.
- Tabs ocupam a largura toda, 3 colunas iguais, labels curtos (Geral / Vacinas / Acomp.).
- Lista de fichas em cards empilhados (data + badge no topo, título abaixo) em vez de linha única.
- Topbar simplificada: breadcrumb "‹ Prontuários" + botão de ação.
- FAB fixo inferior direito "Nova ficha".

## Arquivos
- `prontuario-mobile-design.html`
