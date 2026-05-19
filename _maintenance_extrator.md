# Manutenção — ExtratorBatch / Certificate Processor

Baseado em `_certificate.md` (SGW Pro Certificate Processor Skill v1.0.0).

## Pipeline de 4 Fases

```
Fase 1 (Extração PDF)     →   Fase 2 (Parse Estruturado)   →   Fase 3 (Validação)   →   Fase 4 (Enriquecimento)
PDF.js lê páginas 1..8         Regex na Página 1 (CAPA)         validarCertificado()      enriquecerDados()
                               + fallback nome do arquivo       CPF, CNPJ, placa,         statusLicenca, diasRestantes,
                               + inferência de tipo doc         serial, login, senha,     hashVerificacao,
                                                                 expiração, região         plataformaHomologacao, alertas
```

## Onde está cada fase (sgw_pro.html)

| Fase | Função | Linha aprox. | Descrição |
|------|--------|-------------|-----------|
| 1 | `exParsePdf()` + `exFetch()` | ~1560 / ~1476 | PDF.js extrai texto das páginas 1..8; IA via `POST /api/ai-proxy` |
| 2 | `exParsePdf()` (regex) + `EX_PROMPT` (IA) | ~1560 / ~1271 | Regex na capa + fallback nome do arquivo + inferência tipo doc |
| 3 | `validarCertificado()` | ~1558 | Valida formato serial, login, senha, data, região, CPF/CNPJ |
| 4 | `enriquecerDados()` | ~1574 | Computa status, dias, hash, plataforma, alertas |

## Funções Pós-Processamento

### `validarCertificado(dados)` — Linha ~1558

Valida cada campo extraído segundo as regras do skill `_certificate.md`:

| Campo | Regra | Código | Retorna |
|-------|-------|--------|---------|
| customerName | Min 3 caracteres | `erros.push('NOME: ...')` | `{status:'VÁLIDO'\|'INVÁLIDO'\|'VÁLIDO_COM_ALERTAS', erros[], warnings[]}` |
| equipmentSerial | Regex `/^[A-Z0-9]{10,20}$/` | — | — |
| regiaoAtivacao | Enum: AMÉRICA DO NORTE, EUROPA, OUTRAS REGIÕES | — | — |
| sgwLogin | `^[a-zA-Z0-9_]{4,}$` | — | — |
| sgwPassword | Min 8 caracteres | — | — |
| validUntil | Deve ser futura; alerta <30d | — | — |

**Para adicionar nova validação:** adicionar ao corpo da função com `erros.push()` ou `warnings.push()`.

### `enriquecerDados(dados)` — Linha ~1574

Calcula campos derivados:

| Campo | Fonte | Lógica |
|-------|-------|--------|
| `diasRestantes` | validUntil - hoje | `Math.round((exp - hoje) / 86400000)` |
| `statusLicenca` | diasRestantes | `ATIVA` (>30d), `EXPIRANDO` (1-30d), `EXPIRADA` (<1d) |
| `hashVerificacao` | SHA256(serial + login + validUntil) | `CryptoJS.SHA256(...).slice(0,16)` |
| `plataformaHomologacao` | regiaoAtivacao | Mapa: "AMÉRICA DO NORTE" → "AutoAuth (Americana)", etc. |
| `alertas[]` | diasRestantes | `RENOVAÇÃO_URGENTE` (≤7d), `RENOVAÇÃO_PRÉVIA` (≤30d) |

**Para adicionar novo campo derivado:** adicionar ao objeto retornado por `enriquecerDados()`, depois incluir em `EX_COLS` se quiser exibição em tabela.

### `processarCertificado(dados)` — Linha ~1592

Pipeline completo: chama `validarCertificado()` → `enriquecerDados()` → funde `_validacao` + `_avgConf`.

Chamado por:
- `exParsePdf()` (modo Regex) — linha ~1803
- `exWorker()` após `exFetch()` (modo IA) — linha ~1431 (via variável `raw`)

## EX_COLS — Colunas da Planilha (Linha ~1261)

Para **adicionar/remover coluna** da tabela de resultados e exportação XLSX:

```js
{key:'statusLicenca', label:'Status Lic.'}
```

- `key` deve existir no objeto retornado por `processarCertificado()`
- `label` é o cabeçalho da coluna
- Colunas especiais com renderização customizada na table (linha ~2203):
  - `status` — badge verde/vermelho
  - `statusLicenca` — badge ATIVA/EXPIRANDO/EXPIRADA
  - `diasRestantes` — numérico colorido
  - `hashVerificacao` — mono-space truncado

## EX_PROMPT — Prompt para IA (Linha ~1271)

Template string enviado para Anthropic Claude via proxy.

**Ao alterar campos extraíveis:** sincronizar `EX_PROMPT` com `EX_COLS` e com `processarCertificado()`. A IA retorna nomes de campos em camelCase; o pipeline espera esses mesmos nomes.

## Integração com Importação

`doImportToSystem()` (linha ~1816) mapeia campos extraídos para o schema de licenças:

| Extraído → | Licença |
|------------|---------|
| `customerName` → `customerName` | uppercase |
| `customerDocument` → `cpfCnpj` | raw digits |
| `equipmentSerial` → `equipmentSerial` | — |
| `sgwLogin` / `sgwPassword` → direto | — |
| `validUntil` → `validUntil` | ou fallback +1 ano |
| `statusLicenca`, `diasRestantes`, `hashVerificacao`, `plataformaHomologacao` | **não importados** (são apenas informacionais) |

## QA Checklist

Após alterações no pipeline:

1. **Modo Regex** — processar PDF Aberama real → verificar todos os campos extraídos
2. **Modo IA** — processar mesmo PDF → comparar resultados com Regex
3. **Validação** — verificar badge VÁLIDO/INVÁLIDO no resultado
4. **Enriquecimento** — verificar statusLicenca, diasRestantes, hash, plataforma
5. **Export XLSX** — baixar planilha → conferir colunas novas
6. **Importação** — importar registro → verificar licença criada no sistema
7. **Tela preta** — verificar Babel syntax no console (erro de transpilação = blank screen)

## Erros Comuns

| Sintoma | Causa | Solução |
|---------|-------|---------|
| Tela preta ao carregar | Erro de sintaxe JSX (Babel falha) | Verificar ternárias, chaves, parênteses |
| Validação não aparece | `_validacao` não propagado | Confirmar que `processarCertificado()` é chamado |
| Coluna vazia no XLSX | `key` não existe no objeto extraído | Verificar `EX_COLS` vs retorno de `processarCertificado()` |
| StatusLicenca errado | `validUntil` nulo ou mal formatado | Verificar parse da data no regex/IA |
| IA retorna erro 503 | `ANTHROPIC_API_KEY` não configurada | Verificar `.env.local` ou Settings no app |

## Versionamento

| Versão | Data | Mudanças |
|--------|------|----------|
| 2.0 | 2026-05-15 | Pipeline 4 fases: validação + enriquecimento Aberama. Novas colunas: statusLicenca, diasRestantes, plataformaHomologacao, hashVerificacao. Alertas de renovação. Novos badges visuais. |
| 1.2.0 | — | Versão anterior: extração regex + IA com fallback, sem pós-processamento |

## Referências

- Skill base: `_certificate.md` — SGW Pro Certificate Processor v1.0.0
- Skill skill_extrator_pdf: `_skill_extrator_pdf.md`
- Bug tracker: `bug.md`
- Regras de negócio Aberama: validUntil obrigatório, serial exclusivo, licença não transferível
