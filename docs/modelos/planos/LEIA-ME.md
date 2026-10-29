# Planos para o WhatsApp

8 lâminas verticais (1080×1350, formato que o WhatsApp mostra inteiro no celular) e um PDF com todas, no design system Pedro Hoffman Degrau.

```bash
node docs/modelos/planos/gerar.cjs
```

Saída em `docs/modelos/planos/saida/`: `planos-1.png` a `planos-8.png` e `planos-pedro-hoffman.pdf`. Preços, itens e prazos ficam em `planos.json`; o texto fixo das lâminas, em `apresentacao.html`. Fontes Inter e Inter Tight incluídas em `fontes/` (licença OFL).

**Como enviar:** as 8 imagens de uma vez (o WhatsApp mostra em sequência) ou só o PDF. Para um primeiro contato, a lâmina 3 (planos) sozinha já funciona.

---

## Por trás dos planos (uso interno, não enviar)

> Rascunho de 30/10/2026. Valores a validar com 2 ou 3 prospectos. Custos de ferramentas mudam: confira nas páginas oficiais antes de fechar contrato.

### Os três planos

| | Essencial | Profissional | Parceiro |
|---|---|---|---|
| Implantação | R$ 1.500 | R$ 2.500 | R$ 3.900 |
| Mensalidade | R$ 129,90 | R$ 199,90 | R$ 399,90 |
| O que é | Só o financeiro | O sistema da Aline (financeiro + clientes, eventos e contratos) | Profissional + 1 tela sob medida + site de apresentação |
| Usuários | 2 | 4 | 8 |
| Backup guardado | 7 dias | 30 dias | 1 ano (+ ensaio de recuperação semestral) |
| Revisão técnica | Trimestral | Mensal | Quinzenal |
| Ajustes | 1 por trimestre (até 1 h) | 1 por mês (até 1 h) | Até 3 h por mês |
| Urgência | 1 dia útil | 4 h úteis | 4 h úteis, na frente da fila |
| Conversa | — | Trimestral | Mensal |

### Quanto do seu tempo cada plano usa por mês (estimativa no pior caso)

| | Essencial | Profissional | Parceiro |
|---|---|---|---|
| Revisão técnica (30 min cada, com a automação) | ~10 min | 30 min | 1 h |
| Ajustes e melhorias, se o cliente usar tudo | ~20 min | 1 h | 3 h |
| Suporte (dúvidas e chamados) | ~1 h | ~1,5 h | ~2 h |
| Conversa de acompanhamento | — | ~10 min | 30 min |
| **Total** | **~1,5 h** | **~3,2 h** | **~6,5 h** |
| **Mensalidade por hora** | **~R$ 85** | **~R$ 62** | **~R$ 61** |

Na prática, a maioria dos clientes não usa todos os ajustes, e a hora real sai melhor. Com 5 clientes no Profissional, são uns 16 horas por mês: cabe em 4 noites de 1 hora por semana.

Por isso, ao calcular, mudei duas coisas em relação à primeira versão: o "pequeno ajuste" passou de até 2 h para **até 1 h**, e o Parceiro passou de R$ 349,90 com 4 h para **R$ 399,90 com 3 h**. Sem isso, os planos do meio e de cima pagavam uns R$ 40 por hora no pior caso.

### Custos de ferramentas (por cliente)

| Ferramenta | Para quê | Custo |
|---|---|---|
| Cloudflare (site) | Publicar o sistema | Gratuito no uso de vocês |
| Cloudflare R2 | Guardar os backups | Gratuito até 10 GB |
| GitHub | Código e backup automático | Gratuito (repositório privado) |
| Supabase gratuito | Banco e login | R$ 0, com os limites já discutidos (pausa, sem backup próprio) |
| Supabase Pro | Banco sem pausa e com backup próprio | ~US$ 25 por mês pela organização + ~US$ 10 por projeto extra (decisão em aberto) |
| Domínio `.com.br` | Endereço próprio | ~R$ 40 por ano (registro.br), normalmente pago pelo cliente |
| E-mail do login (ex.: Resend) | "Esqueci a senha" e convites | Gratuito no volume de um pequeno negócio |

Com tudo gratuito, a margem é praticamente a mensalidade inteira (menos impostos). Com o Supabase Pro, tire uns R$ 60 a R$ 140 por cliente, dependendo de quantos clientes dividem a organização.

### Palavras que aparecem nos extras

- **API:** a "porta" pela qual um sistema conversa com outro. Integrar Pix automático, nota fiscal ou WhatsApp é ligar o sistema na API de uma empresa que faz isso. **Quase sempre essa empresa cobra** (taxa por boleto ou Pix, mensalidade de emissão de nota, valor por mensagem no WhatsApp oficial). Por isso integrações ficam fora dos planos: orçamento do seu trabalho + a ferramenta repassada ao cliente sem acréscimo.
- **LP (landing page) / site de apresentação:** uma página única que apresenta o negócio (quem é, serviços, fotos, botão de WhatsApp). Hospedagem gratuita no Cloudflare; o custo é o seu tempo (umas 6 a 10 horas). Por isso entra no Parceiro e custa "a partir de R$ 900" nos outros.
- **Módulo novo:** uma área nova do sistema (orçamentos, agenda, estoque). É projeto à parte, com orçamento.

### Antes de enviar a um cliente
- [ ] Validar os preços com 2 ou 3 donos de negócio.
- [ ] Decidir onde fica o Supabase (sua conta ou do cliente): muda o custo, não as lâminas.
- [ ] Contrato com as mesmas condições das lâminas (prazo mínimo, reajuste, atraso, saída dos dados), revisado por advogado.
- [ ] MEI ou ME aberto para emitir nota.
