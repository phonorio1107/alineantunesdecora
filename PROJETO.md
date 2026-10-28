# PROJETO: Aline Antunes Decora

## Dados do cliente
- **Cliente:** Aline Antunes Decora (mãe do Pedro), **SaaS piloto**
- **Prestador / operador:** Pedro Hoffman
- **Repositório:** `phonorio1107/alineantunesdecora` (⚠️ **público**; tornar privado antes da Fase 4)
- **Ramo:** decoração de festas (arranjos florais e balões, desde 2015; festa infantil é o carro-chefe), assessoria e coordenação de eventos, e **workshops** de arranjos florais
- **Sede:** Louveira/SP; atende Jundiaí, Campinas, Valinhos, Vinhedo e São Paulo; cerca de 4 festas por mês
- **Entrevista com a Aline:** [`.claude/skills/aline-antunes-decora/SKILL.md`](.claude/skills/aline-antunes-decora/SKILL.md) (fonte oficial das regras do negócio)
- **Dor principal:** financeiro acima de tudo (não sabe o líquido que sobra, o lucro, o fechamento do mês, o fluxo de caixa nem quantos meses a empresa aguenta sem receita); depois orçamentos e agenda. Hoje gasta **pouco tempo** com isso, e de forma analógica. A dor é falta de **visibilidade** e de controle, não horas perdidas.
- **Usuários:** Aline (administradora) + 1 ou 2 pessoas (perfis administrador e usuário)
- **Site atual:** https://www.alineantunesdecora.com.br/ · **Instagram:** https://www.instagram.com/alineantunesdecora/
- **Domínio do sistema:** `app.alineantunesdecora.com.br` (CNAME para o Cloudflare Pages)
- **Logo:** "Aline Antunes" em letra cursiva rosa, com "Decora." em cinza, sem serifa, logo abaixo (arquivo em `marca/logo-aline-antunes-decora.png`: PNG 1689×484 com fundo transparente; rosa `#DE799B`, cinza `#696969`)
- **Identidade do site (amostrada dos prints em 28/10/2026):**
  - Rosa da marca `#DA6F9A` (botões em pílula, palavras em itálico de destaque)
  - Rosa claro `#FBD6E5` / `#FFF8FA` (sombras e fundos de seção)
  - Amarelo creme `#FEF7D9` (cards de novidade)
  - Fundo off-white `#FFFDFC`; título `#222220`; corpo `#796B70`; card escuro `#241F1F`
  - Confetes em rosa, amarelo e azul-claro como decoração de fundo
  - Tipografia: títulos em serifa de alto contraste (parece Playfair Display, com itálico rosa) e corpo sem serifa geométrica (parece DM Sans). _Confirmar as fontes quando o site estiver acessível._
  - Cantos bem arredondados, fotos em formato de arco, botões em pílula, tom acolhedor ("Feito com carinho")
- **Início:** 28/10/2026

## Fase atual
**Fase 2: Modelagem e protótipo** (Fase 1 concluída em 28/10/2026)

## Decisões
_(registro das escolhas do Pedro, para nenhum chat perguntar de novo)_
- 28/10/2026: o projeto usa a skill `novo-cliente-saas` e serve de piloto do SaaS.
- 28/10/2026: contrato e cobrança dispensados (piloto familiar). Os documentos de LGPD da Fase 9 continuam valendo.
- 28/10/2026: escopo v1 = financeiro + eventos simples; orçamentos e agenda na v2.
- 28/10/2026: o sistema guarda CPF/CNPJ das clientes (escolha do Pedro).
- 28/10/2026: referências visuais oficiais são o site e o Instagram da Aline e o logo rosa e cinza.
- 28/10/2026: endereço do sistema é `app.alineantunesdecora.com.br`.
- ~~28/10/2026: recebimento de evento = sinal de 50% + restante até a data~~ → substituído: **entrada de 30% + saldo até 5 dias antes do evento**, editável (regra da entrevista, confirmada pelo Pedro em 28/10/2026).
- 28/10/2026: a branch `claude/eager-ramanujan-xcz3om` (21/10) vira fonte: a entrevista é a referência do negócio e o código será reaproveitado na Fase 6, com revisão de segurança.
- 28/10/2026: **repositório continua público por decisão do Pedro**, ciente do risco (código e documentos visíveis para qualquer pessoa). ⚠️ **Precisa ficar privado antes da Fase 4.** Lembrar o Pedro em todo resumo de fase.
- 28/10/2026: workshops na v1 **com lista de inscritas** (nome e telefone).
- 28/10/2026: **tema claro é o padrão** (fundo branco com confetes rosa, amarelo e azul, como no site), independente do tema do aparelho. O escuro fica como opção em Configurações → Aparência.
- 28/10/2026: princípio do produto, nas palavras do Pedro: dar **liberdade financeira** à Aline, com lançamento de informações **fácil**. O financeiro é a prioridade número 1.

---

## Fase 1: Descoberta e escopo
- [x] Nome e ramo do cliente (28/10/2026, resposta do Pedro)
- [x] Dor principal (28/10/2026): pouco tempo gasto, controle analógico. **Medida de sucesso:** a Aline lança cada entrada e saída em menos de 1 minuto pelo celular e sabe, sem fazer conta, o lucro do mês, o líquido dela e o fôlego de caixa.
- [x] Quem usa e quantos usuários (28/10/2026): Aline + 1 ou 2 pessoas
- [x] O que precisa existir na primeira versão (28/10/2026): **financeiro + eventos simples**
  - Eventos: cliente, data, valor fechado
  - Lançamentos de entrada e saída (custos fixos e por evento), com categorias
  - Fechamento mensal, fluxo de caixa, lucro por evento, valor líquido que sobra para a Aline
  - Fôlego de caixa: quantos meses a empresa aguenta sem receita
  - Fontes de receita a separar: decoração, assessoria/coordenação e workshops
- [x] O que fica para depois (28/10/2026): orçamentos completos e agenda completa (v2)
- [x] Dados pessoais (28/10/2026): das clientes finais, nome, telefone, e-mail, endereço e **CPF/CNPJ**; dados financeiros da empresa. Não há dados sensíveis (art. 11 da LGPD), mas o CPF exige cuidado: acesso restrito, mascarado nas listas e fora dos logs.
- [x] Logo e cor do cliente (28/10/2026): cores tiradas do logo enviado pelo Pedro; referências visuais são o site e o Instagram
  - Contraste medido: branco sobre `#DA6F9A` dá 3,12:1 e **reprova** para texto. Proposta para a Fase 7: botões e links em `#B24A77` no tema claro (branco sobre ele dá 5,07:1), `#DA6F9A` como decoração e no tema escuro (sobre `#222220` dá 5,10:1). Texto de corpo `#796B70` sobre o fundo dá 4,99:1 e passa.
- [x] Domínio desejado (28/10/2026): `app.alineantunesdecora.com.br`
- [x] Escopo cortado para o menor sistema que resolve a dor (28/10/2026)
- [x] Contrato e 50% do setup: **dispensado** (28/10/2026). Justificativa do Pedro: cliente piloto é a mãe dele, sem cobrança.

## Fase 2: Modelagem e protótipo
> Proposta detalhada em [`docs/fase-2-modelagem.md`](docs/fase-2-modelagem.md)

- [x] Telas e fluxos listados (28/10/2026, `docs/fase-2-modelagem.md`)
- [x] Modelo de dados aprovado pelo Pedro (28/10/2026)
- [x] Protótipo clicável com dados fictícios (28/10/2026): `prototipo/index.html`, publicado em https://claude.ai/artifact/QohEXXEH6yXCXb3iiA4PNn (testado em 1280px e 375px, nos temas claro e escuro, sem erros no console e sem rolagem lateral)
- [ ] Rodada de ajustes do protótipo
- [ ] Aprovação do cliente por escrito (modelo em [`docs/termo-aprovacao-fase-2.md`](docs/termo-aprovacao-fase-2.md); respostas em `docs/aprovacoes/`)
- [x] Mapa de dados pessoais (28/10/2026, rascunho; a base legal ainda precisa ser confirmada pela Aline)

## Fase 3: Contas e repositório
- [ ] **Repositório privado** (bloqueia o início da Fase 4)
- [x] Repositório criado (28/10/2026): `phonorio1107/alineantunesdecora`. Como este é o piloto, o `template-base` nasce dele ao final do projeto.
- [ ] `main` protegida (só por pull request) e branch `dev`
- [ ] Dependabot e secret scanning ligados (se o plano permitir)
- [x] `.env.example` sem segredos; `.gitignore` com `.env*` (28/10/2026; `git check-ignore .env.local` confirma)
- [ ] Projeto Supabase de produção (org Pro, região São Paulo), senha do banco no gerenciador de senhas
- [ ] Ambiente Supabase de desenvolvimento separado
- [ ] Cloudflare Pages ligado: produção em `main`, prévia em `dev`, variáveis por ambiente
- [ ] 2FA em GitHub, Cloudflare, Supabase e e-mail principal

## Fase 4: Banco de dados e RLS
- [ ] Convenções aplicadas (`snake_case` pt-BR plural, `id` uuid, `empresa_id`, `criado_em`, `atualizado_em`, `criado_por`, índices, `excluido_em`)
- [ ] Toda mudança por migração em `supabase/migrations`
- [ ] RLS ativado em todas as tabelas do `public` (consulta `rowsecurity = false` vazia)
- [ ] Políticas por `empresa_id` via `usuarios_empresas`, separadas por operação, `with check` em insert/update
- [ ] Nenhuma política usa `user_metadata`
- [ ] Nenhuma política `using (true)` em tabela de negócio
- [ ] Views com `security_invoker = true`; `security definer` com `search_path = ''`
- [ ] Storage: buckets privados, políticas por empresa, limite de tamanho e tipos
- [ ] `service_role` fora do front-end e do repositório
- [ ] Teste de isolamento entre empresas (script repetível)
- [ ] Security Advisor zerado (ou justificado)

## Fase 5: Autenticação e permissões
- [ ] Cadastro aberto desligado; entrada por convite; confirmação de e-mail
- [ ] Senha forte; token curto com renovação; limite de tentativas
- [ ] Redirect URLs só de produção e prévias
- [ ] 2FA disponível (obrigatório para admin se o cliente aceitar)
- [ ] Perfis administrador e usuário, checados no banco
- [ ] Recuperar senha, trocar senha, sair de todos os dispositivos
- [ ] E-mails com remetente do domínio, em português

## Fase 6: Construir o sistema
- [ ] Módulos-base: login por convite, empresas e usuários, painel, lista e cadastro padrão, configurações, registro de atividades
- [ ] Telas próprias do cliente (uma a uma, aprovadas pelo Pedro)
- [ ] TypeScript estrito; Zod em todo formulário; sem `dangerouslySetInnerHTML` com texto de usuário
- [ ] Tratamento de erro em toda chamada ao banco
- [ ] Logs sem dados pessoais
- [ ] Nenhum segredo no código (só a chave anon)
- [ ] Dependências atualizadas; `npm audit` sem críticas

## Fase 7: Design
- [ ] Direção visual escolhida pelo Pedro (tom, densidade, cantos, gráficos)
- [ ] Tokens de design e temas claro e escuro testados
- [ ] Cor do cliente como destaque, contraste mínimo 4,5:1
- [ ] Logo no topo; rodapé "feito por Pedro Hoffman" com quadrado verde de 10px
- [ ] Espaçamento 4/8/12/16/24/32/48/64; cantos 4/8/12/16; um botão principal por tela
- [ ] Estados vazio, carregando e erro; confirmação em ação destrutiva; avisos de sucesso; erro junto ao campo
- [ ] Celular (360px), teclado, foco visível, texto mínimo 14px, toque de 44px
- [ ] Textos curtos no infinitivo; datas, moeda e números no formato brasileiro
- [ ] Ícones, favicon, título da aba, 404 e tela de erro com a marca

## Fase 8: Cloudflare, domínio e cabeçalhos
- [ ] Subdomínio por CNAME; HTTPS e redirecionamento HTTP→HTTPS
- [ ] `_headers` (HSTS, nosniff, Referrer-Policy, Permissions-Policy, frame-ancestors, CSP)
- [ ] `_redirects` para a SPA
- [ ] Prévias protegidas (Cloudflare Access) e fora dos buscadores; `noindex` em produção se privado
- [ ] Variáveis de produção e prévia separadas
- [ ] Turnstile ou limite de tentativas no login (se o risco justificar)
- [ ] Cloudflare Web Analytics (se o cliente quiser)

## Fase 9: LGPD e jurídico
- [ ] Política de privacidade e termos publicados, com contato do encarregado
- [ ] Lista de suboperadores no anexo do contrato
- [ ] Exportar e excluir dados de uma pessoa; retenção implementada
- [ ] Plano de incidente (24h ao cliente; ANPD em 3 dias úteis; registro por 5 anos)

## Fase 10: Qualidade antes da entrega
- [ ] `SECURITY_CHECKLIST.md` completo; isolamento passando; Advisor zerado
- [ ] GitHub Actions em cada PR: tipos, lint e build
- [ ] Roteiro manual no computador e no celular, nos dois temas
- [ ] Backups: diário do Supabase, semanal no R2, restauração testada
- [ ] Revisão de segurança do diff completo
- [ ] Desempenho no celular, imagens otimizadas, listas paginadas

## Fase 11: Entrega e go-live
- [ ] Dados reais importados e conferidos
- [ ] Usuários convidados
- [ ] Versão de teste com o cliente por 3 a 5 dias
- [ ] Treino de 30 minutos e manual de 1 página
- [ ] Go-live; 50% restantes recebidos; mensalidade iniciada
- [ ] Monitor de disponibilidade (5 min) e registro de erros com alerta por e-mail

## Fase 12: Documentação e operação
- [ ] README do cliente (arquitetura, contas, variáveis, restauração, deploy)
- [ ] Rotinas agendadas: semanal, mensal, trimestral e anual
- [ ] Suporte por canal único; pedidos viram Issues (P1 4h, P2 1 dia, P3 agendado)
- [ ] Offboarding documentado

---

## Histórico
- 28/10/2026: `PROJETO.md` criado; Fase 1 iniciada.
- 28/10/2026: protótipo v1 publicado para a rodada de ajustes.
- 28/10/2026: ajuste 2 do protótipo: entrada de 30% e saldo 5 dias antes, categorias de custo da entrevista (freelancers, deslocamento, taxas de cartão, peças perdidas).
- 28/10/2026: ajuste 1 do protótipo: fundo branco com confetes como no site e números sem quebrar no celular.
- 28/10/2026: Fase 1 concluída (portão ok: todos os itens `[x]`, contrato dispensado com justificativa). Fase 2 iniciada.
