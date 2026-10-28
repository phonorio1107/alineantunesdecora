# Fase 2: Telas, fluxos e modelo de dados (proposta)

> Status: **proposta aguardando aprovação do Pedro** (28/10/2026)
> Princípio: liberdade financeira para a Aline, com lançamento fácil (menos de 1 minuto, pelo celular).

## 1. Os números que o sistema responde

| Pergunta da Aline | Como o sistema calcula |
|---|---|
| Quanto tenho hoje? | Soma dos saldos das contas (banco, dinheiro, Pix) |
| Quanto lucrei no mês? | Entradas pagas − saídas pagas do mês, **sem** contar as retiradas dela |
| Quanto sobrou para mim? | Retiradas (pró-labore) feitas no mês e quanto ainda dá para retirar mantendo a reserva |
| Quanto tempo aguento sem receber? | Saldo de hoje ÷ média mensal de custos fixos + retirada mínima (últimos 3 meses) = **fôlego em meses** |
| Qual evento deu mais lucro? | Valor recebido do evento − custos lançados nele |
| Qual área rende mais? | Lucro separado por fonte: decoração, assessoria e workshops |
| Como vai ser o caixa nos próximos meses? | Saldo + entradas previstas − saídas previstas (parcelas de eventos e custos fixos) |

## 2. Telas

1. **Entrar**: e-mail e senha, recuperar senha, aceitar convite.
2. **Início (painel)**: quatro cartões (saldo de hoje, lucro do mês, quanto sobrou para a Aline, fôlego em meses), contas a receber e a pagar nos próximos 30 dias e um botão grande **"Lançar"**.
3. **Lançar** (feita para o celular): entrada ou saída → valor → categoria → (evento, opcional) → pago ou previsto. Data de hoje já preenchida.
4. **Lançamentos**: lista do mês com filtros (tipo, categoria, conta, evento, pago/previsto), busca e exportação em CSV.
5. **Eventos**: lista por data (próximos e realizados).
6. **Evento (detalhe)**: cliente, data, fonte, valor fechado, quanto já recebeu e quanto falta, custos, **lucro e margem**.
7. **Clientes**: lista e cadastro (CPF/CNPJ mascarado na lista).
8. **Relatórios**:
   - **Fechamento do mês**: entradas, saídas por categoria, lucro, retiradas e botão "Fechar mês"
   - **Fluxo de caixa**: 12 meses, com o realizado e o previsto
   - **Lucro por fonte e por evento**
9. **Configurações**: contas, categorias, custos fixos (recorrentes), reserva desejada, dados da empresa, usuários e minha conta.

## 3. Fluxos principais

- **Fechar um evento**: cadastrar o evento com o valor fechado → o sistema cria as parcelas previstas (ex.: sinal + restante) → a Aline marca cada parcela como recebida quando o dinheiro cai.
- **Gastar com um evento**: em "Lançar", escolher saída → valor → categoria (flores, balões, frete…) → evento. O lucro do evento se atualiza na hora.
- **Custos fixos**: cadastrados uma vez (aluguel, internet, imposto) → o sistema cria o lançamento previsto todo mês → a Aline só confirma o pagamento.
- **Retirada**: categoria especial "Retirada da Aline". Não entra como custo no lucro, mas sai do saldo.
- **Fechar o mês**: conferir o resumo → "Fechar mês" → os lançamentos daquele mês ficam travados (só um administrador reabre, e isso fica registrado).

## 4. Modelo de dados

Toda tabela de negócio tem `id` (uuid), `empresa_id`, `criado_em`, `atualizado_em`, `criado_por` e `excluido_em` (exclusão que dá para desfazer).

| Tabela | Para que serve | Campos principais |
|---|---|---|
| `empresas` | A empresa da Aline (e de futuros clientes do SaaS) | nome, logo, cor, reserva_meses_desejada |
| `usuarios_empresas` | Quem acessa qual empresa e com que perfil | usuario_id, empresa_id, papel (administrador/usuario) |
| `clientes` | Clientes das festas | nome, telefone, e-mail, endereço, cpf_cnpj |
| `eventos` | Cada festa, assessoria ou workshop | cliente_id (opcional para workshop), titulo, data_evento, fonte (decoracao/assessoria/workshop), valor_fechado, status (confirmado/realizado/cancelado) |
| `contas` | Onde o dinheiro fica | nome (Nubank, Dinheiro…), saldo_inicial |
| `categorias` | Classificação dos lançamentos | nome, tipo (entrada/saida), natureza (fixo/variavel/retirada) |
| `lancamentos` | Toda entrada e saída de dinheiro | tipo, valor, data_vencimento, data_pagamento (vazia = previsto), conta_id, categoria_id, evento_id (opcional), recorrencia_id (opcional), descricao |
| `recorrencias` | Custos fixos que se repetem | descricao, valor, dia_vencimento, categoria_id, conta_id, ativa |
| `fechamentos_mensais` | Meses fechados (trava os lançamentos) | mes_referencia, fechado_por, fechado_em, resumo (números congelados) |
| `registros_atividades` | Quem mudou o quê (lançamentos, eventos, clientes, fechamentos) | tabela, registro_id, acao, usuario_id, quando, mudanças |

Relações: um cliente tem vários eventos; um evento tem vários lançamentos; uma recorrência gera um lançamento por mês; cada lançamento pertence a uma conta e a uma categoria.

**Categorias que já vêm prontas** (dá para editar):
- Entradas: Decoração, Assessoria, Workshop, Outras entradas
- Saídas variáveis: Flores, Balões, Materiais, Frete, Ajudantes, Aluguel de peças
- Saídas fixas: Aluguel, Internet e telefone, Impostos (DAS), Ferramentas
- Retirada da Aline

## 5. Mapa de dados pessoais (rascunho; a base legal é a Aline quem indica)

| Dado | Para que serve | Base legal sugerida | Retenção sugerida |
|---|---|---|---|
| Nome do cliente | Identificar o evento | Execução de contrato (art. 7º, V) | 5 anos após o último evento |
| Telefone | Falar com o cliente sobre o evento | Execução de contrato | 5 anos após o último evento |
| E-mail | Enviar contrato e recibo | Execução de contrato | 5 anos após o último evento |
| Endereço | Local da montagem e contrato | Execução de contrato | 5 anos após o último evento |
| CPF/CNPJ | Contrato e nota fiscal | Obrigação legal/fiscal (art. 7º, II) e contrato | 5 anos (prazo fiscal) |
| E-mail e nome dos usuários do sistema | Acesso | Execução de contrato | Enquanto tiver acesso + 6 meses (registro de acesso, Marco Civil) |

Cuidados: CPF/CNPJ visível por completo só no detalhe do cliente; mascarado nas listas e exportações; nunca nos logs. Sem dados sensíveis (art. 11).
