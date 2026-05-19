# SGW Pro — Agent Notes

CRM de licenças SGW (Secure Gateway) para scanners automotivos Stellantis.
Monolito HTML single-file + React 18 UMD pre-compilado + API Express + PostgreSQL.

> ⚠️ **`CLAUDE.md` descreve arquitetura offline-first antiga** (Babel Standalone runtime, Tailwind CDN, sem servidor). O código atual é Docker/API/PostgreSQL. `AGENTS.md` é a fonte correta.

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
- Após editar `sgw_pro.html`, limpar cache do navegador. Se mudanças não aparecerem, bump cache key em `sw.js` (`sgw-pro-v7` → v8).

## Critical files

| File | Uso |
|------|-----|
| `sgw_pro.html` (~10222 lin) | **Source**. Único arquivo editável. |
| `sgw_pro_final_v11.html` | Built p/ Vercel (`/sgw-pro`). **Não existe localmente** — rebuild com `python pdf_extracted_imgs/build_v11.py`. |
| `sgw_pro_files/tailwind.css` | CSS pré-compilado Tailwind. Rebuild: `npx tailwindcss -i src/tailwind-input.css -o sgw_pro_files/tailwind.css`. |
| `sgw_pro_files/` (13 files) | JS libs locais com fallback CDN + SRI. |
| `index.html` (654 lin) | Landing page servida em `/`. |
| `nginx.conf` | CSP + proxy `/api/v1/`→api:3001, `/api/ai-proxy`→ai-mock:3000. |
| `sw.js` | Service Worker cache key `sgw-pro-v7`. |
| `Dockerfile` | nginx:alpine → copia `index.html`, `sgw_pro.html`, `sw.js`, `sgw_pro_files/`, `nginx.conf`. |
| `api-server/src/index.js` | Entrypoint API Express (port 3001). |
| `api-server/src/routes/` | 6 route files: `licenses.js`, `auth.js`, `audit.js`, `config.js`, `backup.js`, `stats.js`. |
| `api-server/src/crypto.js` | AES-256-GCM + PBKDF2 600k + key cache Map. |
| `api-server/src/middleware/auth.js` | JWT 24h, httpOnly cookie `sgw_token`, Bearer fallback. |
| `sql/init.sql` | Schema: users, licenses, images, audit_logs, config + índices. |
| `mock-api/server.js` | AI mock (Claude fake) para ExtractorBatch — POST `/api/ai-proxy`. |
| `.env.example` | ENVs obrigatórias: `JWT_SECRET` (≥32 chars), `ENCRYPTION_KEY` (≥32 chars), `ADMIN_PASSWORD` (≥8 chars). |
| `Backup_BD/SGW Pro.html` | Versões anteriores de componentes. Se `<Foo/>` crashar com ReferenceError, procurar aqui. |
| `DESIGN.md` | Design tokens: paleta (sgw-*/cy-*), tipografia, glass-card, botões, badges, motion. |

## Architecture

- **React 18 UMD** — JSX pré-compilado via Babel CLI (`npx babel --presets=@babel/preset-react`). `{runtime: 'classic'}` → `React.createElement()`. **Sem Babel Standalone runtime** (BUG-001 resolvido).
- **Sem `import`/`export`** — tudo global. React UMD, hooks globais. `window.jspdf` (não `jsPDF`).
- **Tailwind**: pré-compilado via CLI. `preflight:false`. Classes custom: `.fi`/`.fi.ok`/`.fi.err`, `.ni`/`.ni.on`, `.s-{status}`, `.glass`/`.glass-card`, `.af .d1`–`.d8` (fadeUp stagger).
- **Armazenamento**: PostgreSQL (primário) + IndexedDB `SGWPro8` v4 (fallback offline). `APIClient` tenta API primeiro.
- **Auth**: JWT 24h + httpOnly cookie `sgw_token`. Também aceita `Authorization: Bearer <token>`. Rate limit: 10 req/15min em login, 200/min geral.
- **Criptografia server-side**: AES-256-GCM + PBKDF2 600k. `S.enc`/`S.dec` no frontend são **no-ops**.
- **Roteamento**: estado `nav` string (`dashboard`, `form`, `clients`, `financial`, `reports`, `audit`, `settings`, `extractor`).
- **Entrypoint**: `sgw_pro.html:10219` — `ReactDOM.createRoot(document.getElementById('root')).render(<App/>)`.

## API routes (Express, port 3001)

| Route | Auth | Notes |
|-------|------|-------|
| `POST /api/v1/auth/login` | No | Valida username ≥3 chars, senha ≥8 chars. Retorna JWT + seta cookie `sgw_token`. |
| `POST /api/v1/auth/register` | No | Cria novo usuário. |
| `POST /api/v1/auth/logout` | No | Limpa cookie. |
| `GET /api/v1/auth/me` | Yes | Retorna `{user: {id, username}}`. |
| `GET /api/v1/licenses` | Yes | Lista paginada. Query: `page`, `limit`, `status`, `region`, `q`, `sort`, `order`. Aplica `maskSensitive` (NÃO `decryptFields`). |
| `GET /api/v1/licenses/stats` | Yes | Contagens por status + overdue + expiring30d. |
| `GET /api/v1/licenses/:id` | Yes | Retorna completo + `decryptFields`. |
| `POST /api/v1/licenses` | Yes | Auto-genera `id` (`lic_` + 16 hex) + `validation_hash` (SHA-256) se ausentes. |
| `PUT /api/v1/licenses/:id` | Yes | **UPDATE-only**. Auto-genera `validation_hash` se ausente. |
| `DELETE /api/v1/licenses/:id` | Yes | Cascade em imagens. |
| `GET /api/v1/licenses/:id/images` | Yes | Lista imagens por license_id. |
| `POST /api/v1/licenses/:id/images` | Yes | Substitui screens (DELETE + INSERT em transação). |
| `GET /api/v1/audit-logs` | Yes | Paginado. Filtros: `entity_type`, `action`, `start_date`, `end_date`. |
| `POST /api/v1/audit-logs` | Yes | Cria log. |
| `GET /api/v1/config` | Yes | Retorna `{key: value}`. |
| `PUT /api/v1/config` | Yes | Body `{key: value, ...}` — upsert. |
| `POST /api/v1/backup/export` | Yes | Exporta tudo (licenses+images+logs+config) criptografado. |
| `POST /api/v1/backup/import` | Yes | Importa com checksum validation. |
| `GET /api/v1/stats` | Yes | MRR, ARR, totais, expiring30d, recentLogs7d, totalImages. |
| `POST /api/v1/ai/proxy` | No | Proxy Claude API seguro — chave server-side via `ANTHROPIC_API_KEY`. Acessado via nginx `/api/ai-proxy`. |
| `GET /api/v1/health` | No | `{"status":"ok"}`. |

## Editing rules

- **JSX pré-compilado**: após editar JSX, recompilar com `npx babel --presets=@babel/preset-react <input> -o <output>`. Sem Babel runtime — JSX cru causa SyntaxError.
- **Componentes faltando → ReferenceError**: monolito — todo componente JSX usado precisa estar definido antes do uso. Procurar em `Backup_BD/SGW Pro.html`.
- **No `import`/`export`** — globais. React UMD + hooks globais.
- **No Framer Motion** — usar `@keyframes` + classes `.af .d1`–`.d8`.
- **QRCode**: lib `qrcodejs` (UMD) — `qrcode` npm (CommonJS) não funciona.
- **Novas classes custom Tailwind**: adicionar em `tailwind.config.js` + rebuild (`npx tailwindcss ...`).
- **CSP permite `unsafe-eval` + `unsafe-inline`** — necessário para `React.createElement` e estilos inline.

## Gotchas

- **Dual files**: editar `sgw_pro.html`, NUNCA `sgw_pro_final_v11.html`.
- **SW cache**: hard refresh (`Ctrl+Shift+R`) ou clear cache via DevTools > Application > Clear storage. Bump cache key em `sw.js` como último recurso.
- **Rebuild Docker**: `docker-compose up --build -d sgw-pro` (Dockerfile copia HTML no build).
- **`S.enc`/`S.dec` frontend são no-ops**: criptografia é server-side. API GET list não descriptografa (performance).
- **`validation_hash`** auto-gerado via SHA-256 em POST e PUT se ausente — coluna `NOT NULL`.
- **`tsconfig.json`** cobre só `api/**/*.ts` — não se aplica ao HTML.
- **Financial não é placeholder**: implementado com 4 KPIs (MRR, ARR, etc.), usa `useMemo` com filters simples.
- **Não há testes, lint, typecheck ou CI** — sem `npm test`, sem ESLint, sem GitHub Actions.
- **Package.json root** só tem `@babel/cli`, `@babel/core`, `@babel/preset-react` — JSX pre-compile.
- **Request ID**: header `X-Request-Id` em toda resposta da API.
- **`.dockerignore`/`.vercelignore`**: excluem `Backup_BD/`, `pdf_extracted_imgs/`, `.img/`, `*.md`, `*.py`, etc.
- **IEM tracking**: convenção do projeto. Calcular ao final de tarefas e salvar em `memory/iem_tracker.md`.

## Deploy

- **Vercel**: `vercel.json` rewrites `/sgw-pro` → `sgw_pro_final_v11.html`. Gerar com `python pdf_extracted_imgs/build_v11.py`.
- **Docker**: nginx:alpine → proxy reverso pra API + AI mock. Porta 80 mapeada para `${PORT:-8081}`.
- **File System Access API**: requer HTTPS (secure context).
