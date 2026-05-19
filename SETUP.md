# SGW Pro v11 — Setup para Desenvolvimento

## Quick Start

### 1. Servidor Local (sem Docker)

```powershell
cd "C:\Users\Espinoza\Documents\Obsidian Vault\SGW_PRO"
python3 -m http.server 8080
```

Abrir no browser: http://localhost:8080/sgw_pro.html

> ⚠️ Requer **Chrome ou Edge** (Firefox não suporta File System Access API)

---

### 2. Com Docker (quando disponível)

```powershell
cd "C:\Users\Espinoza\Documents\Obsidian Vault\SGW_PRO"
docker-compose up --build -d
```

Serviços:
- Frontend: http://localhost:8080
- API Mock: http://localhost:3000

---

## Estrutura de Arquivos

```
SGW_PRO/
├── sgw_pro_final_v11.html      # App principal (~3.763 linhas)
├── bug.md                       # Registro de bugs e correções
├── SETUP.md                     # Este arquivo
├── Dockerfile                   # Container Nginx
├── docker-compose.yml           # Orquestração
├── nginx.conf                   # Configuração Nginx
├── mock-api/
│   ├── server.js               # Mock da API Anthropic
│   └── Dockerfile              # Container Node.js
├── .claude/
│   └── skills/                 # Skills Claude Code
├── memory/
│   └── iem_tracker.md          # Registro de avaliações
└── pdf_extracted_imgs/         # Assets base64 do certificado
```

---

## Correções Aplicadas na v11.0.0

| ID | Descrição | Local |
|----|-----------|-------|
| QA-OFF1 | Loop retry off-by-one (`<` vs `<=`, `>=` vs `>`) | linha 1337, 1347 |
| BUG-004 | Rate limiting: Retry-After + jitter 0-2s | linhas 1348, 1387 |
| BUG-008 | Path nano-banana-2: `./.agents` → `.claude` | SKILL.md |
| A11Y-01 | Focus ring nos inputs sem accessibility | linhas 1671, 1822 |

---

## Bugs Conhecidos (Abertos)

### 🔴 Crítico

| ID | Descrição | Solução Planejada |
|----|-----------|-------------------|
| BUG-001 | Babel transpila runtime (~1-2.5s) | Pré-compilar JSX |
| BUG-002 | `anthropicKey` exposta no IndexedDB | Cloudflare Worker proxy |
| BUG-003 | `DB.all()` sem paginação | Novo método `DB.page()` |

### 🟡 Moderado

| ID | Descrição |
|----|-----------|
| BUG-003 | Paginação em `DB.all()` |

---

## Testes Recomendados

1. **Criação de licença** — Formulário completo
2. **ExtractorBatch** — Upload de PDF/ZIP
3. **Backup em pasta** — File System Access API
4. **Dashboard** — Estatísticas e gráficos

---

## Links Úteis

- **Bug tracker:** `bug.md`
- **Avaliações IEM:** `memory/iem_tracker.md`
- **Skills disponíveis:** `.claude/skills/`

---

*Atualizado: 2026-05-14*