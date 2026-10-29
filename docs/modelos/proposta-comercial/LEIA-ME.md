# Proposta comercial (modelo)

Proposta de 2 páginas com o design system Pedro Hoffman Degrau: o que o sistema faz, o que a implantação e a mensalidade incluem, o que fica de fora e as condições.

```bash
node docs/modelos/proposta-comercial/gerar.cjs docs/modelos/proposta-comercial/exemplo.json proposta.pdf
```

Para um cliente novo: copie `exemplo.json`, troque código, data, cliente, responsável, valores e escopo, e gere o PDF.

**Antes de usar com um cliente de verdade:**
- Os valores (R$ 2.500 e R$ 199,90) são o rascunho de 30/10/2026; a faixa decidida é setup de R$ 2.500 a R$ 3.500 e mensalidade de R$ 199 a R$ 249. Valide com 2 ou 3 prospectos.
- A linha "O que a mensalidade inclui" pressupõe que **você** hospeda e faz o backup. Se o cliente ficar com as próprias contas (decisão em aberto no `PROJETO.md`), troque por "licença de uso e manutenção" e diga que a hospedagem fica na conta dele, nos planos gratuitos, sem garantia de disponibilidade do fornecedor.
- As condições (prazo mínimo, reajuste, atraso, saída dos dados, LGPD) precisam estar iguais no contrato, que deve passar por um advogado.
- Gerar no sandbox sem acesso ao Google Fonts usa uma fonte parecida; no seu computador sai com Inter.
