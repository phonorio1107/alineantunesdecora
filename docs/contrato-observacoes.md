# Contrato da Aline: pontos para revisão de um advogado

> O sistema reproduz **palavra por palavra** o contrato que a Aline usa hoje (modelo `aline-2026-10-v1`, em `src/pdf/clausulas.ts`).
> Só viram campos: dados bancários e PIX, prazo do saldo (cláusula 3) e cidade do foro (cláusula 8), que vêm de Configurações.
> Ao comparar o texto com a entrevista e com o próprio contrato, aparecem os pontos abaixo. **Não alterei nada**: a decisão é da Aline com um advogado.
> Se o texto mudar, o identificador do modelo muda junto (ex.: `aline-2027-01-v2`), e os contratos já emitidos continuam com o texto da época.

| # | Onde | O que chama atenção |
|---|---|---|
| 1 | Cláusulas 1, 7.1 e 7.3 | Falam em **locação de itens**, "sublocados", "material locado", "Locadora" e "Locatário". Na entrevista, a Aline disse que **não aluga peças para a cliente**: ela vende o serviço de decoração e usa as próprias peças. O contrato pode estar descrevendo outro tipo de negócio. |
| 2 | Cláusulas 3 e 5 | A cláusula 3 fala em **multa de 20%** por inadimplência; a 5 fala em **multa de 2% + juros de 1% ao mês** pelo atraso. As duas tratam de falta de pagamento com valores diferentes. Em relação com consumidor, o Código de Defesa do Consumidor costuma limitar a multa por atraso; vale o advogado avaliar. |
| 3 | Cláusula 6 | Validade do orçamento de **3 dias**. Na entrevista, a Aline disse que o orçamento vale **10 dias**. |
| 4 | Cláusula 7.5, item A | "Devolução de 80% do **valor pago**" e, na mesma frase, "retendo 20% do **valor total**". As bases são diferentes (pago × total) e podem dar valores diferentes. |
| 5 | Cláusula 7.5, item C | Retenção de **100%** quando a desistência é com menos de 15 dias úteis. Retenções integrais podem ser questionadas; vale o advogado avaliar. |
| 6 | Vários | Mistura de "CONTRATADA", "DECORADORA", "Locadora" e de "CONTRATANTE", "Solicitante", "Locatário" para as mesmas partes. Padronizar evita dúvida de interpretação. |
| 7 | Cláusula 8 | Foro definido pela empresa. Em contrato com consumidor, o foro do domicílio do consumidor costuma prevalecer; vale confirmar. |

## Dados pessoais no contrato

O contrato emitido guarda uma **cópia congelada** com nome, CPF/CNPJ, telefone e endereço da cliente (tabela `contratos`, só a proprietária acessa). Pelo mapa de dados da Fase 2, essa cópia segue o prazo de **5 anos** depois do último evento.
