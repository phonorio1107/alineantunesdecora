# Lições do cliente piloto (Aline Antunes Decora, out–nov/2026)

Decoração de festas, assessoria e workshops; proprietária usa no celular. Úteis para qualquer cliente de serviço com evento, orçamento ou acervo.

## O que o cliente pediu depois de usar de verdade
- **Venda em etapas, no mesmo lugar:** Orçamento (rascunho, sem parcelas nem baixa no estoque) → Contrato (fechar cria entrada e saldo; vira a ordem de serviço) → Evento (logística, custos, recebimentos). Um registro só que muda de status; "Não fechou" guarda o orçamento sem apagar (`fechado_em` vazio + cancelado). Endereços antigos redirecionam.
- **Várias áreas no mesmo serviço** (decoração + assessoria): pergunte como o dinheiro vai para o relatório. A escolha foi "valor por área" ao fechar; o lucro por área divide receita e custos nessa proporção.
- **Estoque simples:** código, descrição do jeito do dono, custo de compra, quantidade. "Dar baixa" **depende**: acervo sai e volta (só baixa o que não voltou, na conferência da devolução); consumo sai de vez quando a venda fecha. Mostrar o valor total em peças.
- **Nome diferente só no contrato:** o item da venda guarda o próprio nome e a ligação com o estoque pelo código. O dono sabe o que saiu; o cliente final lê o nome bonito.
- **Contrato separado em peças e serviços;** peça sem preço sai como "Incluso".
- **Inscrição estadual** quando o documento é CNPJ (junto do CPF/CNPJ, só a proprietária vê).
- **Rótulos:** o cliente quer palavras mais amplas ("Evento", não "Festa") e o masculino genérico ("Novo cliente").
- Antes, no primeiro teste: excluir cliente (LGPD: anonimizar se tem histórico), parcelado e "todo mês", olho na senha, carregando ao entrar, máscaras, campos que estouravam no celular.

## Perguntas que valeram ouro (faça cedo, na Fase 1 ou 2)
1. Como uma venda nasce e fecha? Existe orçamento? Ele vence?
2. Um serviço pode ter mais de uma área ou categoria? Como o dinheiro se divide no relatório?
3. Há estoque ou acervo? O que sai de vez e o que volta? Quanto vale o estoque (custo de compra ou reposição)?
4. O documento para o cliente final usa os mesmos nomes do controle interno?
5. Atende empresa (CNPJ)? Precisa de IE, razão social, nota fiscal?
6. O que conta como "sobrou para mim" (pró-labore, reserva, fôlego de caixa)?

## Infra e contas
- Cloudflare: a `main` precisa ter o `package.json` (junte a branch antes do primeiro build). Ligue a URL `workers.dev` no painel.
- Cloudflare com login Google não oferece 2FA próprio: proteja o Gmail com 2FA e registre.
- GitHub gratuito não protege branch em repositório privado: registre como dispensado.
- Projeto Supabase único (testes e uso real) é aceitável no piloto, com condições escritas: apagar os dados de teste antes do real, dump antes de cada mudança, rever no go-live.
- Logo do cliente com halo escuro: limpe com script (`scripts/marca/limpar_logo.py`) e gere de novo favicon, ícones e logo do PDF; guarde o original.

## Design que funcionou
- Um momento marcante na tela inicial (o "convite" do próximo evento) e o resto calmo.
- Tokens de cor em CSS com tema claro e escuro; fontes servidas pelo próprio site (CSP sem Google Fonts).
- Etapas da venda como três abas que leem como caminho; etiqueta de código com cara de etiqueta de prateleira.
- Contraste: o rosa da marca sobre o rosa-claro reprovou (4,18:1); bastou um tom vizinho só na etiqueta.

## Comercial e operação (ver "Decisões" do PROJETO.md do piloto)
- Divulgação: post e Reels com prints da prévia (dados fictícios) e autorização do cliente antes de postar.
- O cliente piloto valida o produto; o modelo de preço e a rotina pós-expediente ficaram registrados em "Decisões". Releia antes de propor valores a um cliente novo.
