# SGW Pro — Registro Técnico, Bugs e Roadmap

> **Propósito:** Ponto de retomada para qualquer sessão futura. Contém o estado exato do projeto, o que foi feito, o que está pendente e as decisões de arquitetura confirmadas.
> Última atualização: 2026-05-19

---

## ÍNDICE

1. [PONTO DE PARADA — Onde estamos agora](#1-ponto-de-parada)
2. [Histórico de Sessões](#2-histórico-de-sessões)
3. [Bugs Conhecidos e Pendências](#3-bugs-conhecidos-e-pendências)
4. [Próximos Passos Priorizados](#4-próximos-passos-priorizados)
5. [Decisões de Arquitetura Confirmadas](#5-decisões-de-arquitetura-confirmadas)
6. [Roadmap de Deploy (autotech.app.br)](#6-roadmap-de-deploy-autotechappbr)
7. [FAQ Técnico](#7-faq-técnico)
8. [Análise das Skills Locais](#8-análise-das-skills-locais)

---

## 1. PONTO DE PARADA

**Arquivo principal:** `sgw_pro.html` (~10.239 linhas)
**Status:** ✅ FUNCIONAL — Tailwind pre-built CSS, Babel pré-compilado (sem runtime), componentes OK, popover no Dashboard funcional, senha mestra no App, backup criptografado .enc, notificações de vencimento, gráficos Financeiro.

### O que está funcionando
- Dashboard com métricas e lista de licenças recentes
- Popover hover nos itens recentes (posicionamento acima/abaixo com scroll)
- Aba Clientes sem tela preta
- Formulário de edição (LicForm) carrega sem erro
- Upload de imagens (UpArea) e exibição de serial (Serial)
- Serviços Docker: postgres, api, nginx, ai-mock rodando

### Problemas conhecidos
- SW `message channel` warning (benigno, Chrome DevTools artifact)
- `Feature-Policy: file-system-access` warning (benigno, header não reconhecido)

### Próximos passos sugeridos
- Testar CRUD completo via API + IndexedDB fallback
- Testar scanner screen cards (upload 8 telas, cores/emoji)
- Verificar splash screens (auth 3s, system 15s)
- Analisar módulo Financeiro (placeholder)

**Para continuar:**
1. `docker-compose up --build -d` se containers não estiverem rodando
2. Abrir `http://localhost:8081` — login `admin`/`admin123`

### O que foi feito nesta sessão (2026-05-18)

| # | Alteração | Arquivo | Status |
|---|-----------|---------|--------|
| DB-1 | IDB v3→v4: índice `regiaoAtivacao` + schema bump | `sgw_pro.html:321` | ✅ Feito |
| DB-2 | License record: campos `regiaoAtivacao` e `plataformaHomologacao` | `sgw_pro.html:1938-1943` | ✅ Feito |
| UI-1 | LicForm: select Região de Ativação + campo Plataforma | `sgw_pro.html:3602-3613` | ✅ Feito |
| UI-2 | Dashboard clients table: coluna Reg. Ativação + badge colorido | `sgw_pro.html:3128` | ✅ Feito |
| UI-3 | Dashboard mobile card: linha Reg. Ativação | `sgw_pro.html:3102` | ✅ Feito |
| UI-4 | Dashboard filter: busca por `regiaoAtivacao` + filtro rápido Am. Norte/Europa/Outras | `sgw_pro.html:3044-3077` | ✅ Feito |
| DOC-1 | AGENTS.md: atualizado IDB v3→v4 | `AGENTS.md:53` | ✅ Feito |

### O que foi feito nesta sessão (2026-05-18) — BUG-001: Babel eliminado

| # | Alteração | Localização | Status |
|---|-----------|-------------|--------|
| BABEL-3 | JSX pré-compilado via Babel CLI (`@babel/preset-react`) — runtime eliminado | `sgw_pro.html` (todo `<script>`) | ✅ Feito |
| BABEL-4 | Babel CDN fallbacks removidos (local + jsdelivr + unpkg) | `<head>` | ✅ Feito |
| BABEL-5 | Watchdog não verifica mais `typeof Babel` | `sgw_pro.html` head | ✅ Feito |
| BABEL-6 | `babel.min.js` removido de `sgw_pro_files/` (2.8MB) | `sgw_pro_files/` | ✅ Feito |
| CLEAN-1 | `tailwindcss.js` removido de `sgw_pro_files/` (~1MB, não usado) | `sgw_pro_files/` | ✅ Feito |
| SW-2 | Cache key bump v6→v7 | `sw.js:1` | ✅ Feito |
| DOC-2 | AGENTS.md + bug.md atualizados | raiz | ✅ Feito |

**Ganho:** ~3.8MB em arquivos removidos. Babel runtime 800ms–2.5s eliminado do primeiro load.

### O que foi feito nesta sessão (2026-05-14)

| # | Correção | Localização | Status |
|---|----------|-------------|--------|
| QA-3 | Boot: aviso toast se `autoBackup=true` mas permissão não `granted` | linha ~3377 | ✅ Feito |
| QA-3 | Save: re-verifica permissão antes de cada `writeBackup` | linha ~3431 | ✅ Feito |
| BUG-005 | Fallbacks CDN para 7 libs sem proteção (QRCode, html2canvas, jsPDF, JSZip, XLSX, PDF.js) | `<head>` | ✅ Feito |
| QA-2 | `imgUp`: refatorado de callbacks aninhados para Promise chain + canvas cleanup + reset do input | linha ~3398 | ✅ Feito |
| QA-1 | `ExtractorBatch`: substituído `tick()` por `requestAnimationFrame` com coalescing (max 60fps) | linha ~1188 | ✅ Feito |
| QA-1 | Stats lêem de `snap` (snapshot por frame) em vez de 6× `.filter()` no render | linha ~1545 | ✅ Feito |
| Rebranding | "Aberama Brasil" / "ABERAMA BRASIL" → "Sistema Teste" / "SISTEMA TESTE" em todo o arquivo | global | ✅ Feito |
| Rebranding | Email `suporte@aberamabrasil.com.br` → `suporte@sistemateste.com.br` | global | ✅ Feito |
| Rebranding | Demo data: `technician:'Carlos Aberama'` → `technician:'Carlos Técnico'` | global | ✅ Feito |
| Título | `<title>` e versão corrigida para `SGW Pro v11.0.0 \| Sistema Teste` | linha 1 | ✅ Feito |
| Dead code | `anthropicKey` removido: prop em `ExtractorBatch`, prop em `Settings`, `useState` no `App`, bloco `boot()` e props no render | 5 locais | ✅ Feito |
| QA-OFF1 | Loop retry: off-by-one (`while(retries<=MAX)` → `retries<MAX`) + verificação (`>` → `>=`) | linha 1337, 1347 | ✅ Feito |
| BUG-004 | Rate limiting: lê header `Retry-After` + jitter aleatório (0-2s) | linhas 1348, 1387 | ✅ Feito |
| BUG-008 | Path nano-banana-2: `./.agents/skills/` → `.claude/skills/` | SKILL.md | ✅ Feito |
| A11Y-01 | Inputs com `outline-none`: adicionado `focus:ring-2 focus:ring-cy-500` | linhas 1671, 1822 | ✅ Feito |
| Setup | Criado SETUP.md para setup do projeto | raiz | ✅ Feito |
| Teste | Testado localmente via Python HTTP server — FUNCIONANDO | http://localhost:8080 | ✅ OK |

> **Nota sobre `anthropicKey`:** A chave ainda é lida diretamente via `db.getConfig('anthropicKey')` dentro do `ExtractorBatch` (comportamento local preservado). O que foi removido foi o estado duplicado no `App` que propagava a chave via props — esse era o código morto.

### Sessão 2026-05-15
- Toast de notificação de licenças vencendo (<=30 dias) no boot
- Toggle de exportação criptografada (AES-256) no Settings
- Suporte a import de arquivos .enc (criptografados)
- Badge de vencimento em Financeiro já existente (exp30)
- Correções Web Guidelines (Vercel):
  - `transition: all` → propriedades específicas (7 ocorrências)
  - Adicionado `prefers-reduced-motion` para usuários que solicitam
  - Adicionado `color-scheme: dark` no HTML
  - Adicionado preconnect para CDNs (jsdelivr, cdnjs, fonts)
  - Input de busca com focus ring e aria-label
  - Input de clientes com aria-label

### Sessão 2026-05-18 (vesp) — Correção de bugs: tela preta + popover

| # | Correção | Localização | Status |
|---|----------|-------------|--------|
| BUG-009 | `L.days`: crash quando `validUntil` não é string (número ou formato inválido) — adicionado `typeof d!=='string'` + `Number.isNaN(diff)` | `sgw_pro.html:312` | ✅ Feito |
| BUG-010 | `L.daysBetween`: crash quando argumento não é string — adicionado `typeof a!=='string' \|\| typeof b!=='string'` + `isNaN(s)\|\|isNaN(e)` | `sgw_pro.html:313` | ✅ Feito |
| BUG-011 | Popover (card flutuante): IIFE crashava se `hoveredLic` tivesse dados malformados — adicionado safety check `if(!h\|\|!h.lic\|\|!h.rect)return null` | `sgw_pro.html:3352` | ✅ Feito |
| BUG-012 | `importTxt` dependência `fixStatus` ausente no `useCallback` — adicionado | `sgw_pro.html:4456` | ✅ Feito |
| QA-4 | Duplicação `const doImport` inserida acidentalmente por edit — removida | `sgw_pro.html:4458` (removida) | ✅ Feito |

**Causa raiz das telas pretas (Cadastro, TXT import):** `L.daysBetween(a,b)` chamava `a.split('-')` e `b.split('-')` sem verificar se `a` e `b` são strings. Quando um TXT com data em formato numérico (ex: `"validUntil": 20261231`) era importado, a função `daysBetween` crashava com `TypeError: b.split is not a function`, derrubando o `LicForm` (cadastro) e o `Ring` component → tela preta.

**Causa raiz da tela preta em Clientes:** A popover IIFE `{!!hoveredLic&&(()=>{...})()}` estava dentro do componente `Clients`, mas `hoveredLic` é definida com `const` no escopo do `Dashboard`. Ao transpilar com Babel, o acesso a `hoveredLic` no escopo do `Clients` gerava `ReferenceError`, derrubando o componente inteiro → tela preta. Fix: mover a popover IIFE para o `Dashboard` (linhas 3195-3242), onde `hoveredLic` está no escopo.

### Sessão 2026-05-18 (noturna) — REVERTIDA

Todas as alterações desta sessão foram **revertidas** a pedido do usuário (loop infinito na tela SGW Pro).

**Alterações revertidas:**
- BUG-009, BUG-010: `L.days` / `L.daysBetween` voltaram ao original (sem type guard)
- BUG-011: Safety check `if(!h||!h.lic||!h.rect)` removido (popover original restaurado)
- BUG-012: `fixStatus` removido das deps do `importTxt`
- BUG-013: Popover IIFE removida do Dashboard, recolocada no Clients (bug original do ReferenceError) 

**Próximo passo:** Analisar passo a passo cada bug, começando pelo loop infinito.

**Academic Research Skills instalados em:** `C:\Users\Espinoza\.claude\skills\` (deep-research, academic-paper, academic-paper-reviewer, academic-pipeline)

### Sessão 2026-05-18 — API PostgreSQL, Performance, Scanner Cards, Loading Screens, Botões

| # | Alteração | Localização | Status |
|---|-----------|-------------|--------|
| API-1 | PUT route mudou para UPSERT (`INSERT ... ON CONFLICT (id) DO UPDATE`) | `api-server/src/routes/licenses.js:219` | ✅ Feito |
| API-2 | POST route auto-genera ID (`lic_` + 16 hex chars) se body sem `id` | `api-server/src/routes/licenses.js:191` | ✅ Feito |
| API-3 | List endpoint removeu `decryptFields` — 600k iterações PBKDF2 por campo → ~24ms | `api-server/src/routes/licenses.js:129` | ✅ Feito |
| API-4 | Key derivation cache (`Map` keyed by salt hex) para evitar PBKDF2 repetido | `api-server/src/crypto.js:12` | ✅ Feito |
| BD-1 | 10 licenças teste criadas via API no PostgreSQL (2 expiradas, 6 ativas, 2 pendentes, 3 regiões) | PostgreSQL via psql | ✅ Feito |
| UI-1 | `SCREENS_CFG` com `emoji` + `color` por tela (🏠cyan, 🔍blue, ⚠️red, 🚗amber, 🔑purple, 👤emerald, ⏳yellow, ✅green) | `sgw_pro.html:258-266` | ✅ Feito |
| UI-2 | Scanner cards: cor específica por tela (borda, bg, shadow, emoji `text-2xl`, hover scale) | `sgw_pro.html:3959-3981` | ✅ Feito |
| UI-3 | "Selecionada" section: IIFE com cor dinâmica por tela | `sgw_pro.html:3981` | ✅ Feito |
| UI-4 | `validUntil`/`activationDate`: activationDate onChange **sempre** recalcula validUntil (+12 meses) | `sgw_pro.html:3921` | ✅ Feito |
| UI-5 | "Período de Validação": IIFE calcula dias + meses, banner verde ✅ ou vermelho ⚠️ | `sgw_pro.html:3928` | ✅ Feito |
| UI-6 | Botões adicionados no LicForm: **➕ Novo**, **🗑️ Excluir** (só se `lic.id`), + Salvar/Licenças/PDF/Link | `sgw_pro.html:3800-3805` | ✅ Feito |
| UI-7 | Botões adicionados no header (desktop): **➕ Novo**, **🗑️ Excluir**, Histórico, PDF, **💾 Salvar** | `sgw_pro.html:4549-4553` | ✅ Feito |
| SPLASH-1 | Auth loading (spinner "Conectando...") com mínimo 3s | `sgw_pro.html:4691` | ✅ Feito |
| SPLASH-2 | System loading (9 dots blink + "SISTEMA TESTE" + progress bar) com mínimo 15s | `sgw_pro.html:4168` | ✅ Feito |
| SPLASH-3 | Original spinner restaurado em ambas as telas (splash estática + auth loading) | `sgw_pro.html:4451-4468`, `sgw_pro.html:4698-4702` | ✅ Feito |

### Sessão 2026-05-19
- Backup criptografado AES-256 (.enc) com senha — export + import
- Notificações de vencimento ≤30 dias via toast no boot
- Gráficos no módulo Financeiro (receita mensal, distribuição plano/equipamento)
- SEC-002: `S._cryptKey()` migrado de localStorage para sessionStorage
- SEC-003: cache `sgw8_eq` expira em 7 dias (timestamp `sgw8_eq_ts`)
- Autenticação pré-deploy: senha mestra SHA-256 no App (criação/unlock via sessionStorage)
- BUG-002 resolvido: `db.deleteConfig('anthropicKey')` no boot + método `deleteConfig` no DB
- MEL-02 resolvido: checksum SHA-256 em export JSON/.enc + verificação no import
- Docker rebuild + push para `edsespinoza/SGW_PRO` (commit `a6f061a`)
- AGENTS.md atualizado com master password, backup .enc, cache expiry, sessionStorage

### Sessão 2026-05-15 — Revisão de Segurança e Qualidade
- Skills instaladas: 14 (ai-image-generation, ai-video-generation, content-marketing, docx, find-skills, frontend-design, infsh-cli, nano-banana-2, pdf, remotion-best-practices, twitter-automation, ui-ux-pro-max, vercel-react-best-practices, web-design-guidelines)
- Agents instalados: 8 VoltAgent (code-reviewer, security-auditor, javascript-pro, sql-pro, frontend-developer, performance-engineer, database-optimizer, documentation-engineer)
- Melhorias na exportação PDF:
  - Metadados (title, subject, author, keywords, creator)
  - Proteção por senha opcional (AES-128)
  - Marca d'água "SISTEMA TESTE" em cada página
  - Qualidade de renderização aumentada (scale: 2 → 3, jpeg: 0.93 → 0.95)
  - Timeout de imagem aumentado (0 → 15000ms)
- Melhorias na importação de PDF (exParsePdf):
  - Múltiplos patterns para CPF/CNPJ (4 patterns cada)
  - Múltiplos patterns para telefone (5 formatos)
  - Múltiplos patterns para nome (4 formatos Aberama/Sistema)
  - Múltiplos patterns para serial (4 formatos)
  - Múltiplos patterns para senha (@ + explicit labels)
  - Múltiplos patterns para login (pós-senha + labels)
  - Múltiplos patterns para data de expiração (5 formatos)
  - Múltiplos patterns para UF (2 formatos + fallback)
  - Múltiplos patterns para observações (2 formatos)
  - Limite de páginas: 6 → 8 para PDFs maiores

### Bug introduzido e corrigido na mesma sessão

- **JSX syntax error** em `UpArea` onChange durante a correção QA-2: `}}/>` estava como `}/>`. Fez o Babel falhar ao carregar a app inteira. Corrigido antes do usuário testar novamente.

---

## 2. Histórico de Sessões

### Sessão 2026-05-18
- API PostgreSQL: UPSERT no PUT, auto-ID no POST, removido decryptFields do list (30s→24ms)
- Key derivation cache no server-side crypto
- 10 licenças teste no PostgreSQL (2 expiradas, 6 ativas, 2 pendentes)
- SCREENS_CFG com emoji + color por tela (8 cores)
- Scanner cards coloridos por tela + "Selecionada" section dinâmica
- activationDate onChange sempre recalcula validUntil (removido guard)
- "Período de Validação" com IIFE dias/meses + banner verde/vermelho
- Splash screens: auth 3s mínimo, system 15s mínimo, spinners originais restaurados
- Botões Novo + Excluir adicionados no LicForm e header
- **BUG-001 resolvido:** Babel runtime eliminado (pré-compilação CLI)
- Babel CDN removido (local + jsdelivr + unpkg) — ganho ~2.8MB / 800ms–2.5s no 1º load
- Watchdog simplificado (não verifica mais Babel)
- `babel.min.js` e `tailwindcss.js` removidos de `sgw_pro_files/`
- SW cache key v6→v7

### Sessão 2026-05-13
- Instalado skill `systematic-debugging`
- Review multi-agente do `sgw_pro_final_v11.html` (~3.472 linhas na época)
- Aplicadas correções QA-3, BUG-005, QA-2, QA-1
- Rebranding completo: Aberama Brasil → Sistema Teste
- Título corrigido para v11.0.0
- Dead code `anthropicKey` (prop-drilling) removido

### Sessão 2026-04-26
- Análise técnica completa do projeto
- Decisões de arquitetura confirmadas (Chrome/Edge, single-file, cyan+violet)
- Skill `ui_ux_pro_max_pt_br_profissional` reescrita
- BUG-006 resolvido (cards no mobile)
- BUG-007 resolvido (índices IDB em status/region/validUntil — DB v3)
- MEL-002 resolvido (paginação 20/pág em Clientes, 15/pág em LicModal)

---

## 3. Bugs Conhecidos e Pendências

### Revisão de Segurança (2026-05-15) — Vulnerabilidades Identificadas

| ID | Severidade | Descrição | Localização | Status |
|----|------------|-----------|-------------|--------|
| SEC-001 | 🔴 Alta | `anthropicKey` armazenada em IndexedDB — acessível via DevTools | `db.getConfig/setConfig('anthropicKey')` | Aberto - requer proxy server-side |
| SEC-002 | 🟡 Média | Chave de criptografia (`APP.KEY`) em localStorage — menos seguro que sessionStorage | `localStorage.getItem('_sgw8k')` | ✅ Resolvido 2026-05-19 (sessionStorage) |
| SEC-003 | 🟢 Baixa | Dados de equipamentos em localStorage sem expiração | `localStorage.setItem('sgw8_eq')` | ✅ Resolvido 2026-05-19 (7-day expiry) |

### Análise de Código - Pontos Positivos

| Aspecto | Status | Observação |
|---------|--------|------------|
| XSS Prevention | ✅ OK | React sanitiza inputs automaticamente |
| Input Validation | ✅ OK | CPF/CNPJ validation via `S.validCPF/CNPJ` |
| API Calls | ✅ OK | Usando JSON.stringify (seguro contra injection) |
| Password Fields | ✅ OK | Type="password" com toggle reveal |
| IndexedDB Encryption | ✅ OK | Campos sensíveis criptografados com AES-256 antes de salvar |
| API Proxy | ✅ OK | /api/ai-proxy não expõe chave no cliente |
| UUID Generation | ✅ OK | Usa crypto.getRandomValues |

### 🔴 Crítico

| ID | Descrição | Localização | Impacto | Status |
|----|-----------|-------------|---------|--------|
| BUG-001 | Babel transpilação em runtime — 800ms–2.5s no primeiro load | `<script type="text/babel">` | Performance | ✅ Resolvido 2026-05-18 (pré-compilado via Babel CLI) |
| BUG-002 | `anthropicKey` persiste no IndexedDB de sessões anteriores — exposta no DevTools | `db.getConfig/setConfig('anthropicKey')` | Segurança em produção web | ✅ Resolvido 2026-05-19 (deleteConfig no boot + proxy server-side em ai.js) |
| BUG-003 | `db.all('licenses')` sem paginação — carrega todos os registros na memória | `DB.all()` / `boot()` em `App` | Memória com 1k+ licenças | ✅ Resolvido 2026-05-14 (page, getCounts, count) |

### 🟡 Moderado

| ID | Descrição | Localização | Impacto | Status |
|----|-----------|-------------|---------|--------|
| BUG-004 | ExtractorBatch sem rate limiting real — ignora header `Retry-After` e sem jitter | `ExtractorBatch` → função `runItem` | Erros 429 em lotes de 200 PDFs | ✅ Resolvido 2026-05-14 |
| BUG-008 | Path errado no script nano-banana-2 | `.claude/skills/nano-banana-2/SKILL.md` | Skill não executa sem ajuste manual | ✅ Resolvido 2026-05-14 |
| QA-OFF1 | Off-by-one no retry loop: `while(item.retries<=MAX_RETRIES)` com `MAX_RETRIES=3` executa 4× | `ExtractorBatch` linha ~1350 | Retenta 1x a mais que o esperado | ✅ Resolvido 2026-05-14 |
| A11Y-01 | Inputs com `outline:none` sem focus replacement | linhas 1671, 1822 | Acessibilidade WCAG | ✅ Resolvido 2026-05-14 |
| A11Y-02 | Modais sem overscroll-behavior e role=dialog | linhas ~648, 733, 838, 1101 | WCAG Dialog | ✅ Resolvido 2026-05-14 |
| FEAT-01 | Backup JSON sem opção de criptografia | `doExport` / Settings | LGPD compliance | ✅ Resolvido 2026-05-15 |
| FEAT-02 | Notificações de vencimento no boot | `boot()` no App | Usuário não sabia de licenças próximas | ✅ Resolvido 2026-05-15 |
| MEL-01 | Mudar localStorage para sessionStorage para chave de criptografia | linha 223 | Melhoria de segurança | ✅ Resolvido 2026-05-19 |
| MEL-02 | Adicionar verificação de integridade de backup | Backup | Confiabilidade | ✅ Resolvido 2026-05-19 |
| MEL-03 | Exportação PDF com proteção por senha | CertPDF | Segurança + Profissionalismo | ✅ Resolvido 2026-05-15 |
| MEL-04 | Exportação PDF com marca d'água | CertPDF | Branding | ✅ Resolvido 2026-05-15 |
| MEL-05 | Melhorar extração de campos do PDF | exParsePdf | Importação de licenças via PDF | ✅ Resolvido 2026-05-15 |

### ✅ Resolvidos

| ID | Descrição | Resolução |
|----|-----------|-----------|
| BUG-005 | Libs sem fallback CDN (QRCode, jsPDF, html2canvas, JSZip, XLSX, PDF.js) | Adicionados 7 blocos `<script>` fallback em `<head>` — sessão 2026-05-13 |
| BUG-006 | Mobile: colunas ocultas via CSS, não responsividade real | Cards no mobile, tabela no desktop — v11 |
| BUG-007 | IndexedDB sem índices — full scan em cada consulta | Índices em `status`, `region`, `validUntil` — DB v3 |
| QA-1 | `tick()` síncrono no ExtractorBatch causava re-renders a cada item processado | RAF coalescing + snapshot `snap` — sessão 2026-05-13 |
| QA-2 | `imgUp` com callbacks aninhados, canvas não liberado, input não resetado | Promise chain + `c.width=0` cleanup + `e.target.value=''` — sessão 2026-05-13 |
| QA-3 | Backup silencioso: `autoBackup=true` sem aviso de permissão expirada | Toast warning no boot + re-verificação antes de cada `writeBackup` — sessão 2026-05-13 |
| MEL-002 | Sem paginação nas listas | 20/pág em Clientes, 15/pág em LicModal — v11 |
| QA-OFF1 | Off-by-one no retry loop (`<=` vs `<`, `>` vs `>=`) | Correção loop + verificação MAX_RETRIES — sessão 2026-05-14 |
| BUG-004 | ExtractorBatch sem rate limiting real | Lê header `Retry-After` + jitter 0-2s — sessão 2026-05-14 |
| BUG-008 | Path errado no skill nano-banana-2 | `./.agents/skills/` → `.claude/skills/` — sessão 2026-05-14 |
| A11Y-01 | Inputs com `outline:none` sem focus ring | `focus:ring-2 focus:ring-cy-500` — sessão 2026-05-14 |
| BUG-003 | DB.all() sem paginação | `db.page()`, `db.getCounts()`, `db.count()` com índices IDB — sessão 2026-05-14 |
| A11Y-02 | Modais sem accessibility | `overscroll-behavior:contain` + `role="dialog"` + `aria-labelledby` — sessão 2026-05-14 |
| FEAT-01 | Backup JSON sem opção de criptografia | Toggle AES-256 no Settings + import .enc — sessão 2026-05-15 |
| FEAT-02 | Notificações de vencimento no boot | Toast warning com exp30 no boot — sessão 2026-05-15 |
| BUG-009 | `L.days` crash com `validUntil` não-string | Guard `typeof d!=='string'` + `isNaN` — sessão 2026-05-18 |
| BUG-010 | `L.daysBetween` crash com argumentos não-string | Guard `typeof a!=='string'` + `isNaN` — sessão 2026-05-18 |
| BUG-011 | Popover crashava com `hoveredLic` malformado | Safety check `if(!h||!h.lic||!h.rect)return null` — sessão 2026-05-18 |
| BUG-012 | `importTxt` sem `fixStatus` no `useCallback` deps | Adicionado ao array de dependências — sessão 2026-05-18 |
| QA-4 | Duplicação `const doImport` por erro de edit | Removida linha duplicada — sessão 2026-05-18 |
| BUG-013 | Popover IIFE no `Clients` crashava com `ReferenceError` (hoveredLic fora de escopo) | Movida para o `Dashboard` — sessão 2026-05-18 |

---

## 4. Próximos Passos Priorizados

### Sprint imediato (próxima sessão)

**1. Verificar tudo funcionando no Docker**
- Acessar `http://localhost:8081` — senha mestra deve aparecer primeiro
- Login com `admin`/`admin123`
- Confirmar que notificação de vencimento aparece no boot
- Verificar gráficos no módulo Financeiro (agora com filtro de período + export PNG/PDF)
- Testar export/import de backup .enc criptografado
- Verificar que `anthropicKey` antiga foi removida do IDB

### Médio prazo

**2. Fase 2 deploy — preparar Vercel/Cloudflare**
- Rebuild `sgw_pro_final_v11.html` com Python
- Configurar domínio `autotech.app.br/sgw-pro`
- Testar HTTPS + File System Access API

**3. Melhorias adicionais**
- ~~Badge de licenças expirando no header global~~ ✅ Feito
- ~~Filtro de data no módulo Financeiro~~ ✅ Feito  
- ~~Exportar gráficos como PNG/PDF~~ ✅ Feito

---

## 5. Decisões de Arquitetura Confirmadas

| Data | Decisão | Justificativa |
|------|---------|--------------|
| 2026-04-26 | Manter single-file HTML como arquitetura | Portabilidade offline-first, sem servidor necessário |
| 2026-04-26 | Target: Chrome/Edge apenas | File System Access API + backdrop-filter sem fallbacks |
| 2026-04-26 | Paleta: Cyan + Violet (Linear-inspired) | Mais premium que cyan puro; gradient `#22d3ee → #a78bfa` |
| 2026-04-26 | Hero da landing: dashboard em ação (mockup/screenshot) | Produto concreto converte melhor que abstrato |
| 2026-04-26 | Preparar deploy em `autotech.app.br/sgw-dev/` | Subpasta para testes Dev antes de publicar ao cliente |
| 2026-05-13 | Rebranding para "Sistema Teste" | Nome neutro para desenvolvimento; nome final a definir |
| 2026-05-13 | `anthropicKey` não deve trafegar como prop — lida localmente no `ExtractorBatch` | Evita prop-drilling e estado duplicado no `App` |
| 2026-05-13 | `requestAnimationFrame` para coalescing de updates no ExtractorBatch | Limita re-renders a 60fps; uma única passagem de estado por frame |

---

## 6. Roadmap de Deploy (autotech.app.br)

### Fase 1 — Dev Local (atual)
- [x] Sistema SGW Pro v11 funcional em `file://`
- [x] ExtractorBatch com Claude AI
- [x] Backup em pasta local
- [x] Fallbacks CDN para todas as dependências
- [x] Rebranding para "Sistema Teste"

### Fase 2 — Subpasta de Testes Dev
- [ ] Resolver BUG-002 (proxy para `anthropicKey`)
- [ ] Implementar autenticação mínima (senha mestra)
- [ ] Checar CORS e mixed-content (CDN scripts via HTTPS — OK)
- [ ] Configurar CSP headers:
  ```
  Content-Security-Policy: script-src 'self' cdn.tailwindcss.com cdn.jsdelivr.net cdnjs.cloudflare.com;
  ```
- [ ] Escolher hosting:
  - **Opção A (recomendada):** Cloudflare Pages — zero custo, HTTPS automático, CI via git push
  - **Opção B:** Vercel — igualmente simples, free tier generoso
  - **Opção C:** nginx no servidor existente do autotech.app.br
- [ ] Testar File System Access API em HTTPS (deve funcionar nativamente)

### Fase 3 — Produção ao Cliente
- [ ] BUG-001: pré-compilar Babel (elimina 800ms–2.5s no load)
- [ ] Nome final do produto (hoje "Sistema Teste")
- [ ] Definir modelo de negócio: SaaS mensal vs licença perpétua
- [ ] Bundle das dependências CDN (eliminar dependência de jsdelivr/cdnjs)
- [ ] Plano de backup e SLA

### Considerações Técnicas para Deploy Web

> **File System Access API:** Requer HTTPS (secure context). Em Chrome/Edge funciona normalmente em `https://`. Adicionar `Feature-Policy: file-system-access` no servidor como boa prática.

> **IndexedDB por origin:** `SGWPro8` em `autotech.app.br/sgw-dev/` é completamente separado de `autotech.app.br/sgw-prod/` — ideal para testes sem risco de contaminar dados reais.

> **`anthropicKey` em produção web:** Chave no IDB exposta via DevTools. Solução: Cloudflare Worker como proxy — o browser chama `/api/ai-proxy`, o Worker injeta a chave do `env` e repassa à API Anthropic. Nunca exposto ao cliente.

---

## 7. FAQ Técnico

### Por que single-file HTML e não React/Next.js normal?

**R:** Portabilidade e zero infraestrutura. O arquivo roda direto no browser via `file://` sem servidor, sem Node.js, sem deploy. Para técnicos de campo que precisam de um sistema confiável em qualquer máquina com Chrome, isso é decisivo. A desvantagem é o Babel em runtime e o arquivo monolítico.

---

### Por que IndexedDB e não localStorage?

**R:** localStorage tem limite de ~5MB e é síncrono (bloqueia o thread). IndexedDB suporta gigabytes, é assíncrono e aceita objetos JavaScript complexos (incluindo `FileSystemDirectoryHandle` para o backup). O fallback em memória (`this.isMem`) garante que o sistema funciona mesmo quando IDB está bloqueado.

---

### O backup em pasta local funciona em todos os browsers?

**R:** Não. `window.showDirectoryPicker` (File System Access API) só funciona em Chrome/Edge 86+. Firefox e Safari não suportam. O sistema tem fallback gracioso: mostra badge "Não disponível" e mantém exportação JSON clássica via download. Para produção web no `autotech.app.br`, a API exige HTTPS.

---

### Como o ExtractorBatch processa os PDFs?

**R:** Aceita um arquivo ZIP com múltiplos PDFs ou um PDF individual via drag-and-drop. Para cada PDF, extrai texto via PDF.js e envia para a API Claude (Anthropic) pedindo extração estruturada dos campos de licença. O resultado é mapeado para o schema de licença e pode ser exportado como `.xlsx` ou importado diretamente criando licenças com status `pending`. A chave API é lida do IndexedDB via `db.getConfig('anthropicKey')` diretamente no componente.

---

### Por que usar SHA-256 e AES-256 no browser e não no servidor?

**R:** Não há servidor. O sistema é offline-first. O SHA-256 (via CryptoJS) gera o `validationHash` das licenças e o hash de integridade dos backups. O AES-256 encripta dados sensíveis antes de armazenar no IndexedDB. A chave é derivada de valores aleatórios gerados por `crypto.getRandomValues` e armazenada no `localStorage`.

---

### O que muda quando o sistema for para o autotech.app.br?

**R:** A principal mudança é o contexto de origem (origin). Em `https://autotech.app.br/sgw-dev/`:
1. File System Access API funciona (HTTPS = secure context ✅)
2. IndexedDB fica isolado por origin (dados de dev ≠ dados de prod ✅)
3. `anthropicKey` no IndexedDB fica exposta via DevTools (risco ⚠️ — resolver com proxy)
4. CDN scripts já são HTTPS, sem mixed-content ✅
5. Babel transpila na primeira carga (~1–2s) ✅ (aceitável para fase dev)

---

### Como melhorar a performance do Babel em runtime?

**R:** ✅ **RESOLVIDO em 2026-05-18:** JSX pré-compilado via `npx babel --presets=@babel/preset-react`. Babel Standalone runtime (2.8MB) eliminado completamente. Ganho estimado: 800ms–2.5s no primeiro load.

---

## 8. Análise das Skills Locais

### `frontend-design` ✅ EXCELENTE — Usar ativamente

**O que faz bem:**
- Framework de "Design Thinking" antes de codar (propósito → tom → diferencial)
- Guia anti-"AI slop": proíbe Inter/Roboto genéricos, gradientes roxos clichês
- Foco em produção real: animações CSS-only

**Limitação para este projeto:**
- Assume bundler (Vite/Next). Para single-file HTML, `import Motion from 'framer-motion'` não funciona. Usar CSS `@keyframes` + classes `.af .d1-.d8` nativas do SGW.

---

### `ui_ux_pro_max_pt_br_profissional` ✅ BOM — Útil como checklist

**Aplicar especialmente:** dark mode, estados de dados (loading/empty/offline), animações de entrada.

---

### `nano-banana-2` ⚠️ ÚTIL — Verificar path antes de usar

**Problema:** Script referencia `./.agents/skills/nano-banana-2/scripts/` — caminho incorreto. Caminho real: `.claude/skills/nano-banana-2/scripts/`.

**Aplicação para SGW Pro:** gerar textures de noise para background da landing page.

---

### `systematic-debugging` ✅ INSTALADO — Usar na próxima sessão de debug

Instalado em 2026-05-13. Usar para investigar BUG-003 (paginação IDB) e BUG-004 (rate limiting).

---

*Padrão de atualização: data + o que mudou + próximo passo. Nunca apagar entradas resolvidas — mover para seção "Resolvidos".*
