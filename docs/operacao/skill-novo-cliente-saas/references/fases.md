# Checklist das 12 fases (copie para o PROJETO.md de cada cliente)

Cada item vira `- [ ]`. Marque `[x]` com data e evidência; "dispensado" só com a justificativa do Pedro.

## Fase 1: Descoberta e escopo
- [ ] Nome e ramo do cliente
- [ ] Dor principal, em horas ou reais por mês, e **medida de sucesso** (ex.: "lança uma saída em menos de 1 minuto pelo celular")
- [ ] Quem usa, quantos usuários, em que aparelho (celular, tablet, computador)
- [ ] O que entra na primeira versão e o que fica para depois (corte para o menor sistema que resolve a dor)
- [ ] Como o dinheiro e o trabalho fluem: venda, orçamento, contrato, estoque, categorias (perguntas em `licoes.md`)
- [ ] Dados pessoais guardados e se há dados sensíveis (art. 11 da LGPD)
- [ ] Logo, cores e referências visuais; contraste das cores medido
- [ ] Domínio desejado
- [ ] Contrato assinado e 50% do setup recebidos (ou dispensado, com motivo)

## Fase 2: Modelagem e protótipo
- [ ] Telas e fluxos listados
- [ ] Modelo de dados em texto simples, aprovado pelo Pedro
- [ ] Protótipo clicável com dados fictícios, testado em 1280px e 375px, nos dois temas
- [ ] Uma rodada de ajustes
- [ ] Aprovação do cliente por escrito (WhatsApp vale; guarde o comprovante em `docs/aprovacoes/`)
- [ ] Mapa de dados pessoais: campo, finalidade, base legal, prazo de retenção

## Fase 3: Contas e repositório
- [ ] Repositório privado (a partir do `template-base`)
- [ ] Proteção da `main` ou "dispensado" (GitHub gratuito não protege repositório privado)
- [ ] Dependabot e secret scanning ligados
- [ ] `.env.example` sem segredos; `.gitignore` com `.env*`
- [ ] Projeto Supabase (região São Paulo; onde fica e em que plano conforme "Decisões"); "Automatically expose new tables" desligado
- [ ] Ambiente de testes separado, ou "um projeto só" com as condições escritas
- [ ] Cloudflare Workers com arquivos estáticos ligado à `main` (`wrangler.jsonc`), variáveis de build só com a chave pública, URL `workers.dev` ligada, login testado ao vivo
- [ ] 2FA no e-mail principal, GitHub, Supabase e Cloudflare (Cloudflare com login Google: protegido pelo 2FA do Gmail, justificado)

## Fase 4: Banco de dados e RLS
- [ ] Convenções de `banco.md` aplicadas; toda mudança por migração
- [ ] RLS em todas as tabelas do `public` (consulta de `rowsecurity = false` vazia)
- [ ] Políticas por empresa via `usuarios_empresas`, uma por operação, `with check` em insert e update
- [ ] Nenhuma política usa `user_metadata`; nenhuma `using (true)` em tabela de negócio
- [ ] Views com `security_invoker`; `security definer` só no `privado` com `search_path = ''`
- [ ] `grant` explícito por tabela; `anon` sem nada
- [ ] Storage: buckets privados por empresa, ou "dispensado" com a evidência de zero buckets
- [ ] `service_role` fora do front-end e do repositório
- [ ] Teste de isolamento (`supabase/tests/isolamento.sql`) passando localmente e no GitHub Actions; confirmado que ele acusa furos plantados
- [ ] Security Advisor zerado ou justificado

## Fase 5: Autenticação e permissões
- [ ] Cadastro aberto desligado; pessoas criadas pelo Pedro e ligadas à empresa por script
- [ ] Senha mínima de 10 caracteres, com letras e números; sessão curta com renovação; limites de tentativa conferidos
- [ ] Site URL e Redirect URLs só de produção (trocar pelo domínio na Fase 8)
- [ ] Verificação em duas etapas disponível (recomendada para quem vê financeiro e CPF)
- [ ] Perfis checados no banco (proprietária, assistente com financeiro opcional, freelancer)
- [ ] Recuperar, trocar senha e sair de todos os aparelhos funcionando (o e-mail depende do SMTP da Fase 8)

## Fase 6: Construir o sistema
- [ ] Módulos-base: login por convite, empresa e equipe, painel, listas com busca, filtro e exportação (Excel e CSV), configurações, registro de atividades
- [ ] Telas do cliente, uma a uma, aprovadas pelo Pedro, testadas na prévia e no banco real
- [ ] Prévia (`build:demo`) com dados fictícios, igual às regras do banco
- [ ] TypeScript estrito; Zod em todo formulário; máscaras (telefone, CPF/CNPJ, CEP, dinheiro); sem `dangerouslySetInnerHTML`
- [ ] Erro tratado em toda chamada ao banco, com mensagem clara
- [ ] Logs sem dados pessoais
- [ ] Nenhum segredo no código
- [ ] `npm audit` sem críticas

## Fase 7: Design (o gosto é do Pedro; você sugere 2 ou 3 direções)
- [ ] Direção visual aprovada pelo Pedro (e pelo cliente)
- [ ] Tokens e temas claro e escuro testados em todas as telas
- [ ] Contraste de 4,5:1 medido tela a tela (`npm run auditoria`)
- [ ] Logo do cliente no topo; rodapé "feito por Pedro Hoffman" com o símbolo de 12px
- [ ] Espaços 4/8/12/16/24/32/48/64, cantos 4/8/12/16, um botão principal por tela (auditoria)
- [ ] Estados vazio, carregando e erro; confirmação em ação destrutiva; aviso de sucesso; erro junto ao campo
- [ ] Celular de 360px sem rolagem lateral; teclado; foco visível; texto mínimo de 14px; toque de 44px; campos com 16px
- [ ] Textos curtos no infinitivo; datas, moeda e números no formato brasileiro (auditoria)
- [ ] Ícones, favicon, título da aba, 404 e tela de erro com a marca

## Fase 8: Domínio, e-mail e cabeçalhos
- [ ] Subdomínio do cliente apontado para o Worker; HTTPS
- [ ] E-mail próprio (Resend com o domínio do cliente) como SMTP do Supabase; modelos em português; "Esqueci a senha" testado com o e-mail do cliente; avisos de segurança ligados
- [ ] Cabeçalhos (HSTS, nosniff, Referrer-Policy, Permissions-Policy, frame-ancestors e CSP só com o próprio site e o Supabase), gerados no build e **conferidos no endereço publicado**
- [ ] Prévias desligadas ou protegidas; `noindex`
- [ ] Variáveis de produção e prévia separadas
- [ ] Turnstile no login, se o risco justificar
- [ ] Web Analytics, se o cliente quiser

## Fase 9: LGPD
- [ ] Política de privacidade e termos, revisados por advogado e publicados no sistema
- [ ] Lista de suboperadores no anexo do contrato (Supabase, Cloudflare, R2, GitHub, Resend e Google, se usados)
- [ ] Exportar e excluir os dados de uma pessoa; retenção implementada
- [ ] Plano de incidente (24h ao cliente; ANPD em 3 dias úteis; registro por 5 anos)

## Fase 10: Qualidade antes da entrega
- [ ] `SECURITY_CHECKLIST.md`; isolamento passando; Advisor zerado
- [ ] GitHub Actions: tipos, testes, build, `npm audit` e isolamento
- [ ] Roteiro manual no computador e no celular, nos dois temas, com o banco real
- [ ] Backup diário criptografado no R2, com os dois schemas (`public` e `privado`) e **restauração testada**
- [ ] Revisão de segurança do código inteiro
- [ ] Desempenho no celular; listas paginadas

## Fase 11: Entrega e go-live
- [ ] Dados de teste apagados; decisão sobre um ou dois projetos revista
- [ ] Acesso de proprietário do Pedro rebaixado (assistente ou removido)
- [ ] Dados reais importados e conferidos
- [ ] Usuários convidados
- [ ] Teste com o cliente por 3 a 5 dias
- [ ] Treino de 30 minutos e manual de 1 página
- [ ] Go-live; 50% restantes; mensalidade iniciada
- [ ] Monitor de disponibilidade (5 min) e alerta de erro por e-mail

## Fase 12: Documentação e operação
- [ ] README do cliente (arquitetura, contas, variáveis, restauração, publicação)
- [ ] Rotinas agendadas: semanal (alertas, backups, Dependabot), mensal (cobrança, relatório, acessos, custos), trimestral (restauração, troca de chaves), anual (reajuste)
- [ ] Suporte por canal único; pedidos viram Issues (P1 em 4h úteis, P2 em 1 dia útil, P3 agendado)
- [ ] Offboarding (exportar, entregar, revogar, excluir após 30 dias com comprovante)
- [ ] Checklist e scripts de novo cliente (`docs/operacao/novo-cliente.md`, `scripts/cliente/`)
- [ ] Automação: backup, monitor, rotina contra pausa do banco gratuito
- [ ] Proposta e contrato comercial revisados por advogado
- [ ] Prazos de suporte escritos; exclusividade no emprego conferida; MEI ou ME aberto antes de cobrar
