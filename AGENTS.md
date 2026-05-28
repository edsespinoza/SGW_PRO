# SGW Pro — Agent Notes

CRM de licenças SGW (Secure Gateway) para scanners automotivos Stellantis.
Monolito HTML single-file + React 18 UMD pre-compilado + API Express + PostgreSQL.

> ⚠️ **`CLAUDE.md` descreve arquitetura offline-first antiga** (Babel Standalone runtime, Tailwind CDN, IndexedDB-only, sem servidor). O código atual é Docker/API/PostgreSQL. `AGENTS.md` é a fonte correta.

## Run

```powershell
docker-compose up --build -d         # 4 serviços: postgres, api, sgw-pro, ai-mock
docker-compose up --build -d sgw-pro # rebuild só frontend (HTML editado)
docker-compose restart sgw-pro       # restart sem rebuild
python -m http.server 8080           # só frontend offline (sem API, sem DB)
```

- Docker 1ª execução com `ADMIN_PASSWORD` ≥8 chars no `.env`: cria `admin`/`<ADMIN_PASSWORD>`.
- Porta: **8081** (`${PORT:-8081}`). `run-docker.sh` desatualizado (diz 8080).
- Chrome/Edge only — Firefox/Safari sem File System Access API.
- Após editar `sgw_pro.html`, limpar cache do navegador. Se mudanças não aparecerem, bump cache key em `sw.js` (`sgw-pro-v8` → v9).

## Critical files

| File | Uso |
|------|-----|
| `sgw_pro.html` (~10490 lin) | **Source**. Único arquivo editável. |
| `sgw_pro_final_v11.html` | Built p/ Vercel (`/sgw-pro`). Rebuild com `node build.js` ou `python pdf_extracted_imgs/build_v11.py`. |
| `sgw_pro_files/tailwind.css` | CSS pré-compilado Tailwind. Rebuild: `npx tailwindcss -i src/tailwind-input.css -o sgw_pro_files/tailwind.css`. |
| `sgw_pro_files/` (13 libs) | JS libs locais (React, jsPDF, html2canvas, QRCode, JSZip, XLSX, CryptoJS, PDF.js) com fallback CDN + SRI. |
| `index.html` (654 lin) | Landing page servida em `/`. Tailwind via CDN (não pré-compilado). |
| `nginx.conf` | CSP + proxy `/api/v1/`→api:3001, `/api/ai-proxy`→api:3001/api/v1/ai/proxy. |
| `sw.js` | Service Worker cache key `sgw-pro-v8`. |
| `Dockerfile` | nginx:alpine → copia `index.html`, `sgw_pro.html`, `sw.js`, `sgw_pro_files/`, `nginx.conf`. |
| `api-server/src/index.js` | Entrypoint API Express (port 3001). |
| `api-server/src/routes/` | 7 route files: `licenses.js`, `auth.js`, `audit.js`, `config.js`, `backup.js`, `stats.js`, `ai.js`. |
| `api-server/src/crypto.js` | AES-256-GCM + PBKDF2 600k + key cache Map. |
| `api-server/src/middleware/auth.js` | JWT 24h, httpOnly cookie `sgw_token`, Bearer fallback. |
| `api/ai-proxy.ts` | Vercel serverless function proxy Anthropic. Build separado (Vercel detecta `api/`). |
| `sql/init.sql` | Schema: users, licenses, images, audit_logs, config + índices. |
| `mock-api/server.js` | AI mock (Claude fake) para ExtractorBatch — POST `/api/ai-proxy`. |
| `.env.example` | ENVs obrigatórias: `JWT_SECRET` (≥32 chars), `ENCRYPTION_KEY` (≥32 chars), `ADMIN_PASSWORD` (≥8 chars). |
| `Backup_BD/SGW Pro.html` | Versões anteriores de componentes. Se componente crashar com ReferenceError, procurar aqui. |
| `DESIGN.md` | Design tokens: paleta (sgw-*/cy-*), tipografia, glass-card, botões, badges, motion. |

## Architecture

- **React 18 UMD** — JSX pré-compilado via Babel CLI (`npx babel --presets=@babel/preset-react`). `{runtime: 'classic'}` → `React.createElement()`. **Sem Babel Standalone runtime** (BUG-001 resolvido).
- **Sem `import`/`export`** — tudo global. React UMD, hooks globais. `window.jspdf` (não `jsPDF`).
- **Tailwind**: CLI pré-compilado. `preflight:false`. Classes custom: `.fi`/`.fi.ok`/`.fi.err`, `.ni`/`.ni.on`, `.s-{status}`, `.glass`/`.glass-card`, `.af .d1`–`.d8` (fadeUp stagger).
- **Armazenamento**: PostgreSQL (primary) + IndexedDB `SGWPro8` v4 (fallback offline). `APIClient` tenta API primeiro.
- **Auth**: JWT 24h + httpOnly cookie `sgw_token`. Bearer header alternativo. Rate limit: 10 req/15min em login, 200/min geral.
- **Criptografia server-side**: AES-256-GCM + PBKDF2 600k. `S.enc`/`S.dec` no frontend são **no-ops**.
- **Roteamento**: estado `nav` string (`dashboard`, `form`, `clients`, `financial`, `reports`, `audit`, `settings`, `extractor`).
- **`App`**: `const App = () => { ... }` em `sgw_pro.html:10409`. Render: `sgw_pro.html:10487`.

## API routes (Express, port 3001)

| Route | Auth | Notes |
|-------|------|-------|
| `POST /api/v1/auth/login` | No | Valida username ≥3 chars, senha ≥8 chars. Retorna JWT + cookie `sgw_token`. |
| `POST /api/v1/auth/register` | No | Cria novo usuário. |
| `POST /api/v1/auth/logout` | No | Limpa cookie. |
| `GET /api/v1/auth/me` | Yes | `{user: {id, username}}`. |
| `GET /api/v1/licenses` | Yes | Paginado. Filtros: `page`, `limit`, `status`, `region`, `q`, `sort`, `order`. `maskSensitive` (NÃO decrypt). |
| `GET /api/v1/licenses/stats` | Yes | Contagens por status + overdue + expiring30d. |
| `GET /api/v1/licenses/:id` | Yes | Completo + `decryptFields` (diferente do list). |
| `POST /api/v1/licenses` | Yes | Auto-genera `id` (`lic_`+16hex) + `validation_hash` (SHA-256) se ausentes. |
| `PUT /api/v1/licenses/:id` | Yes | Auto-genera `validation_hash` se ausente. |
| `DELETE /api/v1/licenses/:id` | Yes | Cascade em imagens. |
| `GET /api/v1/licenses/:id/images` | Yes | Lista imagens por license_id. |
| `POST /api/v1/licenses/:id/images` | Yes | Substitui todas as screens (DELETE+INSERT em transação). |
| `GET /api/v1/audit-logs` | Yes | Paginado. Filtros: `entity_type`, `action`, `start_date`, `end_date`. |
| `POST /api/v1/audit-logs` | Yes | Cria log. |
| `GET /api/v1/config` | Yes | `{key: value}`. |
| `PUT /api/v1/config` | Yes | Upsert. |
| `POST /api/v1/backup/export` | Yes | Exporta tudo criptografado. |
| `POST /api/v1/backup/import` | Yes | Checksum validation. |
| `GET /api/v1/stats` | Yes | MRR, ARR, totais, expiring30d, recentLogs7d, totalImages. |
| `POST /api/v1/ai/proxy` | No | Proxy Anthropic (server-side key via `ANTHROPIC_API_KEY`). Acessado via nginx `/api/ai-proxy`. |
| `GET /api/v1/health` | No | `{"status":"ok"}`. |

## Editing rules

- **JSX requires pre-compile**: após editar JSX, recompilar com `npx babel --presets=@babel/preset-react <input> -o <output>`. JSX cru causa SyntaxError no navegador.
- **Componentes → globais**: monolito — todo componente precisa ser definido antes de usado. Se crashar com ReferenceError, buscar em `Backup_BD/SGW Pro.html`.
- **No `import`/`export`** — tudo global (React UMD). `window.jspdf` (não `jsPDF`).
- **No Framer Motion** — usar `@keyframes` + classes `.af .d1`–`.d8`.
- **QRCode**: `qrcodejs` (UMD). `qrcode` npm (CommonJS) não funciona.
- **Tailwind**: novas classes custom → adicionar em `tailwind.config.js` + rebuild `npx tailwindcss ...`.
- **CSP**: `unsafe-eval` + `unsafe-inline` — necessário para `React.createElement` e estilos inline.

## Gotchas

- **Dual files**: editar `sgw_pro.html`, NUNCA `sgw_pro_final_v11.html`.
- **SW cache**: hard refresh (`Ctrl+Shift+R`) ou DevTools > Application > Clear storage. Bump cache key em `sw.js` como último recurso.
- **Rebuild Docker**: `docker-compose up --build -d sgw-pro` (Dockerfile copia HTML no build).
- **`S.enc`/`S.dec` frontend**: criptografia primária é server-side (AES-256-GCM). `S.enc`/`S.dec` no frontend fazem AES-256 (CryptoJS) para o IndexedDB fallback. Logam warning se CryptoJS ausente. GET /licenses (list) não descriptografa (performance).
- **`validation_hash`** auto-gerado via SHA-256 em POST e PUT se ausente — coluna `NOT NULL`.
- **`tsconfig.json`** cobre `api/**/*.ts` (Vercel Functions). API real está em `api-server/` (JS puro, sem TS).
- **`api/` é gitignored**: contém `ai-proxy.ts` (Vercel Function). O server real fica em `api-server/`.
- **Financial**: 4 KPIs reais (MRR, ARR, etc.), `useMemo`, filters simples. Não é placeholder.
- **Não há testes, lint, typecheck ou CI**: sem `npm test`, ESLint, GitHub Actions.
- **`package.json` root**: só `@babel/cli`, `@babel/core`, `@babel/preset-react` — JSX pre-compile.
- **`api-server/package.json`**: tem scripts `start` (node) e `dev` (node --watch). Express + pg + bcrypt + jwt + helmet.
- **Request ID**: header `X-Request-Id` em toda resposta da API.
- **`.dockerignore`/`.vercelignore`**: excluem `Backup_BD/`, `pdf_extracted_imgs/`, `.img/`, `*.md`, `*.py`, etc.
- **IEM tracking**: calcular ao final de tarefas e salvar em `memory/iem_tracker.md`.
- **Master password**: `sgw_master_pw` no localStorage (cria ≥4 chars SHA-256 se não existir, unlock se existir). Sessão via `sessionStorage` `sgw_mp_unlocked`.
- **Backup .enc**: export criptografado com senha via CryptoJS AES-256. Import detecta `.enc` e pede senha.
- **Cache expiração**: `sgw8_eq` (equipamentos custom) expira 7d via timestamp `sgw8_eq_ts`.
- **sessionStorage**: `S._cryptKey()` usa `sessionStorage` — chave cripto não persiste entre sessões.
- **SS wrapper (linha 723)**: sessionStorage com cache Map. JWT (`sgw_token`) e salts cripto — token não persiste entre sessões. Migração automática de localStorage.
- **S.sha com PBKDF2**: 10k iterações SHA-256 + salt de 16 bytes via `crypto.getRandomValues()`.

## Deploy

- **Vercel**: `vercel.json` rewrites `/sgw-pro` → `sgw_pro_final_v11.html`. Gerar com `node build.js` ou `python pdf_extracted_imgs/build_v11.py`.
- **Docker**: nginx:alpine → proxy reverso pra API + AI mock. Porta 80 mapeada para `${PORT:-8081}`.
- **File System Access API**: requer HTTPS (secure context).
