# SGW Pro Certificate Processor — Especificação de Skill

> **Versão:** 2.0  
> **Data:** 16/05/2026  
> **Status:** Aprovado para implementação  
> **Owner:** AI Engineering Team

---

## 1. Visão Geral

Skill para extração, parsing e estruturação de certificados PDF da **Aberama Brasil** — ativação de licenças Security Gateway (SGW) para scanners AUTEL em veículos Stellantis.

**Mudança principal (v2.0):** O formato de saída padrão migrou de `.csv` para `.txt` plano, otimizado para leitura humana e processamento por LLMs.

---

## 2. Entrada

### 2.1 Fonte de Dados

| Tipo | Descrição |
|:---|:---|
| `PDF` | Certificado de ativação Aberama Brasil (multi-página, contém imagens + texto) |
| `filename` | Nome do arquivo no padrão: `{CLIENTE}_{SERIAL}_ABERAMA ATIVAÇÃO SECURITY GATEWAY.pdf` |

### 2.2 Campos Extraídos do PDF

```yaml
pdf_fields:
  - cliente:        "Nome completo do titular da licença"
  - serial_number:  "Código alfanumérico do scanner (ex: VX2GS9C01263)"
  - scanner_brand:  "AUTEL (fixo para este contrato)"
  - region:         "AMÉRICA DO NORTE | EUROPA | OUTRAS REGIÕES"
  - login:          "Credencial SGW (ex: sgwaberama)"
  - password:       "Senha SGW (ex: @Autel123)"
  - expiration:     "Data de vencimento no formato DD/MM/YYYY"
  - activation_date: "Data de emissão do certificado (inferida ou explícita)"
```

---

## 3. Processamento

### 3.1 Pipeline de Parsing

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│   PDF Raw   │───▶│ OCR + Regex  │───▶│  Validation │───▶│ Enrichment  │
│  (bytes)    │    │  Extraction  │    │   Engine    │    │   Engine    │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
                                              │                   │
                                              ▼                   ▼
                                        ┌─────────────┐    ┌─────────────┐
                                        │  Ruleset    │    │  Computed   │
                                        │  SGW Pro    │    │   Fields    │
                                        └─────────────┘    └─────────────┘
```

### 3.2 Regras de Validação (Ruleset)

| ID | Regra | Severidade | Ação em Falha |
|:---|:---|:---|:---|
| `VAL-01` | Serial deve ter 12+ caracteres alfanuméricos | `ERROR` | Marcar como `INCOMPLETA` |
| `VAL-02` | Data de expiração deve ser válida e futura | `WARNING` | Marcar como `INCOMPLETA` |
| `VAL-03` | Região deve estar na whitelist | `ERROR` | Rejeitar e logar |
| `VAL-04` | Login/senha não podem ser vazios | `ERROR` | Marcar como `INCOMPLETA` |
| `VAL-05` | Nome do cliente deve corresponder ao filename | `WARNING` | Flag para revisão manual |

### 3.3 Enriquecimento (Computed Fields)

| Campo Computado | Fórmula |
|:---|:---|
| `dias_restantes` | `(expiration_date - today).days` |
| `status` | `ATIVA` if dias > 0 else `EXPIRADA` if dias < 0 else `INCOMPLETA` if expiration is null |
| `plataforma` | `"AutoAuth"` (inferido da região América do Norte) |
| `hash_validacao` | `SHA256(cliente + serial + expiration)` |
| `batch_id` | `UUID v4` (agrupa múltiplos certificados de uma mesma sessão) |

---

## 4. Saída — Formato TXT (Novo Padrão)

### 4.1 Estrutura do Arquivo

```text
================================================================================
  ABERAMA BRASIL - SECURITY GATEWAY CERTIFICATE ANALYSIS
================================================================================
  Data da analise: {DD/MM/YYYY}
  Total de certificados: {N}
  Batch ID: {UUID}
================================================================================

CERTIFICADO #{N}
----------------------------------------
  Cliente         : {nome_cliente}
  Serial Number   : {serial_scanner}
  Scanner         : {marca_scanner}
  Regiao          : {regiao}
  Login           : {login_sgw}
  Expiracao       : {data_expiracao | N/A}
  Dias Restantes  : {N dias | N/A}
  Status          : {ATIVA | EXPIRADA | INCOMPLETA | REVOGADA}
  Hash            : {sha256_hash}

[... repete para cada certificado ...]

================================================================================
  RESUMO
================================================================================
  Ativos      : {N}
  Expirados   : {N}
  Incompletos : {N}
  Revogados   : {N}
================================================================================
  Gerado por: SGW Pro Certificate Processor v2.0
  Skill ID: sgw-pro-cert-processor
================================================================================
```

### 4.2 Exemplo Real

```text
================================================================================
  ABERAMA BRASIL - SECURITY GATEWAY CERTIFICATE ANALYSIS
================================================================================
  Data da analise: 16/05/2026
  Total de certificados: 4
  Batch ID: 550e8400-e29b-41d4-a716-446655440000
================================================================================

CERTIFICADO #1
----------------------------------------
  Cliente         : ARLET CARVALHO COMERCIO LTDA
  Serial Number   : VX2GS9C01263
  Scanner         : AUTEL
  Regiao          : AMÉRICA DO NORTE
  Login           : sgwaberama
  Expiracao       : 03/02/2027
  Dias Restantes  : 263 dias
  Status          : ATIVA
  Hash            : a3f5c8e2d1b4...

CERTIFICADO #2
----------------------------------------
  Cliente         : ALEX JUNIOR DA SILVA PAIM
  Serial Number   : DR8GR5C04299
  Scanner         : AUTEL
  Regiao          : AMÉRICA DO NORTE
  Login           : sgwaberama
  Expiracao       : 04/12/2026
  Dias Restantes  : 202 dias
  Status          : ATIVA
  Hash            : b7e9d2f1a8c3...

CERTIFICADO #3
----------------------------------------
  Cliente         : ALEXIS FELIPE CONSTANTINO COELHO
  Serial Number   : DR8GS5C05287
  Scanner         : AUTEL
  Regiao          : AMÉRICA DO NORTE
  Login           : sgwaberama
  Expiracao       : N/A
  Dias Restantes  : N/A
  Status          : INCOMPLETA
  Hash            : N/A

CERTIFICADO #4
----------------------------------------
  Cliente         : ALFIA ROSANGELA COSTA MANITTA
  Serial Number   : VA9GS5C01403
  Scanner         : AUTEL
  Regiao          : AMÉRICA DO NORTE
  Login           : sgwaberama
  Expiracao       : 25/11/2026
  Dias Restantes  : 193 dias
  Status          : ATIVA
  Hash            : c4a1b6d3e9f2...

================================================================================
  RESUMO
================================================================================
  Ativos      : 3
  Expirados   : 0
  Incompletos : 1
  Revogados   : 0
================================================================================
  Gerado por: SGW Pro Certificate Processor v2.0
  Skill ID: sgw-pro-cert-processor
================================================================================
```

---

## 5. Prompt Template para LLM (Skill Invocation)

```markdown
## Role
Você é o **SGW Pro Certificate Processor**, um especialista em extração e 
análise de certificados de ativação Security Gateway da Aberama Brasil.

## Task
Analise os PDFs de certificados fornecidos e extraia os dados estruturados 
no formato TXT especificado abaixo.

## Input
- Um ou mais arquivos PDF de certificados Aberama Brasil
- Nome do arquivo no padrão: `{CLIENTE}_{SERIAL}_ABERAMA ATIVAÇÃO SECURITY GATEWAY.pdf`

## Output Format
Gere um arquivo `.txt` seguindo EXATAMENTE esta estrutura:

[INSERIR SEÇÃO 4.1 AQUI]

## Rules
1. Se o PDF não possuir página de capa com data de expiração, marque como `INCOMPLETA`
2. Calcule `Dias Restantes` a partir da data atual do processamento
3. Todos os certificados compartilham o mesmo `Batch ID` dentro de uma sessão
4. O `Hash` é SHA256 da concatenação: cliente + serial + expiracao
5. NUNCA inclua a senha real no output (máscara com `***` se necessário log)

## Example
[INSERIR SEÇÃO 4.2 AQUI]
```

---

## 6. API Contract (FastAPI)

### 6.1 Endpoint

```http
POST /api/v2/certificates/process
Content-Type: multipart/form-data
```

### 6.2 Request

```json
{
  "files": ["<pdf_binary>", "<pdf_binary>"],
  "options": {
    "output_format": "txt",
    "include_hash": true,
    "mask_passwords": true
  }
}
```

### 6.3 Response

```json
{
  "batch_id": "550e8400-e29b-41d4-a716-446655440000",
  "total_processed": 4,
  "output_url": "/downloads/sgw_certificados_analisados.txt",
  "summary": {
    "ativos": 3,
    "expirados": 0,
    "incompletos": 1,
    "revogados": 0
  },
  "processing_time_ms": 1240
}
```

---

## 7. Testes de Validação

### 7.1 Casos de Teste

| ID | Cenário | Entrada | Esperado |
|:---|:---|:---|:---|
| `TC-01` | Certificado completo válido | PDF com capa, dados completos | `ATIVA`, dias > 0, hash presente |
| `TC-02` | Certificado sem capa | PDF sem página de capa | `INCOMPLETA`, `N/A` nos campos ausentes |
| `TC-03` | Certificado expirado | Data de expiração no passado | `EXPIRADA`, dias < 0 |
| `TC-04` | Múltiplos certificados | 4 PDFs em batch | Mesmo `Batch ID`, resumo correto |
| `TC-05` | Encoding UTF-8 | Nome com ç, ã, é | Caracteres preservados no TXT |
| `TC-06` | Serial inválido | Serial com < 12 chars | `INCOMPLETA`, log de erro |

### 7.2 Validação Automatizada do TXT

```python
def validate_txt_output(content: str) -> bool:
    checks = [
        content.startswith("=" * 80),
        "ABERAMA BRASIL - SECURITY GATEWAY CERTIFICATE ANALYSIS" in content,
        "Data da analise:" in content,
        "Batch ID:" in content,
        "CERTIFICADO #" in content,
        "RESUMO" in content,
        "Gerado por: SGW Pro Certificate Processor v2.0" in content,
        content.endswith("=" * 80 + "
"),
    ]
    return all(checks)
```

---

## 8. Remoção do Formato Antigo (CSV)

### 8.1 Checklist de Deprecação

- [ ] Remover parâmetro `?format=csv` dos endpoints
- [ ] Remover função `generate_csv()` do codebase
- [ ] Remover templates de CSV do frontend
- [ ] Atualizar documentação da API (Swagger/OpenAPI)
- [ ] Comunicar breaking change no changelog v2.0
- [ ] Aguardar 30 dias antes de deletar código legado (grace period)

### 8.2 Breaking Change Notice

```markdown
## [2.0.0] — 2026-05-16

### ⚠️ Breaking Changes
- **Removido:** Exportação em formato CSV
- **Adicionado:** Exportação em formato TXT plano
- **Motivo:** Melhor legibilidade humana, eliminação de problemas com 
  delimitadores e compatibilidade nativa com LLMs

### Migration Guide
Antes:
```bash
curl /api/v1/certificates/export?format=csv
```

Depois:
```bash
curl /api/v2/certificates/process  # retorna TXT por padrão
```
```

---

## 9. Anexos

### 9.1 Regex de Extração

```python
import re

PATTERNS = {
    "serial": r"SERIAL\s*NUMBER\s*[:\-]?\s*([A-Z0-9]{12,})",
    "cliente": r"NOME\s*[:\-]?\s*([A-Z\s\.]+)",
    "expiracao": r"EXPIRA\s*EM[:\-]?\s*(\d{2}/\d{2}/\d{4})",
    "regiao": r"REGI[ÃA]O\s*[:\-]?\s*(AM[ÉE]RICA\s*DO\s*NORTE|EUROPA|OUTRAS)",
    "login": r"LOGIN\s*[:\-]?\s*(\w+)",
    "senha": r"SENHA\s*[:\-]?\s*([^\s]+)",
}
```

### 9.2 Dependências

```txt
PyPDF2>=3.0.0
pdfplumber>=0.10.0
python-dateutil>=2.8.0
```

---

## 10. Contato

| Função | Responsável |
|:---|:---|
| Tech Lead | AI Engineering Team |
| Product Owner | SGW Pro Platform |
| Suporte | dev@aberamabrasil.com.br |

---

*Documento gerado automaticamente pelo SGW Pro Certificate Processor v2.0*
