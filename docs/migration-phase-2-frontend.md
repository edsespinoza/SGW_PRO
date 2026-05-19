# Fase 2 — Migração Frontend: IndexedDB → API REST

## Objetivo

Substituir a classe `DB` (IndexedDB) por uma classe `APIClient` que chama a API REST, adicionar tela de login e adaptar todos os formulários.

---

## 1. APIClient Class

Criar no `sgw_pro.html` (antes do React), substituindo o `DB` class atual.

### Estrutura

```js
class APIClient {
  constructor() {
    this.baseURL = '/api/v1';
    this.token = localStorage.getItem('sgw_token');
    this.isAuthenticated = !!this.token;
  }

  async request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(`${this.baseURL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      this.token = null;
      this.isAuthenticated = false;
      localStorage.removeItem('sgw_token');
      renderLogin(); // redireciona para login
      throw new Error('Sessão expirada');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ${res.status}`);
    }

    return res.json();
  }

  // --- Auth ---
  async login(username, password) {
    const { token, user } = await this.request('POST', '/auth/login', { username, password });
    this.token = token;
    this.isAuthenticated = true;
    localStorage.setItem('sgw_token', token);
    return user;
  }

  // --- Licenses (compatível com DB.all, DB.get, DB.save, DB.del) ---
  async allLicenses() {
    const { data } = await this.request('GET', '/licenses?limit=1000');
    return data;
  }

  async getLicense(id) {
    return this.request('GET', `/licenses/${id}`);
  }

  async saveLicense(data) {
    if (data.id) {
      return this.request('PUT', `/licenses/${data.id}`, data);
    }
    return this.request('POST', '/licenses', data);
  }

  async deleteLicense(id) {
    return this.request('DELETE', `/licenses/${id}`);
  }

  // --- Images ---
  async getImages(licenseId) {
    return this.request('GET', `/licenses/${licenseId}/images`);
  }

  async saveImages(licenseId, screens) {
    return this.request('POST', `/licenses/${licenseId}/images`, { screens });
  }

  // --- Audit ---
  async log(entityType, entityId, action, metadata) {
    return this.request('POST', '/audit-logs', { entity_type, entity_id, action, metadata });
  }

  async getAuditLogs(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request('GET', `/audit-logs?${qs}`);
  }

  // --- Config ---
  async getConfig() {
    return this.request('GET', '/config');
  }

  async setConfig(key, value) {
    return this.request('PUT', '/config', { [key]: value });
  }

  // --- Stats ---
  async getStats() {
    return this.request('GET', '/stats');
  }

  // --- Backup ---
  async exportBackup(encrypted = true) {
    return this.request('POST', '/backup/export', { encrypted });
  }

  async importBackup(data) {
    return this.request('POST', '/backup/import', data);
  }
}
```

---

## 2. Tela de Login

Adicionar um componente `Login` no React que:

1. Renderiza formulário com username + password
2. No submit, chama `api.login()`
3. Em caso de sucesso, armazena token e renderiza `App`
4. Se não houver usuários, exibe link "Criar primeiro acesso"

```jsx
function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onLogin(username, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sgw-900 flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-sm p-8">
        <h1 className="font-heading text-2xl font-black text-white mb-6 text-center">
          SGW Pro
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Fld label="Usuário">
            <input value={username} onChange={e => setUsername(e.target.value)}
              className="fi" placeholder="admin" autoFocus />
          </Fld>
          <Fld label="Senha">
            <input type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              className="fi" placeholder="••••••••" />
          </Fld>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Btn ch={loading ? 'Entrando...' : 'Entrar'}
            variant="gold" size="md" cls="w-full" loading={loading} />
        </form>
      </div>
    </div>
  );
}
```

### Fluxo de Autenticação

```
App render:
  └─ api.isAuthenticated?
       ├─ false → <Login onLogin={handleLogin} />
       └─ true  → <System /> (app principal)

handleLogin(username, password):
  1. api.login(username, password) → token
  2. setState { isAuthenticated: true }
  3. setNav('dashboard')
```

---

## 3. Substituições no Código Atual

### DB class → APIClient

```js
// ANTES:
const db = new DB();
await db.ready;
const lics = await db.all('licenses');

// DEPOIS:
const api = new APIClient();
const lics = await api.allLicenses();
```

### Mapeamento de métodos

| DB class | APIClient | Notas |
|----------|-----------|-------|
| `db.all('licenses')` | `api.allLicenses()` | |
| `db.get('licenses', id)` | `api.getLicense(id)` | |
| `db.save('licenses', data)` | `api.saveLicense(data)` | Auto-detecta create vs update |
| `db.del('licenses', id)` | `api.deleteLicense(id)` | |
| `db.getCounts('licenses')` | `api.getStats()` | |
| `db.log(type, id, action, actor)` | `api.log(type, id, action)` | Actor vem do JWT |
| `db.setConfig(key, value)` | `api.setConfig(key, value)` | |
| `db.getConfig(key)` | `api.getConfig()` + lookup | |
| `db.page('licenses', opts)` | `api.request('GET', '/licenses?'+qs)` | |

### Imagens

| DB class | APIClient |
|----------|-----------|
| `db.get('images', id)` | `api.getImages(licenseId)` + filtrar |
| `db.save('images', data)` | `api.saveImages(licenseId, screens)` |

### Criptografia (CryptoJS)

**Remover** (ou tornar opcional):
- `S.enc()` / `S.dec()` → criptografia agora é server-side
- `APP.KEY` → chave não fica mais no cliente
- localStorage `_sgw8k` → não é mais necessário

**Manter**:
- `S.sha()` → hashing ainda útil no cliente para validações
- `S.fp()` → fingerprint do dispositivo
- `S.validCPF()`, `S.validCNPJ()` → validação no formulário

---

## 4. Boot Flow Atualizado

```
1. Verificar token no localStorage
2. Se token existe e não expirou:
   a. api.getStats() → dashboard stats
   b. api.allLicenses() → listar licenças (descriptografadas pela API)
   c. api.getConfig() → settings
3. Se token não existe ou expirou:
   a. Renderizar tela de login
```

---

## 5. Fallback Offline (Recomendado)

Para não perder a capacidade offline:

1. Manter IndexedDB como cache local
2. `APIClient` tenta API → se falhar, lê do IDB
3. Na criação/edição, tenta API → se falhar, salva no IDB para sync posterior

```js
async getLicense(id) {
  try {
    return await this.request('GET', `/licenses/${id}`);
  } catch {
    // fallback para IndexedDB
    return db.get('licenses', id);
  }
}
```

---

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `sgw_pro.html` | Adicionar `APIClient` class |
| `sgw_pro.html` | Substituir `new DB()` por `new APIClient()` |
| `sgw_pro.html` | Adicionar componente `Login` |
| `sgw_pro.html` | Modificar boot() para verificar token |
| `sgw_pro.html` | Remover `APP.KEY` / `S.enc()` / `S.dec()` |
| `sgw_pro.html` | Adicionar `connect-src` no CSP para API |
