# PROJETO: Aline Antunes Decora

## Dados do cliente
- **Cliente:** Aline Antunes Decora (mãe do Pedro), **SaaS piloto**
- **Prestador / operador:** Pedro Hoffman
- **Repositório:** `phonorio1107/alineantunesdecora`
- **Ramo:** decoração de festas e assessoria de eventos
- **Dor principal:** financeiro acima de tudo (não sabe o líquido que sobra, o lucro, o fechamento do mês, o fluxo de caixa nem quantos meses a empresa aguenta sem receita); depois orçamentos e agenda. Valor em horas ou R$/mês: _a estimar_
- **Usuários (quem e quantos):** _a confirmar_
- **Domínio desejado:** _a confirmar_
- **Logo e cor:** _a confirmar_
- **Início:** 28/10/2026

## Fase atual
**Fase 1: Descoberta e escopo** (em andamento)

## Decisões
_(registro das escolhas do Pedro, para nenhum chat perguntar de novo)_
- 28/10/2026: o projeto usa a skill `novo-cliente-saas` e serve de piloto do SaaS.
- 28/10/2026: contrato e cobrança dispensados (piloto familiar). Os documentos de LGPD da Fase 9 continuam valendo.
- 28/10/2026: princípio do produto, nas palavras do Pedro: dar **liberdade financeira** à Aline, com lançamento de informações **fácil**. O financeiro é a prioridade número 1.

---

## Fase 1: Descoberta e escopo
- [x] Nome e ramo do cliente (28/10/2026, resposta do Pedro)
- [ ] Dor principal (em horas ou reais por mês)
- [ ] Quem usa e quantos usuários
- [ ] O que precisa existir na primeira versão
- [ ] O que fica para depois
- [ ] Dados pessoais guardados (clientes finais, funcionários, saúde, financeiro) e se há dados sensíveis
- [ ] Logo e cor do cliente
- [ ] Domínio desejado
- [ ] Escopo cortado para o menor sistema que resolve a dor
- [x] Contrato e 50% do setup: **dispensado** (28/10/2026). Justificativa do Pedro: cliente piloto é a mãe dele, sem cobrança.

## Fase 2: Modelagem e protótipo
- [ ] Telas e fluxos listados
- [ ] Modelo de dados (tabelas e relações) aprovado pelo Pedro
- [ ] Protótipo clicável com dados fictícios
- [ ] Rodada de ajustes do protótipo
- [ ] Aprovação do cliente por escrito
- [ ] Mapa de dados pessoais (campo, finalidade, base legal, retenção)

## Fase 3: Contas e repositório
- [ ] Repositório privado (a partir do `template-base`)
- [ ] `main` protegida (só por pull request) e branch `dev`
- [ ] Dependabot e secret scanning ligados (se o plano permitir)
- [ ] `.env.example` sem segredos; `.gitignore` com `.env*`
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
