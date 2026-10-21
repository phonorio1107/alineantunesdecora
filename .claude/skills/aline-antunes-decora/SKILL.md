---
name: aline-antunes-decora
description: Contexto do negócio da Aline Antunes Decora (assessoria e decoração de eventos em Louveira/SP) e regras para construir o SaaS de gestão dela. Use sempre que for criar, alterar ou revisar qualquer tela, regra, cálculo, texto, dado de exemplo ou tabela do sistema — orçamentos, pacotes, agenda, ordens de serviço, acervo, financeiro, PDF para cliente ou perfis de acesso.
---

# Aline Antunes Decora

Fonte: entrevista com a Aline (proprietária). O que estiver marcado **[a definir]** ainda não foi respondido. Não invente esses valores; deixe-os configuráveis no sistema.

## A empresa

- **Nome:** "Aline Antunes Decora." (com ponto final, como na logo). Na interface use "Aline Antunes Decora".
- **Fundação:** 2015. A Aline começou decorando as festas dos próprios filhos e se identificou com a área.
- **Formação:** Gestão de Eventos. Tem repertório de cursos e experiência em **balões** e **arranjos florais**.
- **Diferenciais:** projetos exclusivos, assessoria completa, domínio de balões e arranjos florais.
- **Sede:** Louveira/SP. O escritório é também o **acervo**: é onde ela atende clientes e guarda as peças.
- **Região atendida:** Jundiaí, Campinas, Valinhos, Vinhedo e São Paulo são as principais, mas não as únicas. Cobra **taxa de deslocamento** **[a definir: valor/regra por distância]**.
- **Volume:** cerca de **4 festas por mês**. **Acontece de ter mais de uma festa no mesmo dia.**

## Cultura e tom de voz

- Personalidade da marca: **divertida e acolhedora**.
- Valores: **educação** da equipe com clientes e com todos no evento; **apresentação impecável**, na vestimenta e no acabamento do trabalho.
- Textos do sistema e documentos para o cliente: calorosos, simpáticos e educados, sem exageros nem gírias. Trate a cliente pelo nome. Exemplo: "Olá, Juliana! Que alegria fazer parte desse momento."
- Visual: rosa da marca `#DE799B`, cinza `#696969`, títulos em fonte serifada elegante (Playfair Display), corpo limpo (Plus Jakarta Sans). Use a logo de `public/logo.png`. A filha da Aline vai divulgar o sistema nas redes, então cada tela precisa causar boa primeira impressão.

## Serviços

| Tipo de evento | Observação |
| --- | --- |
| Festa infantil | **Carro-chefe**, o que mais sai |
| Casamento, 15 anos, chá (bebê/revelação), batizado, corporativo | Também atende |

Dois serviços, que podem ser vendidos juntos:

1. **Decoração.** Normalmente vendida em **pacotes prontos**. Se a cliente quer algo muito específico, a Aline monta um **orçamento exclusivo**.
2. **Assessoria.** Todo o apoio **antes** do evento: indicar docinhos, local, fotógrafo e lembrancinhas, e orientar na decoração.

### Pacotes de decoração

| Pacote | Posição |
| --- | --- |
| **Especial** | Entrada |
| **Excepcional** | Intermediário |
| **Extraordinário** | Topo |

A diferença entre eles é a **quantidade e o acervo de peças** incluídos. Preços e lista de peças de cada pacote: **[a definir]**. No sistema, o pacote é um modelo de orçamento editável (itens + preço base), e o orçamento exclusivo parte do zero.

## Fluxo comercial

1. **Contato:** chega principalmente por **Instagram** e **indicação**. Registre a origem de cada cliente; isso alimenta os relatórios.
2. **Dados mínimos para orçar:** **data**, **local** e **tema**. Convidados, tipo de evento e pacote são complementares.
3. **Orçamento:** hoje é montado à mão no Canva e enviado em PDF. **Validade: 10 dias** a partir do envio. O sistema deve gerar o **PDF automaticamente**, com a marca, e permitir enviar por link no WhatsApp.
4. **Fechamento e pagamento:**
   - **Entrada de 30%** para reservar a data.
   - **Pix:** o restante deve estar **quitado até 5 dias antes do evento**.
   - **Cartão de crédito:** até **10x**, com **juros da operadora repassados à cliente**.
5. **Contrato:** há contrato. Cancelamento e troca de data geram **multa** **[a definir: percentual/regra]**; às vezes as partes chegam a um acordo, então a multa precisa poder ser ajustada manualmente.

Regras que o sistema deve aplicar:

- Orçamento enviado há mais de 10 dias sem resposta → status **vencido**, com sugestão de follow-up.
- Ao aprovar: gerar a cobrança da entrada (30%) e a do saldo, com vencimento em `data_evento - 5 dias`.
- Alertar saldo não quitado quando faltarem 5 dias ou menos para o evento.
- Ao marcar uma data, avisar se já existe outra festa no mesmo dia (é permitido, mas o acervo e a equipe precisam ser divididos).

## Operação do evento

- **Antes:** separar as peças do acervo, comprar o material de consumo (flores naturais, balões, fitas...), contratar os freelancers e alinhar fornecedores.
- **Equipe:** **freelancers pagos por festa**. Cada pagamento é um **custo do evento**.
- **Dia da festa:** a equipe chega **3 horas antes** do início. A montagem leva em média **2 h** (pequenas cerca de 1 h; grandes 3 h ou mais). Use isso para sugerir o horário de chegada.
- **Desmontagem:** no mesmo dia ou em data posterior, pela Aline e a equipe. Agende como compromisso separado.
- **Conferência pós-festa:** é o ponto fraco hoje. Ela esquece de conferir e já perdeu ou quebrou peças ao longo dos anos. O sistema deve exigir um **check-in de devolução** de cada peça que saiu (voltou / quebrada / perdida) antes de concluir a ordem de serviço, e registrar o prejuízo.

## Acervo

- Mais de **200 peças**, todas guardadas no escritório/acervo de Louveira.
- As peças são **próprias** e usadas **dentro** das festas. **Não há locação para o cliente.**
- Categorias: painéis, cilindros e mobiliário, mesas, boleiras, bandejas, arranjos, tecidos, iluminação, entre outras. **Não tem letreiros.**
- **Estratégia:** priorizar peças **neutras** e reduzir as tematizadas. Cada peça é marcada como **neutra** ou **tematizada**, e o sistema mostra a proporção.
- Dados por peça: nome, categoria, quantidade, valor unitário (custo), volume, cor, neutra/tematizada, local na prateleira, estado de conservação e foto.
- **Material de consumo** (balões, fitas, flores naturais...) também é controlado, separado das peças permanentes. Ele sai do estoque quando é usado numa festa e entra no custo dela.
- **Disponibilidade:** com festas no mesmo dia, o sistema deve impedir que a mesma peça seja reservada acima da quantidade existente.
- Hoje ela usa o **EstoqueNow**, mas não o alimenta 100%. Ofereça importação por planilha (CSV) para migrar o cadastro.
- Cadastrar e dar baixa precisa ser rápido no celular, ou o controle não se mantém.

## Financeiro (prioridade nº 1)

Maior dor dela: "Nunca sei quanto tempo minha empresa duraria se eu parasse hoje, ou quanto estou faturando ou tenho líquido para uso pessoal."

O sistema deve responder com clareza:

1. **Custo por festa:** freelancers, material de consumo, compras específicas, deslocamento, taxas de cartão e peças perdidas ou quebradas. Mostrar **receita – custos = lucro da festa** e a **margem %**.
2. **Faturamento:** do mês e do ano, contratado x recebido x a receber.
3. **Lucro líquido** do período, descontados também os custos fixos (aluguel, contas, assinaturas...) **[a definir: lista de custos fixos]**.
4. **Distribuição do lucro:** percentuais configuráveis para empresa (reserva/reinvestimento) e para a Aline (pró-labore/uso pessoal) **[a definir: percentuais]**. Mostre quanto ela pode retirar com segurança.
5. **Fôlego da empresa:** "se eu parasse hoje" = caixa disponível ÷ custo fixo mensal = **meses de sobrevivência**.
6. **Insights:** ticket médio, festas por tipo e por pacote, festas mais e menos lucrativas, origem dos clientes, sazonalidade por mês e taxa de aprovação dos orçamentos.

Dashboards bonitos e fáceis de ler, com números em R$ (`pt-BR`) e explicações em linguagem simples, não em jargão contábil.

## Perfis de acesso

| Perfil | Acesso |
| --- | --- |
| **Proprietária** (Aline) | Tudo, inclusive o financeiro e as configurações |
| **Assistente/gestão** | Clientes, agenda, orçamentos, ordens e acervo; financeiro só se liberado |
| **Equipe/freelancer** | Só as festas em que está escalado: horário, local, checklist e peças. **Sem valores** |

Restrinja o acesso no banco (RLS no Supabase), não apenas escondendo itens na tela.

## Dispositivos

Ela usa principalmente **celular e tablet**. Projete primeiro para toque: botões grandes, ações principais ao alcance do polegar e tablet aproveitando a largura (duas colunas). O computador é secundário, mas deve ficar bonito para as divulgações.

## Prioridades do produto

1. Financeiro: custo e lucro por festa, lucro líquido, distribuição e fôlego.
2. Orçamento com PDF automático e link para WhatsApp (pacotes Especial, Excepcional e Extraordinário + exclusivo).
3. Agenda com alerta de festas no mesmo dia e controle de pagamentos (entrada e saldo).
4. Ordens de serviço com separação de peças e check-in de devolução.
5. Acervo: neutras x tematizadas, material de consumo e importação do EstoqueNow.
6. Perfis de acesso.

## Dados de exemplo

Use dados coerentes com o negócio real: clientes de Louveira, Jundiaí, Campinas, Valinhos, Vinhedo e São Paulo; maioria de festas infantis; cerca de 4 festas por mês; pacotes Especial, Excepcional e Extraordinário; peças majoritariamente neutras; nenhum letreiro.

## Pendências para perguntar à Aline

- Preço base e peças de cada pacote.
- Regra da taxa de deslocamento.
- Percentual da multa de cancelamento e de troca de data.
- Lista e valores dos custos fixos mensais.
- Percentuais desejados para empresa e para uso pessoal.
- Quanto costuma pagar por freelancer, por festa.
