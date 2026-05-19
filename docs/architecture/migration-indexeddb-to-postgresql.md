# Migração IndexedDB → PostgreSQL + Backend Node.js

## Arquitetura Atual

```
Browser → IndexedDB (cliente)
       → nginx / Vercel (static serve)
       → /api/ai-proxy → Anthropic API (mock local)
```

- **Frontend:** Monolito HTML (~4500 linhas), React 18 UMD + Babel Standalone
- **Storage:** IndexedDB v4 — 4 object stores (licenses, images, auditLogs, config)
- **Criptografia:** CryptoJS AES-192 no cliente, chave no localStorage
- **Infra:** Docker (nginx + mock Node.js) | Vercel (static + serverless proxy)
- **Sem autenticação, sem backend, sem banco relacional**

## Arquitetura Target (Opção B)

```
Browser → nginx → Node.js API (Express) → PostgreSQL
       ↓ (opcional)
    React SPA (fetch() em vez de IDB calls)
```

- **Backend:** Node.js 20-alpine com Express + node-postgres (`pg`)
- **Banco:** PostgreSQL 16-alpine via Docker
- **Frontend:** HTML SPA adaptado — DB class substituída por requisições HTTP
- **Autenticação:** JWT + bcrypt (login senha mestre local)
- **Criptografia:** AES-256-GCM + PBKDF2 no servidor
- **API REST:** `/api/v1/` — licenses, images, audit-logs, config, auth

---

## Schema PostgreSQL

```sql
-- users (autenticação local)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- licenses
CREATE TABLE licenses (
  id TEXT PRIMARY KEY,
  license_key TEXT UNIQUE NOT NULL,
  validation_hash TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  cpf_cnpj TEXT,
  email TEXT,
  phone TEXT,
  equipment TEXT,
  equipment_serial TEXT,
  region TEXT DEFAULT 'PE',
  sgw_login TEXT,
  sgw_password TEXT,
  activation_date DATE,
  valid_until DATE,
  technician TEXT,
  status TEXT DEFAULT 'pending',
  device_fingerprint TEXT,
  brands JSONB DEFAULT '[]',
  observations TEXT,
  pdf_source TEXT,
  has_cert BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_licenses_status ON licenses(status);
CREATE INDEX idx_licenses_valid_until ON licenses(valid_until);
CREATE INDEX idx_licenses_region ON licenses(region);
CREATE INDEX idx_licenses_license_key ON licenses(license_key);

-- images
CREATE TABLE images (
  id TEXT PRIMARY KEY,
  license_id TEXT REFERENCES licenses(id) ON DELETE CASCADE,
  screen_id INTEGER NOT NULL,
  data TEXT NOT NULL,
  ts TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_images_license_id ON images(license_id);

-- audit_logs
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  action TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'admin',
  metadata JSONB DEFAULT '{}',
  ts TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_ts ON audit_logs(ts);

-- config
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## API REST

```
POST   /api/v1/auth/login          → { token, user }
POST   /api/v1/auth/register       → criar usuário inicial

GET    /api/v1/licenses            → paginated + filtros
POST   /api/v1/licenses            → create
GET    /api/v1/licenses/:id        → get (decrypted fields)
PUT    /api/v1/licenses/:id        → update
DELETE /api/v1/licenses/:id        → delete
POST   /api/v1/licenses/:id/images → salvar imagens (1-8)
GET    /api/v1/licenses/:id/images → listar imagens

GET    /api/v1/audit-logs          → paginated + filtros
POST   /api/v1/audit-logs          → registrar evento

GET    /api/v1/config              → ler configs
PUT    /api/v1/config              → atualizar config

POST   /api/v1/backup/export       → exportar dados criptografados
POST   /api/v1/backup/import       → importar backup

GET    /api/v1/stats               → dashboard counts
```

---

## Docker Services

| Service | Imagem | Porta | Função |
|---------|--------|-------|--------|
| `postgres` | postgres:16-alpine | 5432 | Banco de dados relacional |
| `api` | Node.js 20-alpine | 3001 | API REST Express |
| `sgw-pro` | nginx:alpine | 80 → 8081 | Frontend + proxy reverso |
| `ai-mock` | Node.js 20-alpine | 3000 | Mock Anthropic (dev) |

---

## Fases de Migração

### Fase 1 — Backend + Banco (atual)
- api-server/ Express + PostgreSQL + JWT + criptografia
- sql/init.sql com schema completo
- Docker: postgres + api services
- nginx.conf: proxy /api/v1/ + CSP

### Fase 2 — Frontend
- DB class → APIClient class com fetch()
- Tela de login (primeiro acesso cria admin)
- Formulários adaptados para async API
- Remover CryptoJS do cliente (opcional)

### Fase 3 — Migração de Dados
- Script one-shot: IndexedDB → API POST
- Validação de integridade com checksums
- Backup completo antes da migração

### Fase 4 — Segurança + Deploy
- CSP hardening
- Rotacionar chaves expostas
- Pré-compilar JSX? (remover unsafe-eval)
- Testes de penetração

---

## Vulnerabilidades Corrigidas na Migração

| ID | Vulnerabilidade | Correção |
|----|----------------|----------|
| C-01 | Chave Google exposta | Rotacionar + env var |
| C-02 | Chave cripto no localStorage | Criptografia server-side |
| C-03 | AES sem IV / KDF fraco | AES-256-GCM + PBKDF2 |
| C-04 | Senhas na UI em claro | API retorna mascarado |
| H-01 | Sem CSP no Docker | Adicionar no nginx.conf |
| H-03 | CPF no fragmento URL | Remover doc do CertLink |
| M-02 | Senha 4 chars | Validar 8+ complexidade |
| C-01 | innerHTML watchdog | Substituir por createElement |

---

## Riscos

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Perda de dados migração | Alto | TX transaction + backup prévio |
| App perde capacidade offline | **Alto** | PWA + Service Worker + IDB cache |
| Babel runtime + latência API | Médio | Avaliar pré-compilar JSX |
| Complexidade aumenta | Médio | Fases graduais |
