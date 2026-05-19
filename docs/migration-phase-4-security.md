# Fase 4 — Segurança e Deploy

## Objetivo

Corrigir todas as vulnerabilidades identificadas na auditoria, hardening de CSP, rotacionar chaves expostas e preparar deploy seguro.

---

## 1. Vulnerabilidades Críticas

### C-01: Chave Google exposta

**Arquivo:** `Chave_api.txt`

**Ação:**
1. Rotacionar a chave `AIzaSyDsGwgC_uguRPisNb2OeHaypwHI7LgdMqk` no Google Cloud Console
2. Remover arquivo `Chave_api.txt` do projeto
3. Mover para variável de ambiente no Vercel

### C-02: Chave de criptografia no localStorage (RESOLVIDO na Fase 1)

Com a migração para criptografia server-side, `APP.KEY` e localStorage `_sgw8k` deixam de existir no frontend.

**Verificar:**
- [ ] `APP.KEY` getter removido do código
- [ ] `localStorage.getItem('_sgw8k')` não é mais chamado
- [ ] `S.enc()` / `S.dec()` removidos ou desabilitados

### C-03: AES sem IV (RESOLVIDO na Fase 1)

`api-server/src/crypto.js` implementa AES-256-GCM com:
- PBKDF2 (600.000 iterações)
- Salt aleatório de 32 bytes por campo
- IV aleatório de 16 bytes
- Auth tag de 16 bytes

### C-04: Senhas SGW na UI

**Arquivo:** `sgw_pro.html` (formulário de licença)

**Ação:**
- API retorna `sgw_password` mascarado: `s*******d`
- No formulário, campo password sem toggle reveal
- Botão "Mostrar" exige confirmação extra

```jsx
{/* Campo de senha sem toggle reveal */}
<input type="password" value={data.sgwPassword || ''}
  onChange={e => setField('sgwPassword', e.target.value)}
  className="fi" placeholder="Senha SGW" />
```

---

## 2. CSP Hardening

### Docker (RESOLVIDO na Fase 1)

O `nginx.conf` atualizado já inclui CSP completo.

**Próximo passo:** Quando o Babel Standalone for removido (pré-compilação JSX), remover `unsafe-eval` e `unsafe-inline` do `script-src`.

### Vercel

Atualizar `vercel.json` para corresponder ao CSP do nginx:

```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://*.up.railway.app https://api.render.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
}
```

> Nota: `connect-src` deve incluir o domínio do backend PostgreSQL (Railway, Render, Neon, etc.)

---

## 3. Vulnerabilidades Altas

### H-01: Sem CSP no Docker (RESOLVIDO na Fase 1)

CSP adicionado no `nginx.conf`.

### H-02: unsafe-eval/inline

**Manter por enquanto** — o Babel Standalone exige ambos.

**Roadmap:** Pré-compilar JSX como etapa futura:

```bash
# Estratégia de pré-compilação
npm install @babel/cli @babel/preset-react
babel sgw_pro.html --out-file sgw_pro_compiled.html
```

Isso eliminaria a dependência de Babel runtime + `unsafe-eval` + `unsafe-inline`.

### H-03: CPF/CNPJ no fragmento URL

**Arquivo:** `sgw_pro.html` — componente `CertLink`

**Ação:** Remover `doc` (CPF/CNPJ) do fragmento Base64. Usar apenas hash do serial.

```js
// ANTES (vazado):
const pay = { name: lic.customerName, doc: lic.cpfCnpj, serial: lic.licenseKey };

// DEPOIS (seguro):
const pay = { v: lic.validationHash };
```

### H-04: innerHTML watchdog (RESOLVIDO na Fase 1)

Substituído por SVGs inline. Verificar se ainda há `innerHTML` no resto do código:

```bash
grep -n "innerHTML" sgw_pro.html
```

Se houver outros usos, substituir por:

```js
// Em vez de:
el.innerHTML = '<div>...</div>';

// Usar:
const div = document.createElement('div');
div.textContent = '...';
el.appendChild(div);
```

### H-05: XSS no localStorage equipamentos

**Arquivo:** `sgw_pro.html` — equipamentos customizados

**Ação:**
```js
// Validar e sanitizar antes de usar
const raw = localStorage.getItem('sgw8_eq');
const equips = raw ? JSON.parse(raw) : [];
if (!Array.isArray(equips)) return [];
// Sanitizar cada item
equips.forEach(e => {
  if (typeof e !== 'object') return;
  // garantir que é seguro
});
```

---

## 4. Vulnerabilidades Médias

### M-01: Fallback Base64 reversível

**Ação:** Remover fallback de `btoa()` em `S.enc()`. Se CryptoJS não estiver disponível, lançar erro explicitamente em vez de codificar como Base64.

### M-02: Senha 4 caracteres (RESOLVIDO na Fase 1)

API valida mínimo 8 caracteres com complexidade no backend.

### M-03: Prototype pollution

**Ação:** Substituir `Object.assign({}, dados)` por `JSON.parse(JSON.stringify(dados))` ou spread operator em todo o código.

### M-05: Sem SRI

**Ação:** Adicionar `integrity` nos scripts CDN no `sgw_pro.html`:

```html
<script src="https://cdn.tailwindcss.com"
  integrity="sha384-..."
  crossorigin="anonymous"></script>
```

Para gerar os hashes:
```bash
curl -s https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js | openssl dgst -sha384 -binary | openssl base64 -A
```

### M-06: Erros vazados em toast

**Ação:** Substituir `toast('Erro: '+err.message, 'error')` por mensagens genéricas e logar detalhes no console:

```js
toast('Erro ao processar operacao', 'error');
console.error('[SGW] Detalhes:', err);
```

---

## 5. Remediação de Chaves Expostas

### Checklist de Rotação

- [ ] **Google API Key:** Rotacionar no GCP Console → APIs e Serviços → Credenciais
- [ ] **ANTHROPIC_API_KEY:** Verificar se a chave atual é válida, rotacionar se necessário
- [ ] **JWT_SECRET:** Gerar novo secret (64+ caracteres aleatórios)
- [ ] **ENCRYPTION_KEY:** Gerar nova chave mestra (64+ caracteres hex)
- [ ] **DB_PASSWORD:** Gerar nova senha PostgreSQL

### Comandos para gerar secrets

```bash
# JWT Secret
openssl rand -base64 64

# Encryption Key (hex)
openssl rand -hex 64

# DB Password
openssl rand -base64 32
```

---

## 6. Deploy Seguro

### Docker

```bash
# Com secrets
export DB_PASSWORD=$(openssl rand -base64 32)
export JWT_SECRET=$(openssl rand -base64 64)
export ENCRYPTION_KEY=$(openssl rand -hex 64)

docker-compose up --build -d
```

### Vercel

No Vercel Dashboard → Project Settings → Environment Variables:
- `ANTHROPIC_API_KEY` — chave real da Anthropic
- `JWT_SECRET` — secret do JWT
- `ENCRYPTION_KEY` — chave mestra de criptografia

Para API PostgreSQL via Vercel, usar Neon:
```bash
# Neon connection string
DATABASE_URL=postgres://user:pass@ep-xxx.us-east-2.aws.neon.tech/sgwpro
```

---

## 7. Testes de Segurança Pós-Migração

- [ ] Testar login com credenciais inválidas
- [ ] Testar acesso a endpoints sem token
- [ ] Verificar CSP headers no navegador (DevTools → Network)
- [ ] Verificar que dados sensíveis não aparecem no fragmento URL
- [ ] Verificar que senha SGW aparece mascarada na UI
- [ ] Verificar que `localStorage._sgw8k` não existe mais
- [ ] Testar export/import criptografado
- [ ] Verificar logs de auditoria registram todas as operações

---

## Resumo de Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `sgw_pro.html` | Remover campos sensíveis do CertLink |
| `sgw_pro.html` | Sanitizar equipamentos localStorage |
| `sgw_pro.html` | Mensagens de erro genéricas |
| `sgw_pro.html` | Adicionar SRI nos CDNs |
| `vercel.json` | Atualizar CSP + `connect-src` |
| `nginx.conf` | (já atualizado na Fase 1 — verificar) |
| Remover `Chave_api.txt` | Arquivo com Google API key |
