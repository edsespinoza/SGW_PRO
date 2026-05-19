# Fase 3 — Migração de Dados: IndexedDB → PostgreSQL

## Objetivo

Exportar todos os dados do IndexedDB (navegador) para a nova API PostgreSQL, com validação de integridade e rollback em caso de falha.

---

## 1. Script de Exportação (IndexedDB → JSON)

### Script HTML para exportar

Criar `tools/export-idb.html` que:

1. Abre o IndexedDB `SGWPro8`
2. Lê todas as 4 stores: `licenses`, `images`, `auditLogs`, `config`
3. Gera um JSON no formato compatível com a API de backup
4. Calcula checksum SHA-256
5. Oferece download do arquivo `.json`

```js
async function exportFromIDB() {
  const databases = await indexedDB.databases();
  const dbName = 'SGWPro8';
  const request = indexedDB.open(dbName, 4);

  request.onsuccess = async (event) => {
    const db = event.target.result;
    const stores = ['licenses', 'images', 'auditLogs', 'config'];
    const data = {};

    for (const storeName of stores) {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      data[storeName] = await new Promise((resolve) => {
        const items = [];
        const cursor = store.openCursor();
        cursor.onsuccess = (e) => {
          const cur = e.target.result;
          if (cur) { items.push(cur.value); cur.continue(); }
          else resolve(items);
        };
      });
    }

    const payload = {
      version: '1.0-export',
      source: 'IndexedDB',
      exportedAt: new Date().toISOString(),
      data,
    };

    const json = JSON.stringify(payload, null, 2);
    const checksum = sha256(json);

    download(json, `sgwpro_idb_export_${Date.now()}.json`);
    console.log('Checksum:', checksum);
  };
}
```

---

## 2. Script de Importação (JSON → API)

### Via CLI Node.js

Criar `tools/import-to-api.js`:

```js
const API_URL = process.env.API_URL || 'http://localhost:8081/api/v1';
const TOKEN = process.env.API_TOKEN; // JWT obtido via login

async function importData(jsonPath) {
  const fs = require('fs');
  const payload = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // Valida estrutura
  if (!payload.data || !payload.data.licenses) {
    throw new Error('Formato invalido');
  }

  // Envia para API de backup
  const res = await fetch(`${API_URL}/backup/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      format: 'json',
      data: payload,
    }),
  });

  const result = await res.json();
  console.log('Importado:', result.imported);
  console.log('Licencas:', result.licenses);
  console.log('Imagens:', result.images);
}
```

### Via Interface do Navegador

Adicionar botão "Migrar do IndexedDB" nas Configurações do SGW Pro que:

1. Abre o IndexedDB legado
2. Exporta para JSON
3. Envia para a API
4. Exibe resultado

```jsx
async function migrateFromIDB() {
  setMigrating(true);
  try {
    const exportData = await exportFromIDB();
    const result = await api.importBackup({
      format: 'json',
      data: exportData,
    });
    toast(`Migracao concluida: ${result.licenses} licencas, ${result.images} imagens`, 'success');
  } catch (err) {
    toast('Erro na migracao: ' + err.message, 'error');
  } finally {
    setMigrating(false);
  }
}
```

---

## 3. Validação de Integridade

### Antes da migração

1. Backup completo do IndexedDB para arquivo `.json`
2. Calcular checksum SHA-256
3. Salvar backup em local seguro (File System Access API)

### Durante a migração

1. Iniciar transação PostgreSQL
2. Inserir lotes de 50 registros
3. Se falhar → ROLLBACK completo
4. Logar cada etapa

### Após a migração

1. Comparar contagens: `SELECT COUNT(*)` vs `db.getCounts()`
2. Verificar amostras: comparar 5 registros aleatórios
3. Gerar relatório de divergências

```sql
-- Verificação de integridade
SELECT
  (SELECT COUNT(*) FROM licenses) AS licenses_pg,
  (SELECT COUNT(*) FROM images) AS images_pg;

-- VS valores do IndexedDB (inserir manualmente)
```

---

## 4. Checklist de Migração

### Preparação
- [ ] Fazer backup completo do IndexedDB (.json + .txt)
- [ ] Verificar se PostgreSQL está rodando
- [ ] Verificar se API está online (`/api/v1/health`)
- [ ] Criar usuário admin na API

### Execução
- [ ] Exportar IndexedDB via ferramenta
- [ ] Importar via API
- [ ] Verificar contagens
- [ ] Verificar 5 licenças aleatórias (dados decriptados OK)

### Rollback (se necessário)
- [ ] Parar containers Docker
- [ ] Remover volume PostgreSQL: `docker-compose down -v`
- [ ] Recriar do zero: `docker-compose up --build -d`
- [ ] Restaurar dados do backup JSON via API

---

## 5. Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `tools/export-idb.html` | Ferramenta HTML para exportar IndexedDB → JSON |
| `tools/import-to-api.js` | Script CLI para importar JSON → API via `/api/v1/backup/import` |
| `api-server/src/routes/backup.js` | Endpoints de export/import na API (criado na Fase 2) |

## 6. Frontend — Botão "Migrar do IndexedDB"

Adicionado no componente `Settings` (`sgw_pro.html:3708`):

- Seção "Migrar IndexedDB → PostgreSQL" em Configurações
- Mostra contagem de licenças locais
- Botão "🚀 Migrar Agora" que chama `doMigrateIDB()`
- Fluxo: lê IndexedDB → envia para API via `api.importBak()` → recarrega lista da API
- Função `doMigrateIDB` em System (linha ~4231)

## 7. Melhorias na API

| Melhoria | Detalhes |
|----------|----------|
| JSON recovery middleware | `express.text()` + fallback que repara JSON com chaves sem aspas |
| Raw body logging | Log do corpo bruto quando JSON parsing falha |

## 8. Ferramentas — Como Usar

### export-idb.html
```
1. Abrir tools/export-idb.html no Chrome/Edge
2. Clicar em "Ler IndexedDB e Exportar"
3. Fazer download do JSON gerado
```

### import-to-api.js (dentro do container)
```bash
docker exec -i sgw-api sh << 'SCRIPT'
cat > /tmp/export.json  # colar conteudo do JSON
SCRIPT
docker exec sgw-api sh -c "API_URL=http://localhost:3001 node /app/tools/import-to-api.js /tmp/export.json"
```

### Pelo frontend (recomendado)
```
1. Acessar http://localhost:8081
2. Fazer login
3. Ir em Configurações > "Migrar IndexedDB → PostgreSQL"
4. Clicar em "Migrar Agora"
```
