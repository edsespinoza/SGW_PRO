# CLAUDE.md

> ⚠️ **Este arquivo descreve a arquitetura OFFLINE-FIRST antiga** (Babel Standalone runtime, Tailwind CDN, IndexedDB-only, sem servidor).
> **O código atual é SERVER-BASED** (Docker + Express API + PostgreSQL + nginx). Consulte `AGENTS.md` para arquitetura correta.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Como executar

Abrir diretamente no Chrome ou Edge (suporte obrigatório — Firefox/Safari não têm File System Access API):

```
# Opção A: file:// direto
Arrastar sgw_pro_final_v11.html no Chrome/Edge

# Opção B: servidor local
python3 -m http.server 8080
# http://localhost:8080/sgw_pro_final_v11.html
```

Não há build step, Node.js nem bundler. Dependências carregadas de CDN em runtime.

### Gerar nova versão com imagens reais (build script)

```powershell
python pdf_extracted_imgs\build_v11.py
```

O script lê base64 de `pdf_extracted_imgs\b64parts\*.txt`, substitui placeholders no HTML e gera `sgw_pro_final_v11.html`. Os caminhos estão **hardcoded** no script (`BASE`, `SRC`, `DST`) — ajustar ao executar em outra máquina.

---

## Arquitetura

**Single-file HTML offline-first.** Todo o sistema — React, CSS, lógica, dados e assets — vive em `sgw_pro_final_v11.html` (~3.472 linhas). Não há servidor, não há Node.js, não há bundler.

### Stack

| Camada | Tecnologia |
|---|---|
| UI | React 18 (UMD via CDN) + JSX transpilado por Babel Standalone em runtime |
| Estilo | Tailwind CSS (CDN) com config inline + CSS customizado no `<style>` |
| Dados | IndexedDB (`SGWPro8`, versão 3) com fallback em memória (`DB.isMem`) |
| Backup | File System Access API (Chrome/Edge 86+) via `BackupSvc` |
| Cripto | CryptoJS (SHA-256, AES-256) via CDN |
| PDF export | jsPDF + html2canvas |
| Extração batch | PDF.js + JSZip + XLSX + Claude API (Anthropic) |

O único ponto de entrada React é:
```js
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
```

### Árvore de componentes (por linha no arquivo)

```
App                       :3707
├── Landing               :2066 — página de apresentação pública (view='landing')
└── System                :3334 — CRM/ERP completo
    ├── Dashboard         :2342
    ├── Financial         :2681 — módulo financeiro (em desenvolvimento)
    ├── Reports           :2738
    ├── Audit             :2818 — log de auditLogs do IndexedDB
    ├── Settings          :2872 — backup, chave API, auto-backup
    ├── LicForm           :3082 — formulário criação/edição de licença
    ├── LicModal          :710  — lista de licenças (paginação 15/pág)
    ├── CertPDF           :~500 — certificado A4 em 3 abas (Licença/Evidências/Termo)
    ├── CertLink          :1063 — QR Code + link de validação
    └── ExtractorBatch    :1164 — importação em lote via ZIP + Claude AI
```

Roteamento via estado `nav` (string) dentro de `System` — sem React Router.

### Módulos globais (fora de componentes)

| Identificador | Linha | Responsabilidade |
|---|---|---|
| `APP` | 210 | Constantes globais (`VER:'11.0.0'`, `PFX:'ABR'`, `MAX_IMG:2097152`, `SCREENS:8`). `APP.KEY` gera/lê chave AES do localStorage. |
| `EQUIPS` | 216 | Array de scanners suportados (Autel, Launch, OBDSTAR, WiTech, ThinkCar, Vident) — 13 modelos. |
| `STELLANTIS` | 215 | Array de marcas compatíveis: FIAT, JEEP, CHRYSLER, DODGE, RAM, PEUGEOT, CITROËN, ALFA ROMEO, MASERATI, ABARTH. |
| `SCREENS_CFG` | 231 | 8 capturas de tela do fluxo de ativação SGW (Menu → VIN → Erro → Marca → Ativação → Credenciais → Carregamento → Sucesso). |
| `PRICES` | 241 | Planos: `{monthly:297, quarterly:747, annual:2388}` (BRL). |
| `uid()` | 246 | UUID v4 com polyfill para `file://` (fallback quando `crypto.randomUUID` não disponível). |
| `S` | 254 | Utilitários de segurança: SHA-256, AES-256 encrypt/decrypt, fingerprint do browser, validação/formatação de CPF/CNPJ/telefone. |
| `L` | 270 | Motor de licenças: geração de chave (`ABR-YYYY-XXXX-XXXX-XXXX`), hash de validação, cálculo de dias restantes, detecção de duplicatas. |
| `DB` (class) | 287 | IndexedDB wrapper versão 3. Stores: `licenses`, `images`, `auditLogs`, `config`. Índices em `licenses`: `status`, `region`, `validUntil`. Fallback automático para memória se IDB bloqueado. `setConfig`/`getConfig` suportam `FileSystemDirectoryHandle`. |
| `BackupSvc` | 329 | File System Access API: pick de pasta, escrita de `.txt` com header human-readable + bloco `DATA_BEGIN/DATA_END`, parse de importação, auto-backup ao salvar. |
| `Btn` | 458 | Átomo de botão: variantes `primary`, `secondary`, `danger`, `success`, `gold`, `ghost`, `outline`; tamanhos `xs`–`xl` e `icon`. |
| `Fld` | 471 | Átomo de campo com validação inline, reveal de senha, prop `errMsg` por campo. |
| `PIMG` | ~500 | Objeto com imagens do certificado como base64 inline (`shield`, `seal`, `logo`, `footer`, `certBan`, `stella`, `bgA`, `bgB`). Injetado pelo `build_v11.py`. |

### ExtractorBatch — dois modos de extração

| Modo | Entrada | Método |
|---|---|---|
| `zip` | Arquivo `.zip` contendo múltiplos PDFs | PDF.js extrai texto → Claude API extrai campos |
| `pdf` | Arquivo PDF individual via drag-and-drop | Mesmo pipeline |

Campos extraídos por AI (via `EX_PROMPT`): `customerName`, `documentType`, `customerDocument`, `customerPhone`, `customerEmail`, `region`, `equipment`, `equipmentSerial`, `sgwLogin`, `sgwPassword`, `validUntil`, `observations`.

Configurações: concorrência configurável (padrão 5), 3 retries com delays `[2000ms, 5000ms, 10000ms]`.

### Paleta de cores CSS

```css
/* Dark background scale */
sgw-950: #030712   /* body background */
sgw-900: #080f1e
sgw-850: #0d1526
sgw-800: #1a2540
sgw-750: #1e2d4d
sgw-700: #253460

/* Accent cyan */
cy-400: #22d3ee
cy-500: #06b6d4
cy-600: #0891b2
```

Classes utilitárias importantes:
- `.af` + `.d1`–`.d8` — animação `fadeUp` com delay incremental (80ms por step)
- `.glass`, `.glass-card` — glassmorphism (backdrop-filter + rgba border)
- `.fi` / `.fi.ok` / `.fi.err` — input padrão com estados de validação
- `.ni` / `.ni.on` — nav item inativo / ativo
- `.s-active`, `.s-pending`, `.s-expired`, `.s-revoked` — badges de status

---

## Notas para edição do arquivo principal

O arquivo `sgw_pro_final_v11.html` é monolítico (~3.472 linhas). Toda a aplicação está em um único `<script type="text/babel">`. Ao editar:

- Não usar `import`/`export` — não há bundler. Todas as dependências são globais via CDN (`React`, `ReactDOM`, `Babel`, `CryptoJS`, etc.)
- Animações: usar `@keyframes` no bloco `<style>` + classes `.af .d1-.d8`. Framer Motion não está disponível.
- Tailwind: configurado via `tailwind.config = {...}` inline — adicionar tokens customizados nesse objeto, não em arquivo separado.
- Imagens do certificado: armazenadas como base64 inline em `PIMG`. Para atualizar, usar `build_v11.py` como referência e substituir os valores em `pdf_extracted_imgs/b64parts/*.txt`.
- O `<title>` e o comentário do `<head>` ainda dizem "v10.0" — inconsistência cosmética, não funcional.

---

## Bugs conhecidos relevantes para desenvolvimento

| ID | Descrição | Impacto | Status |
|----|-----------|---------|--------|
| BUG-001 | Babel transpila JSX em runtime — 800ms–2.5s no primeiro load | Performance | Aberto |
| BUG-002 | `anthropicKey` armazenada no IndexedDB — exposta em DevTools em contexto web público | Segurança em produção | Aberto |
| BUG-003 | `DB.all('licenses')` carrega todos os registros sem paginação | Memória com volume alto | Aberto |
| BUG-004 | `ExtractorBatch` sem rate limiting/retry completo — erros 429 com 200 PDFs | Confiabilidade | Aberto |
| BUG-005 | Apenas React, Babel e CryptoJS têm fallback de CDN — QRCode, jsPDF, JSZip, PDF.js, XLSX falham silenciosamente | Robustez offline | Aberto |
| BUG-008 | Path errado no script `nano-banana-2` — referencia `./.agents/skills/` em vez de `.claude/skills/` | Skill não executa | Aberto |
| SEC-004 | JWT armazenado em localStorage (acessível via DevTools) | Segurança | Resolvido — migrado para sessionStorage |
| SEC-005 | SHA-256 sem salt para senha mestra (rainbow table) | Segurança | Resolvido — PBKDF2 com 10k iterações + salt |
| PERF-001 | `allLicenses` com `limit=1000` fixo (pseudopaginaçao) | Performance | Resolvido — paginação real com page/limit |

Bugs resolvidos na v11: BUG-006 (cards no mobile), BUG-007 (índices IDB em status/region/validUntil).

---

## Contexto de deploy

O sistema roda hoje em `file://`. O alvo futuro é `https://autotech.app.br/sgw-dev/`.

Implicações ao trabalhar em features de deploy:
- `File System Access API` exige HTTPS (secure context) + `Feature-Policy: file-system-access` no servidor
- `IndexedDB` é isolado por origin — dados de `sgw-dev/` são separados de `sgw-prod/` (desejado)
- `anthropicKey` no IDB é risco crítico em web público — solução planejada: proxy Cloudflare Worker
- CSP precisará permitir CDNs: `cdn.tailwindcss.com`, `cdn.jsdelivr.net`, `cdnjs.cloudflare.com`, `fonts.googleapis.com`

Roadmap completo e decisões de arquitetura confirmadas estão em `bug.md`.

---

## MCP skill-seekers

O servidor MCP `skill-seekers` roda em modo **stdio** e precisa ser ativado antes de iniciar uma sessão de trabalho no projeto. Ele disponibiliza 40 ferramentas (scrape_codebase, scrape_docs, etc.) após a conexão.

**Configuração já existente em** `C:\Users\Espinoza\.claude\settings.json`.

**Para ativar ao iniciar uma sessão**, execute no terminal e depois **reinicie o Claude Code** (o modo stdio exige restart para conectar):

```powershell
& "C:\Users\Espinoza\Documents\Obsidian Vault\Skill_Seekers-development\.venv\Scripts\python.exe" `
  -m skill_seekers.mcp.server_fastmcp --version 2>&1
```

---

## Outros arquivos no projeto

| Arquivo | Propósito |
|---|---|
| `sgw-zip-extractor-unified.html` | Versão standalone do ExtractorBatch (sem o CRM completo) |
| `sgw-zip-extractor.html` / `sgw-zip-extractor-v2.html` | Iterações anteriores do extrator standalone |
| `pdf_extracted_imgs/build_v11.py` | Script de build que injeta imagens base64 no HTML |
| `Backup_BD/` | Pasta com backup real do banco + cópia do HTML empacotada |
| `bug.md` | FAQ técnico, decisões de arquitetura confirmadas, roadmap de deploy e histórico de evolução do projeto |
| `.claude/skills/` | Skills locais: `frontend-design`, `nano-banana-2`, `ai-video-generation`, `ui_ux_pro_max_pt_br_profissional` |
