# PROJETO: Aline Antunes Decora

## Dados do cliente
- **Cliente:** Aline Antunes Decora (mãe do Pedro), **SaaS piloto**
- **Prestador / operador:** Pedro Hoffman
- **Repositório:** `phonorio1107/alineantunesdecora` (privado desde 28/10/2026)
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
Página de acompanhamento (linguagem simples): https://claude.ai/artifact/Q5sgxoiMfr7tMEHPBRcM9n · fonte em `docs/acompanhamento/index.html`, atualizar a cada mudança de fase.

**Fases 1 a 6 concluídas** (4 e 5 em 31/10/2026). Em andamento: Fase 7 (design, 5 de 9) e Fase 8 (domínio, cabeçalhos e e-mail próprio). Bloqueiam o go-live: backup ligado, LGPD revisada, acesso do Pedro rebaixado, dados reais

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
- 28/10/2026: **repositório continua público por decisão do Pedro**, ciente do risco (código e documentos visíveis para qualquer pessoa). → **Resolvido em 28/10/2026: repositório privado.**
- 28/10/2026: workshops na v1 **com lista de inscritas** (nome e telefone).
- 28/10/2026: **tema claro é o padrão** (fundo branco com confetes rosa, amarelo e azul, como no site), independente do tema do aparelho. O escuro fica como opção em Configurações → Aparência.
- 28/10/2026: documentos do Pedro seguem o design system **Pedro Hoffman Degrau** (https://claude.ai/artifact/TTBKvP6xEKFKxHtrAiHGcp). Nos sistemas dos clientes, o rodapé "feito por Pedro Hoffman" usa o **símbolo de 12 px** do design system, no lugar do quadrado verde de 10 px da skill (atualizar a skill).
- 28/10/2026: princípio do produto, nas palavras do Pedro: dar **liberdade financeira** à Aline, com lançamento de informações **fácil**. O financeiro é a prioridade número 1.
- 30/10/2026: **modelo comercial (rascunho, a validar com 2 ou 3 prospectos e com advogado):** setup de R$ 2.500 a R$ 3.500 (inclui contas, banco, domínio, deploy, dados iniciais, treino e teste de 3 a 5 dias) e mensalidade de R$ 199 a R$ 249 (backup, atualizações, suporte com prazo, correção de erros; funcionalidade nova, mais usuários e integrações cobrados à parte). Preço de lançamento para os 2 ou 3 primeiros clientes pagantes. Aline segue como piloto sem cobrança; registrar por escrito o valor de tabela como prova de valor. Custos de Supabase e Cloudflare a confirmar nas páginas oficiais antes de qualquer contrato.
- 30/10/2026: **infraestrutura: EM ABERTO (Pedro quer pensar mais).** Não decidir ainda se o Supabase fica na conta do Pedro (Pro, um projeto por cliente) ou na conta de cada cliente (planos gratuitos, sem custo de produção para o Pedro, que cobraria licença de uso e manutenção). Pontos já levantados: com contas gratuitas do cliente a margem sobe muito, mas backup (sem backup diário no gratuito), pausa por inatividade, e-mail limitado, acesso a N contas e deploy por conta ficam como trabalho do Pedro; com o Pro na conta do Pedro, backup diário e uma só organização, ao custo de ~US$ 10 por projeto extra, com dados de terceiros na conta dele (2FA e cláusula de operador). Cloudflare gratuito nos dois casos. Até decidir: Aline continua no projeto atual (gratuito) com `pg_dump` manual.
- 30/10/2026: o Pedro trabalha em outro emprego durante o projeto: limitar a 3 a 5 clientes no início, automatizar operação (script de deploy e migração, backup agendado, monitor) e escrever horários e prazos de suporte no contrato; conferir cláusula de exclusividade do emprego e abrir MEI ou ME ao cobrar.
- 31/10/2026: **preços com o produto concluído (rascunho, a validar com 2 ou 3 prospectos):** Essencial R$ 1.800 + R$ 149,90; **Profissional R$ 3.500 + R$ 249,90** (o mais vendido); Parceiro R$ 5.500 + R$ 449,90. Preço de lançamento para os 2 ou 3 primeiros clientes: setup de R$ 2.500 a R$ 2.800, mensalidade mantida, em troca de depoimento. Vender pelo resultado ("quanto lucrou em cada festa").
- 31/10/2026: **modelo comercial: setup + mensalidade (licença de uso com manutenção) é o padrão.** Exceção possível: licença única bem mais alta (5 a 10 vezes o setup) mais contrato anual de manutenção, só para cliente que exigir ser dono do sistema, com o sistema na conta dele. Dados sempre do cliente, com exportação gratuita. Evitar a palavra "locação" no contrato.
- 31/10/2026: **operação com 10 clientes e outro emprego:** alerta imediato só quando algo quebra (fora do ar, backup falhou, erro repetido); resumo semanal por e-mail, não diário; limite de 1 cliente novo por mês; ponto de virada de ~40 h de suporte por mês (contratar ajudante ou reduzir o emprego). **Painel de saúde** para quando houver 2 ou 3 clientes: página estática gerada por rotina do GitHub, atrás do Cloudflare Access com 2FA, **só metadados** (no ar, backup, espaço, usuários, chamados, mensalidade), chaves de leitura, nunca dados de cliente final, sem ações pelo painel.
- 30/10/2026: **objetivo do Pedro: independência financeira, com meta de R$ 3.000 líquidos por mês** (mensalidades × ~0,88 de imposto − Claude Code ~R$ 550 − infraestrutura). Estimativa: ~17 a 20 clientes com tudo gratuito, ~24 a 31 com Supabase Pro por cliente; no primeiro ano o setup (R$ 2.500 por cliente novo) pesa mais que a mensalidade. **Decisão: manter o emprego atual e seguir com o projeto em paralelo.** Sair do emprego só com gatilhos: 5 ou mais clientes pagantes além da Aline; mensalidades de R$ 1.200 a R$ 1.500 líquidos por mês; reserva de 6 a 9 meses de despesas; 1 cliente novo por mês durante 3 meses; contador consultado e empresa aberta. Risco maior: nenhum cliente pagou ainda e a taxa de venda é desconhecida.

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
- [x] Rodada de ajustes do protótipo (29/10/2026): a Aline aprovou sem pedir mudanças. Os ajustes feitos antes vieram do Pedro: fundo branco com confetes, entrada de 30% e saldo 5 dias antes, categorias da entrevista.
- [x] Aprovação do cliente por escrito (29/10/2026, WhatsApp; comprovante em [`docs/aprovacoes/2026-10-29-aprovacao-whatsapp.md`](docs/aprovacoes/2026-10-29-aprovacao-whatsapp.md)). Termo em PDF: (PDF em [`docs/termo-aprovacao-fase-2.pdf`](docs/termo-aprovacao-fase-2.pdf), gerado do modelo em `docs/modelos/termo-fase-2/`; respostas em `docs/aprovacoes/`)
- [x] Mapa de dados pessoais (28/10/2026; Aline concordou com os dados e prazos em 29/10/2026. Prazos ainda a confirmar com o contador)

## Fase 3: Contas e repositório
- [x] **Repositório privado** (28/10/2026; API do GitHub confirma `visibility: private`)
- [x] Repositório criado (28/10/2026): `phonorio1107/alineantunesdecora`. Como este é o piloto, o `template-base` nasce dele ao final do projeto.
- [x] `main` protegida: **dispensado por enquanto** (decisão do Pedro em 29/10/2026). Justificativa: o plano gratuito do GitHub não oferece proteção de branch em repositório privado; só o Pedro mexe no código, a verificação automática roda em todo envio e o Cloudflare publica só a `main`. Reavaliar na Fase 10 (GitHub Pro ou ruleset). Branch `dev` não usada
- [x] Dependabot e secret scanning ligados pelo Pedro em 29/10/2026 (Settings → Advanced Security); `.github/dependabot.yml` já no repositório
- [x] `.env.example` sem segredos; `.gitignore` com `.env*` (28/10/2026; `git check-ignore .env.local` confirma)
- [x] Projeto Supabase de produção: **dispensado por enquanto** (decisão do Pedro em 29/10/2026). Justificativa: já existe o projeto `aline_antunes_decora-dev` (`nqdlsiqunkeaufgravhg`, org gratuita, São Paulo) e ele prefere usar **um projeto só** para testes e uso real. Risco explicado uma vez: mudanças no banco afetam direto os dados reais, e dados de teste se misturam com os reais. **Condições:** (1) apagar todos os dados de teste antes de entrar dado real; (2) fazer `pg_dump` antes de cada mudança no banco; (3) rever a decisão (um ou dois projetos) na Fase 11, antes do go-live. Plano gratuito: vale também a condição do backup (Fase 10) e do e-mail de pausa.
- [x] Ambiente Supabase de desenvolvimento separado (29/10/2026): projeto `aline_antunes_decora-dev`, organização gratuita, referência `nqdlsiqunkeaufgravhg`. Pedro enviou a URL e a chave pública; a `service_role` e a senha do banco ficam só com ele. **Feito em 29/10/2026 pelo Pedro, no SQL Editor:** `supabase/aplicar/01-estrutura-completa.sql` (3 migrações) e `02-primeiro-acesso.sql` (empresa de teste + usuário como proprietária), ambos com sucesso. **Falta:** conferir ao vivo (`npm run verificar:supabase` e login no sistema publicado); esta sessão ainda não alcança `*.supabase.co`.
- [x] Cloudflare ligado (29/10/2026): projeto `aline-antunes-decora` (Workers com arquivos estáticos, `wrangler.jsonc` com `dist` e fallback de SPA), produção em `main`, build `npm run build`, variáveis de build `NODE_VERSION`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (só a chave pública). Endereço: `aline-antunes-decora.phonorio1107.workers.dev`; chave de Preview desligada de propósito (prévias protegidas na Fase 8). **Login testado ao vivo pelo Pedro em 29/10/2026 ("entrei")**, o que confirma banco, chave e usuário. Prévia por branch `dev` não usada: o fluxo é uma branch só
- [x] 2FA (30/10/2026): **Gmail, GitHub e Supabase** com 2FA ligado pelo Pedro (códigos de recuperação do GitHub guardados por ele). **Cloudflare: dispensado, justificado.** A conta entra por login Google/Apple, e o Cloudflare não oferece 2FA próprio nesse tipo de conta; ela fica protegida pelo 2FA do Gmail. Risco residual: quem controlar o Gmail controla o Cloudflare. Rever se um dia o login passar a ser por e-mail e senha, e antes de o Cloudflare guardar chaves de terceiros

## Fase 4: Banco de dados e RLS
- [x] Convenções aplicadas (28/10/2026, código; vale em produção quando a migração for aplicada)
- [x] Toda mudança por migração em `supabase/migrations` (`20261028120000_estrutura_v1.sql`)
- [x] RLS ativado em todas as tabelas do `public`: verificado no item 0 do teste de isolamento (28/10/2026, código; vale em produção quando a migração for aplicada)
- [x] Políticas por `empresa_id` via `usuarios_empresas`, uma por operação, `with check` em insert/update; perfis proprietária, assistente (financeiro só se liberado) e freelancer (28/10/2026, código; vale em produção quando a migração for aplicada)
- [x] Nenhuma política usa `user_metadata` (28/10/2026)
- [x] Nenhuma política `using (true)` (28/10/2026; a da branch antiga foi substituída)
- [x] Views com `security_invoker = true`; `security definer` só no schema `privado`, com `search_path = ''` (28/10/2026)
- [x] Storage: **dispensado na v1, com evidência** (31/10/2026: `select count(*) from storage.buckets` = 0, conferido pelo Pedro). A v1 não guarda arquivos. Quando entrar o primeiro arquivo: bucket privado, políticas por empresa, limite de tamanho e tipos
- [x] `service_role` fora do front-end e do repositório (28/10/2026; busca no código vazia)
- [x] Teste de isolamento entre empresas e perfis: `supabase/tests/isolamento.sql`, 17 verificações passando em Postgres 16 local (inclui contratos e custos fixos); confirmado que acusa 4 furos abertos de propósito; roda no GitHub Actions a cada PR (28/10/2026)
- [x] Security Advisor (29/10/2026): **0 erros**; os 2 avisos de `public.rls_auto_enable()` corrigidos pela migração `20261029110000_revoga_rls_auto_enable.sql`, aplicada pelo Pedro no SQL Editor ("deu certo"; sem print do Advisor atualizado). Resta 1 aviso, **justificado**: *Leaked password protection* é do plano Pro; compensado por senha mínima de 10 caracteres e cadastro fechado; rever se migrar para o Pro

## Fase 5: Autenticação e permissões
- [x] Cadastro aberto desligado; entrada por convite; confirmação de e-mail (Pedro desligou o cadastro em 29/10/2026; as pessoas são criadas por ele em Authentication → Users e ligadas pelo `05-ligar-usuario.sql`; com cadastro fechado e usuários criados já confirmados, a confirmação de e-mail não tem efeito prático)
- [x] Senha forte; token curto com renovação; limite de tentativas (31/10/2026: mínimo de 10 caracteres no Supabase e letras e números exigidos nas telas de nova senha e troca de senha; acesso de 1 hora com renovação automática, padrão do Supabase não alterado; limites conferidos por print: 30 logins a cada 5 minutos por aparelho, 30 verificações de código a cada 5 minutos, 150 renovações a cada 5 minutos)
- [x] Redirect URLs só de produção e prévias (informado pelo Pedro em 30/10/2026: Site URL e Redirect URL = endereço `.workers.dev`, feito em 29/10; sem print). Trocar pelo domínio próprio na Fase 8
- [x] 2FA disponível (obrigatório para admin se o cliente aceitar): feito em 31/10/2026. Configurações → Verificação em duas etapas (app autenticador, QR code e chave manual); com ela ligada, o login pede o código de 6 números. TOTP ligado no Supabase (conferido pelo Pedro). Testado na prévia. Achado e corrigido: o QR code do Supabase vinha com "#" sem codificar e a imagem não aparecia. **Recomendação: a Aline liga, porque vê financeiro e CPF**; a decisão é dela
- [x] Perfis administrador e usuário, checados no banco (proprietária, assistente com financeiro opcional e freelancer; RLS por operação; teste de isolamento verificações 3a, 3b, 4 e 7 passando a cada envio)
- [x] Recuperar senha, trocar senha, sair de todos os dispositivos: telas prontas e testadas (Pedro: parte 1 do teste de uso OK em 30/10/2026; trocar a senha em Configurações desde 31/10/2026). **Limite conhecido:** sem SMTP próprio, o e-mail de "Esqueci a senha" só chega para quem é da equipe do Supabase; até a Fase 8, o Pedro redefine a senha da Aline em Authentication → Users
- [x] E-mails com remetente do domínio, em português: **dispensado por agora e levado para a Fase 8** (decisão de 31/10/2026). Os modelos em português já estão prontos em `docs/emails/`; só fazem diferença com SMTP próprio, que depende do DNS do domínio da Aline. Sem SMTP, o Supabase só entrega para a equipe do projeto e limita a 2 e-mails por hora

## Fase 6: Construir o sistema
- [x] Módulos-base (28/10/2026): login por convite, empresa e equipe, painel, listas com busca e filtros, exportação Excel/CSV, configurações, registro de atividades no banco
- [x] Telas próprias do cliente (uma a uma, aprovadas pelo Pedro; teste de uso em 30/10/2026 com o banco real, ajustes feitos e conferidos pelo Pedro): **construídas em 28/10/2026** (Início, Lançar, Lançamentos, Eventos, Evento, Workshop, Clientes, Contratos, Relatórios, Configurações) e testadas no navegador com banco simulado. **Falta a aprovação do Pedro e o teste com o Supabase de desenvolvimento.**
- [x] TypeScript estrito; esquemas Zod para lançamento, cliente, evento e inscrição; sem `dangerouslySetInnerHTML` (28/10/2026; vale também para as telas que vierem)
- [x] Tratamento de erro em toda chamada ao banco (`src/lib/erros.ts`, 28/10/2026)
- [x] Logs sem dados pessoais: console só com código do erro; registro de atividades só com nomes de colunas (28/10/2026)
- [x] Nenhum segredo no código (só a chave anon) (28/10/2026)
- [x] `npm audit` com 0 vulnerabilidades (28/10/2026); Dependabot semanal configurado

## Fase 7: Design
- [ ] Direção visual escolhida pelo Pedro (tom, densidade, cantos, gráficos)
- [x] Tokens de design e temas claro e escuro testados (30/10/2026: revisão em 360px nos dois temas, capturas de tela de todas as telas)
- [ ] Cor do cliente como destaque, contraste mínimo 4,5:1 (tokens escolhidos para 4,5:1 na Fase 2; falta medição formal tela a tela)
- [x] Logo no topo; rodapé "feito por Pedro Hoffman" com o símbolo Pedro Hoffman de 12px (design system Degrau) (conferido em 30/10/2026)
- [ ] Espaçamento 4/8/12/16/24/32/48/64; cantos 4/8/12/16; um botão principal por tela
- [x] Estados vazio, carregando e erro; confirmação em ação destrutiva; avisos de sucesso; erro junto ao campo (28/10/2026, em todas as telas da v1)
- [x] Celular (360px), teclado, foco visível, texto mínimo 14px, toque de 44px (30/10/2026, auditoria automática em 9 telas: nenhum texto abaixo de 14px, nenhuma rolagem lateral, foco visível pelo teclado. Corrigido: botões pequenos, setas de mês e filtros passaram a 44px no celular; busca com foco visível; contorno de foco no rosa escuro, contraste melhor; descrição dos lançamentos em até 2 linhas no celular. Exceção aceita: link dentro de frase, permitido pelo WCAG)
- [ ] Textos curtos no infinitivo; datas, moeda e números no formato brasileiro
- [x] Ícones, favicon, título da aba, 404 e tela de erro com a marca (30/10/2026: tela de erro geral nova, com logo e botão de recarregar; telas de aviso com logo)

## Fase 8: Cloudflare, domínio e cabeçalhos
- [ ] Subdomínio por CNAME; HTTPS e redirecionamento HTTP→HTTPS
- [ ] E-mail próprio: Resend com o domínio da Aline, SMTP no Supabase, colar os 6 modelos de `docs/emails/`, testar "Esqueci a senha" com o e-mail da Aline, ligar os avisos de segurança (senha trocada, e-mail trocado, verificação em duas etapas) e incluir o Resend nos suboperadores
- [ ] `_headers` (HSTS, nosniff, Referrer-Policy, Permissions-Policy, frame-ancestors, CSP): **pronto em 30/10/2026**, gerado no build (`vite.config.ts` → `dist/_headers`) com a CSP liberando só o Supabase do cliente. Testado com a CSP ligada: login, fontes, PDF do fechamento, Excel e PDF do contrato funcionam; o `exceljs` tenta `eval` e cai num caminho alternativo, então `unsafe-eval` ficou fora. A verificação automática confere que o arquivo é gerado. Fontes passaram a ser servidas pelo próprio site (sem Google Fonts). **Falta conferir no endereço publicado**
- [x] Rotas da SPA: resolvido pelo `not_found_handling: single-page-application` do `wrangler.jsonc` (29/10/2026), sem `_redirects`
- [x] Prévias e buscadores (30/10/2026): endereço de prévia do Cloudflare **desligado** (em vez de protegido); `noindex` na página e no cabeçalho `X-Robots-Tag`. Rever se as prévias forem ligadas
- [ ] Variáveis de produção e prévia separadas
- [ ] Turnstile ou limite de tentativas no login (se o risco justificar)
- [ ] Cloudflare Web Analytics (se o cliente quiser)

## Fase 9: LGPD e jurídico
- [ ] Política de privacidade e termos publicados, com contato do encarregado: **rascunhos em `docs/lgpd/` (30/10/2026)**; faltam advogado, dados da Aline (CNPJ, encarregada) e publicar no sistema
- [ ] Lista de suboperadores no anexo do contrato: **rascunho em `docs/lgpd/suboperadores.md`** (Supabase, Cloudflare, R2, GitHub); falta advogado
- [ ] Exportar e excluir dados de uma pessoa; retenção implementada
- [ ] Plano de incidente (24h ao cliente; ANPD em 3 dias úteis; registro por 5 anos): **rascunho em `docs/lgpd/plano-de-incidente.md`**; falta advogado e contatos

## Fase 10: Qualidade antes da entrega
- [ ] `SECURITY_CHECKLIST.md` completo; isolamento passando; Advisor zerado
- [x] GitHub Actions em cada PR: tipos, build, `npm audit` e teste de isolamento (`.github/workflows/verificacao.yml`, 28/10/2026). Falta o lint.
- [ ] Roteiro manual no computador e no celular, nos dois temas
- [ ] Backups: diário do Supabase, semanal no R2, restauração testada. **Obrigatório antes do go-live porque o projeto está no plano gratuito e é o único** (sem backup diário garantido, sem ambiente separado): ou assina o Pro, ou a cópia própria e a restauração testada passam a ser o único backup.
- [ ] Revisão de segurança do diff completo
- [ ] Desempenho no celular, imagens otimizadas, listas paginadas

## Fase 11: Entrega e go-live
- [ ] Antes do go-live: **apagar os dados de teste** do projeto Supabase e rever a decisão de usar um projeto só (ou criar um segundo, gratuito, para testes)
- [ ] Tirar o acesso de proprietário do Pedro na empresa da Aline (assistente ou remover) antes dos dados reais
- [ ] Dados reais importados e conferidos
- [ ] Usuários convidados
- [ ] Versão de teste com o cliente por 3 a 5 dias
- [ ] Treino de 30 minutos e manual de 1 página
- [ ] Go-live; 50% restantes recebidos; mensalidade iniciada
- [ ] Monitor de disponibilidade (5 min) e registro de erros com alerta por e-mail

## Fase 12: Documentação e operação
- [x] README do cliente (arquitetura, contas, variáveis, restauração, deploy) (30/10/2026, `README.md`)
- [ ] Rotinas agendadas: semanal, mensal, trimestral e anual (escritas no `README.md`; falta agendar no calendário do Pedro e ligar o backup)
- [ ] Suporte por canal único; pedidos viram Issues (P1 4h, P2 1 dia, P3 agendado)
- [ ] Offboarding documentado
- [x] Checklist "criar novo cliente" (contas, variáveis, banco, domínio, convites, 2FA) e script único de deploy e migração por cliente (30/10/2026: `docs/operacao/novo-cliente.md`; `scripts/cliente/migrar.sh` roda só as migrações pendentes e anota em `controle.migracoes`, testado em banco novo, banco já migrado e migração com erro, que é desfeita; a verificação automática passou a usar o mesmo script; `scripts/cliente/publicar.sh` recusa chave secreta e passou no teste sem publicar)
- [ ] Automação de operação: backup agendado com restauração testada, monitor de disponibilidade, rotina contra pausa do banco gratuito. **Backup diário: código pronto e testado em Postgres local em 30/10/2026** (`scripts/backup/`, `.github/workflows/backup.yml`, passo a passo em `docs/backup.md`; restauração conferida, falha detectada num teste negativo, criptografia ida e volta ok). Falta o Pedro criar a chave, o bucket R2 e os 6 segredos; só marcar quando a primeira execução real ficar verde
- [ ] Modelo de proposta comercial e contrato (setup, mensalidade, o que está dentro e fora, prazo mínimo, reajuste, atraso, saída dos dados), revisado por advogado: **proposta pronta em `docs/modelos/proposta-comercial/`** (gera PDF de 2 páginas; valores de rascunho); falta o contrato e o advogado
- [ ] Janela e prazos de suporte escritos; conferir exclusividade no emprego do Pedro; abrir MEI ou ME antes de cobrar

---

## Histórico
- 31/10/2026: avaliação do produto (8/10 como produto, 6,5/10 como pronto para uso real; o que puxa para baixo é backup, domínio, e-mail, LGPD e o acesso do Pedro). Decisões de preço, modelo comercial e operação em Decisões.
- 31/10/2026: **logo sem o contorno escuro**: o PNG original tinha um halo preto semitransparente em volta das letras rosa; `scripts/marca/limpar_logo.py` separa o rosa do contorno pixel a pixel (o "Decora." cinza fica igual) e gera de novo a logo do sistema, a dos PDFs, o favicon e os ícones do celular. O original fica guardado em `marca/logo-aline-antunes-decora-original.png`. **Tela de entrada nova** ("capa do caderno"): papel do convite com borda recortada, logo grande, a frase "Festas lindas, contas em dia." e o formulário ao lado (no celular, em cima); "Esqueci a senha" junto do rótulo; o formulário treme de leve quando a senha está errada; nova senha e código de segurança com a mesma capa.
- 31/10/2026: **Fases 4 e 5 concluídas.** Storage sem nenhum bucket (dispensado na v1 com evidência); cadastro fechado, senha mínima de 10, verificação em duas etapas no sistema, limites de tentativa conferidos. E-mail com domínio próprio vai para a Fase 8 (precisa do DNS do domínio da Aline).
- 31/10/2026: **acesso da Aline criado**: o Pedro criou o usuário dela em Authentication → Users e ligou como proprietária com `supabase/aplicar/05-ligar-usuario.sql` (sem a ligação, o login funciona mas o sistema mostra "Sem acesso a nenhuma empresa"). **Pendência da Fase 11:** antes de dados reais, o Pedro deixa de ser proprietário da empresa da Aline (passa a assistente ou sai), para não ver CPF nem financeiro; suporte técnico segue pelo painel do Supabase.
- 31/10/2026: **redesenho visual** ("caderno de encomendas"): Início abre com o convite do próximo evento (borda recortada, dia em Playfair itálico, contagem de dias, logística e quanto já foi recebido) e a coluna de livro-caixa no lugar das 4 caixas iguais; tinta em ameixa, manteiga para "hoje" e prazos, céu para o Google; sem rótulos em caixa-alta; confetes só no alto, caindo uma vez por sessão; movimentos em resposta a ações (janela que sobe, "Paguei" que sai com confirmação, troca de tela, números que sobem uma vez); revisado em 360px e 1280px, temas claro e escuro, alvos de 44px e foco visível. **Agenda nova** (mês, dia, compromissos com horário ou dia todo, ligados a eventos) e **ligação com o Google Agenda**: o sistema escreve numa agenda própria "Aline Antunes Decora" e lê a agenda pessoal só para a proprietária. Edge Function `google-agenda` (arquivo único, sem dependências), 15 testes com Google e Supabase simulados (os testes acharam 2 erros reais, corrigidos). Migração `20261031090000_agenda_e_google.sql`; teste de isolamento ganhou a verificação 7 (compromissos por empresa e perfil; tokens invisíveis). Google entra na lista de suboperadores (opcional). `supabase/aplicar/04-agenda-e-google.sql` aplicado pelo Pedro em 31/10/2026 e publicado. Falta: seguir `docs/google-agenda.md` (Google Cloud, segredos e publicar a função).
- 30/10/2026: **retorno do teste de uso do Pedro** (tudo OK nas 7 partes). Ajustes: olho para ver a senha (entrar e nova senha); círculo de carregamento ao entrar e ao abrir o sistema; **excluir cliente** (sem eventos: apaga de vez; com eventos: apaga os dados pessoais e mantém o histórico financeiro, "Cliente removida"); máscaras de telefone, CPF/CNPJ, CEP (campo novo) e valores em reais, nome e cidade com maiúsculas; **Lançar com "Parcelado" (2 a 60 vezes) e "Todo mês"** (entradas e saídas), excluir esta parcela e as seguintes, parar de repetir; campos com 16px (o iPhone não dá zoom), um campo por linha no celular, itens do contrato reorganizados no celular. Migração `20261030090000_parcelas_e_recorrencias.sql`, testada em Postgres local (repetição começando no mês certo, dia 31 em fevereiro, parcela e CEP inválidos recusados, isolamento ok). **`supabase/aplicar/03-parcelas-e-recorrencias.sql` aplicado pelo Pedro no SQL Editor em 30/10/2026** (com "Run and enable RLS" na tabela de controle); publicado em seguida. **Pedro confirmou no sistema publicado: "tudo deu certo" (30/10/2026).**
- 30/10/2026: meta de R$ 3.000 líquidos por mês registrada, com os gatilhos para um dia sair do emprego (em Decisões). Próximo passo comercial: conversar com 5 donos de pequenos negócios e fechar o primeiro cliente pagante.
- 30/10/2026: **3 planos** para enviar no WhatsApp (`docs/modelos/planos/`, 8 lâminas + PDF): Essencial R$ 1.500 + R$ 129,90; Profissional R$ 2.500 + R$ 199,90; Parceiro R$ 3.900 + R$ 399,90. Diferem em módulos, usuários, histórico de backup, frequência de revisão, ajustes e prazo de suporte. Conta de horas e custos no LEIA-ME. Valores em rascunho, a validar.
- 30/10/2026: adiantado em paralelo ao teste de uso: cabeçalhos de segurança (CSP e afins) gerados no build e testados; fontes servidas pelo próprio site; revisão de design no celular com correções de toque e foco; tela de erro com a marca; rascunhos de LGPD (política, termos, suboperadores, plano de incidente); proposta comercial em PDF; checklist de novo cliente com scripts de migração e publicação; README completo. Backup diário agora só roda no horário depois da variável `BACKUP_ATIVO`; dependência `jspdf` (sem uso) removida.
- 30/10/2026: **Fase 3 concluída.** 2FA ligado em Gmail, GitHub e Supabase; Cloudflare sem 2FA próprio por usar login Google (justificado).
- 30/10/2026: **backup diário** escolhido (R2, criptografado, com teste de restauração automático). O teste achou uma falha: o dump só do `public` não levava as funções do schema `privado`; corrigido.
- 30/10/2026: modelo comercial e de infraestrutura registrados em Decisões (valores em rascunho; **onde fica o Supabase continua em aberto**). Itens de operação e proposta adicionados à Fase 12.
- 29/10/2026: sistema publicado no Cloudflare e **login testado ao vivo** (Pedro entrou). `main` recebeu o código da v1 por merge. Falta na Fase 3: Dependabot/secret scanning, decisão sobre proteção da `main` (plano gratuito não protege repositório privado) e 2FA.
- 28/10/2026: `PROJETO.md` criado; Fase 1 iniciada.
- 28/10/2026: termo da Fase 2 enviado à Aline pelo WhatsApp (aguardando resposta).
- 28/10/2026: exportação em **Excel formatado + CSV**; PDFs de **contrato, recibo, fechamento do mês, fluxo de caixa e resumo do evento**, com a marca da Aline; aba **Contratos** (só a proprietária) usando o contrato que ela já usa, palavra por palavra. Pontos do contrato para advogado em `docs/contrato-observacoes.md`.
- 28/10/2026: dados da empresa para documentos (CNPJ, banco, PIX, foro, responsável) ficam em Configurações, no banco, nunca no código. Dados reais da cliente do PDF de exemplo não entraram no repositório.
- 28/10/2026: com autorização do Pedro, problemas sérios do código antigo corrigidos antes da aprovação da Aline: banco reescrito com RLS e teste de isolamento, camada de dados no Supabase com TanStack Query e Zod, login por convite. A migração **não foi aplicada em nenhum Supabase**: só depois do repositório privado e da aprovação da Aline.
- 28/10/2026: revisão do código da branch antiga em `docs/revisao-codigo-antigo.md`: compila, 0 vulnerabilidades, mas RLS com `using (true)` e sem financeiro; aproveitar estrutura e utilitários, reescrever banco e camada de dados.
- 28/10/2026: protótipo v1 publicado para a rodada de ajustes.
- 28/10/2026: ajuste 2 do protótipo: entrada de 30% e saldo 5 dias antes, categorias de custo da entrevista (freelancers, deslocamento, taxas de cartão, peças perdidas).
- 28/10/2026: ajuste 1 do protótipo: fundo branco com confetes como no site e números sem quebrar no celular.
- 29/10/2026: banco aplicado no projeto Supabase (estrutura v1, contratos e logística, permissões da API) e primeiro acesso criado. Conferência ao vivo pendente.
- 29/10/2026: **um único projeto Supabase** (o `-dev`) para testes e uso real, plano gratuito, por decisão do Pedro. Riscos explicados uma vez (sem ambiente separado para testar migrações, dados de teste misturados, sem backup diário garantido, pausa por inatividade). Condições nas Fases 10 e 11. Renomear o projeto para `aline_antunes_decora` é opcional e não muda URL nem chave.
- 29/10/2026: projeto Supabase criado com **Enable Data API: ligado**, **Automatically expose new tables: DESLIGADO** (recomendação do próprio Supabase: o acesso é concedido à mão) e **Enable automatic RLS: ligado** (rede de proteção para tabelas futuras). Migração `20261029100000_permissoes_api.sql` concede o mínimo a cada tabela; teste de isolamento passa nos dois modos da caixa.
- 29/10/2026: **Fase 2 concluída**: Aline aprovou o protótipo e concordou com os dados e prazos por escrito (WhatsApp). Portão da fase ok: 6 de 6 itens. Pendente, sem travar nada: custos fixos, divisão do lucro e retirada mínima, que ela cadastra em Configurações.
- 28/10/2026: Fase 1 concluída (portão ok: todos os itens `[x]`, contrato dispensado com justificativa). Fase 2 iniciada.
