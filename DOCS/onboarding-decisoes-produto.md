# Onboarding — decisões de produto para discutir

Data: 2026-07-30
Status: **lista de pontos em aberto**, para discussão. Depois de respondida, vira o plano de execução em etapas.

Contexto: já mapeamos tecnicamente o que existe hoje e o que falta (`onboarding-instalador-analysis.md`). Esta lista traduz os pontos que exigem uma decisão de negócio — não é sobre "como construir", é sobre "como queremos que o sistema se comporte".

---

## 1. Botões de call-to-action (já alinhado, só confirmar)

- Todos os botões da página inicial vão virar variações de "Começar agora grátis" e levar direto para o cadastro/teste grátis.
- O botão "Entrar" (login) do menu superior, para quem já é cliente, **continua existindo e não muda**.
- **Ponto solto a confirmar**: hoje existe também um botão "Agendar Demonstração" na página inicial (ao lado do "Começar Agora"). Ele continua existindo como está (para quem prefere falar com alguém antes de testar sozinho), ou sai de cena agora que o cadastro fica mais fácil?

---

## 2. O que é obrigatório no cadastro guiado vs. o que fica para depois

Este é o ponto central. A ideia: o cadastro guiado ("instalador") pede só o essencial para a clínica **conseguir começar a usar**; tudo o que não for essencial vira uma dica/tutorial dentro do sistema depois, sem travar ninguém.

Precisamos decidir, item por item, se ele é:
- **(A) Obrigatório durante o cadastro** — sem isso, a clínica não sai usável.
- **(B) Sugerido no cadastro, mas pode pular** — oferecido com opção pré-preenchida, mas dá pra avançar sem preencher.
- **(C) Só depois, via tutorial/dicas dentro do sistema** — nem aparece no cadastro guiado.

Itens a classificar:

| Item | O que é | Por que importa |
|---|---|---|
| Nome e "código" da clínica | Identificação básica da clínica no sistema | Sem isso não existe conta |
| Dados do responsável (dono/gerente) | Nome, e-mail e senha de quem administra | É o login principal da clínica |
| Dados fiscais (CPF/CNPJ, telefone) | Usados depois para cobrança | Hoje é opcional; sem CNPJ não dá pra emitir nota fiscal quando cobrarmos |
| Horário de funcionamento da clínica | Dias e horários que a clínica atende | **Sem isso, a agenda de consultas fica vazia** — ninguém consegue marcar horário |
| Tipos de atendimento (ex: consulta, retorno, vacina) | O "cardápio" de serviços que aparece na hora de marcar | **Sem isso também não dá pra marcar consulta** — não tem o que escolher |
| Cadastro de mais veterinários (além do dono) | Convidar a equipe que vai atender | Clínicas com mais de 1 profissional precisam disso logo; clínicas de 1 pessoa só, não |
| Agenda de cada veterinário | Em quais dias/horários cada um atende | Sem isso, mesmo com horário da clínica certo, o sistema não sabe quando aquele veterinário específico está disponível |
| Salas/equipamentos (recursos físicos) | Ex: sala de cirurgia, equipamento específico | Só importa pra quem usa agendamento por sala/equipamento — a maioria talvez nem precise |
| Convênios/planos de saúde aceitos | Quais convênios a clínica atende | Só relevante pra quem trabalha com convênio |
| Identidade visual (logo, cor, subdomínio próprio) | Personalização visual do sistema pra clínica | Não afeta o funcionamento, é só estética/marca |
| WhatsApp / atendimento automático por IA | Número de WhatsApp e assistente virtual | Recurso avançado, não essencial pra começar |
| Google Agenda | Sincronizar consultas com Google Calendar | Recurso avançado, não essencial pra começar |
| Modelos de termo de consentimento | Documentos que o tutor do pet assina | Só relevante pra quem usa esse tipo de documento |

**Pergunta direta**: bate os olhos nessa tabela e, junto com você, marca cada linha como A, B ou C. As 3 primeiras linhas praticamente têm que ser "A" (sem isso não existe conta). As linhas de "horário de funcionamento" e "tipos de atendimento" são as mais importantes de decidir, porque sem elas a clínica literalmente não consegue marcar uma consulta — vale a pena forçar isso no cadastro mesmo sendo mais uma etapa, ou aceitamos entregar a clínica "created mas ainda não agendável" e confiar no tutorial pra completar depois?

---

## 3. Como funciona o "tutorial pós-cadastro" pra quem pulou etapas

Você mencionou a ideia de dicas/tutorial guiado depois do cadastro para quem deixou algo opcional pra depois. Pontos a decidir:

- **Quão insistente ele deve ser?** Um aviso discreto (ex: "sua configuração está 60% completa") sempre visível até terminar, ou um tour guiado que aparece só na primeira vez e depois não incomoda mais?
- **O usuário consegue "dispensar" (ignorar de vez) sem nunca mais ver aquilo?** Ou o sistema sempre vai lembrar até ele realmente configurar?
- **Isso é por clínica ou por pessoa?** Se o dono configurou tudo mas um veterinário novo entra depois, esse veterinário também vê dicas de "coisas pra configurar"?

---

## 4. O que fazer quando o usuário erra ou desiste no meio do caminho

Essa é a parte de "não pode ter buraco" que você pediu — pensar em tudo que pode dar errado do lado do usuário:

- **A pessoa fecha o navegador ou perde a internet no meio do cadastro.** Nesse momento a clínica e o login dela já podem ter sido criados, só a configuração é que ficou pela metade. Quando ela voltar a entrar no sistema, o que deve acontecer: (a) ela cai direto no sistema normal, com um aviso de "termine sua configuração"; (b) o sistema retoma automaticamente o cadastro guiado exatamente de onde ela parou; ou (c) tanto faz, não precisa tratar isso de forma especial agora?
- **A pessoa digita um nome de clínica ou "código de acesso" que já existe.** Como avisamos e sugerimos uma alternativa, sem soar como erro técnico?
- **A pessoa tenta se cadastrar de novo com o mesmo e-mail** (esqueceu que já tinha uma conta, ou quer testar de novo). Bloqueamos e mandamos pra tela de login, ou permitimos e cria confusão?
- **A pessoa faz mais de um teste grátis com CNPJs diferentes (ou sem informar CNPJ nenhum), tentando esticar o período grátis.** Hoje o CNPJ é opcional no cadastro — ou seja, tecnicamente dá pra abrir teste grátis sem limite algum só não preenchendo esse campo. Vale tornar obrigatório pra fechar essa brecha, mesmo que isso deixe o cadastro um pouco mais burocrático?
- **Ninguém confirma que o e-mail digitado é real.** Hoje qualquer e-mail é aceito sem confirmação — se a pessoa digitar errado (ou for zoeira de alguém digitando o e-mail de outra pessoa), essa conta fica "presa": ninguém consegue recuperar a senha depois, porque o e-mail de recuperação vai pra uma caixa que ninguém acessa. Vale exigir confirmar o e-mail (clicar num link recebido) antes de liberar o uso completo, mesmo isso adicionando uma etapa a mais no início?
- **A pessoa clica duas vezes no botão de criar conta, ou abre o cadastro em duas abas.** Corremos risco de criar duas clínicas iguais sem querer — vale a pena travar isso (parece óbvio, mas confirmando que topam esse cuidado extra de desenvolvimento).

---

## 5. O que fazer quando algo falha do nosso lado (não é culpa do usuário)

- **Algum serviço externo que usamos por trás (ex: armazenamento de arquivos, sistema de cobrança) fica fora do ar bem na hora do cadastro.** Hoje, se isso acontece, a criação da clínica inteira é cancelada e a pessoa precisa tentar tudo de novo do zero — péssima primeira impressão. Preferimos: (a) manter assim (mais simples, mas arriscado se acontecer numa hora ruim); ou (b) criar a clínica mesmo assim e resolver esse detalhe de bastidor depois, sem o usuário nem perceber que algo falhou?
- **Uma das etapas do cadastro guiado falha no meio** (ex: salvou o horário de funcionamento, mas a etapa de cadastrar o primeiro tipo de atendimento deu erro de conexão). O sistema deve: guardar o que já deu certo e deixar a pessoa tentar de novo só a etapa que falhou, ou refazer tudo desde o início?

---

## 6. Cadastro de outros veterinários / equipe

- **Hoje, quando o administrador cadastra um veterinário, é ele (o admin) quem digita a senha da pessoa na hora** — como se fosse o dono entregando um usuário e senha prontos. Alternativa mais profissional (e mais segura): o admin só informa nome e e-mail, o sistema manda um convite por e-mail, e cada veterinário cria a própria senha ao aceitar. Qual dos dois modelos preferem? (O segundo é mais trabalhoso de construir, mas evita o dono "saber a senha" de cada funcionário, o que geralmente é visto como boa prática.)

---

## 7. O que acontece com a tela de cadastro que já existe hoje

- Hoje já existe uma página de cadastro separada (fora do modal novo), acessível por link direto. Ela deve deixar de existir (tudo passa a ser só pelo modal novo, a partir da página inicial), ou continuar existindo como "porta dos fundos" para quem chega por um link direto de propaganda/parceiro, por exemplo?

---

## 8. Situações de "conta que nunca decola"

- **Uma clínica é criada no teste grátis mas a pessoa nunca mais volta pra terminar de configurar nem usar.** Depois de quantos dias consideramos isso "abandonado"? Vale mandar um e-mail de "vimos que você começou, precisa de ajuda?" Ou apagar a conta depois de um tempo? Ou não fazer nada e deixar lá?
- **O período de teste grátis (14 dias) termina e a clínica nunca chegou a se configurar direito** (nem marcou uma consulta sequer). O que deve acontecer: perde acesso igual quem usou o sistema normalmente, ganha uma prorrogação automática por ainda não ter "começado de verdade", ou tanto faz por enquanto?

---

## 9. Uma pessoa, mais de uma clínica

- Hoje o sistema tecnicamente não impede a mesma pessoa (mesmo e-mail) de ser dona de mais de uma clínica cadastrando de novo, mas isso nunca foi pensado com cuidado. É um cenário real que vocês querem suportar bem (ex: rede de clínicas, ou um investidor com várias unidades), ou não é prioridade agora?

---

## Como isso vai virar plano de execução

Depois que vocês decidirem cada ponto, eu volto e:
1. Marco cada item da tabela da seção 2 como obrigatório no cadastro guiado, opcional (com tutorial depois) ou fora de escopo por agora.
2. Desenho o comportamento exato para cada cenário de falha da seção 4 e 5 (sem deixar buraco, como vocês pediram).
3. Quebro tudo isso em etapas de desenvolvimento entregáveis (não precisa ser tudo de uma vez).
