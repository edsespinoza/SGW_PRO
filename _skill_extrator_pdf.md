# Skill de Extração PDF → SGW Pro
## Refatoração Baseada em Dados Reais — Certificados Aberama Brasil

---

## 1. Visão Geral do Documento de Entrada

### 1.1 Tipo de Documento
**Certificado de Ativação SGW (Security Gateway)** emitido pela **Aberama Brasil** para scanners **AUTEL**.

### 1.2 Estrutura do PDF (11 páginas)

```
Certificado SGW Aberama Brasil
├── Página 1:  CAPA DA LICENÇA (dados principais)
│   ├── NOME: Nome/Razão Social do cliente
│   ├── SCANNER: Modelo do equipamento (AUTEL)
│   ├── SERIAL NUMBER: Número de série do scanner
│   ├── REGIÃO: Região de ativação (AMÉRICA DO NORTE)
│   ├── LOGIN: Credencial de acesso SGW
│   ├── SENHA: Senha de acesso SGW
│   └── EXPIRA EM: Data de validade da licença
│
├── Páginas 2-4: TERMOS E CONDIÇÕES
│   ├── Certificado de ativação
│   ├── Termo de compromisso
│   └── Regras de uso da licença
│
├── Páginas 5-10: PROCEDIMENTO DE ATIVAÇÃO
│   ├── Screenshots do scanner Autel
│   └── Passo a passo da ativação
│
└── Página 11: RODAPÉ
```

### 1.3 Padrão do Nome do Arquivo

```
[NOME_CLIENTE]_[SERIAL_SCANNER]_[DESCRICAO].pdf

Exemplo real:
ADAO MENDES DE FREITAS_VX2GS9C01263_ABERAMA ATIVAÇÃO SECURITY GATEWAY.pdf
         │                    │                      │
         ▼                    ▼                      ▼
  Nome/Razão Social    Serial Equipamento      Descrição do documento
```

---

## 2. Mapeamento de Campos — Extração Estratégica

### 2.1 Fontes de Dados por Campo

| Campo | Fonte Primária | Fonte Secundária | Regex/Pattern | Confiança |
|-------|----------------|------------------|---------------|-----------|
| **nome_razao_social** | Página 1 (label "NOME") | Nome do arquivo (parte 1) | `NOME\s*
?\s*([A-Z\s]+(?:LTDA|ME|EPP|EIRELI)?)` | Alta |
| **tipo_documento** | Inferido do nome (LTDA=CNPJ, PF=CPF) | — | `(LTDA|ME|EPP|EIRELI)` → CNPJ | Média |
| **documento** | — | — | NÃO PRESENTE no PDF atual | N/A |
| **telefone** | — | — | NÃO PRESENTE no PDF atual | N/A |
| **email** | — | — | NÃO PRESENTE no PDF atual | N/A |
| **estado_uf** | — | — | NÃO PRESENTE no PDF atual | N/A |
| **placa** | — | — | NÃO PRESENTE no PDF atual | N/A |
| **ano** | — | — | NÃO PRESENTE no PDF atual | N/A |
| **serial_equipamento** | Página 1 (label "SERIAL NUMBER") | Nome do arquivo (parte 2) | `SERIAL\s*NUMBER\s*
?\s*([A-Z0-9]{10,20})` | Alta |
| **observacoes** | Múltiplas fontes | — | Concatenação de dados extras | Alta |
| **arquivo_origem** | Nome do arquivo | — | Nome completo do PDF | 100% |
| **status** | Sempre "concluido" | — | Fixo | 100% |

### 2.2 Dados Complementares (Observações)

Campos adicionais encontrados no PDF que devem ir em `observacoes`:

| Dado | Localização | Valor de Exemplo |
|------|-------------|------------------|
| Scanner/Equipamento | Página 1 | AUTEL |
| Região | Página 1 | AMÉRICA DO NORTE |
| Login SGW | Página 1 | sgwaberama |
| Senha SGW | Página 1 | @Autel123 |
| Data de Expiração | Página 1 | 03/02/2027 |
| Nome do Arquivo | Sistema | ADAO MENDES DE FREITAS_VX2GS9C01263... |

---

## 3. Schema do Banco de Dados — Refatorado

### 3.1 Tabela Principal: `extracoes_sgw`

```sql
CREATE TABLE extracoes_sgw (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Dados do Cliente (obrigatórios)
    nome_razao_social       VARCHAR(255) NOT NULL,
    tipo_documento          VARCHAR(4) CHECK (tipo_documento IN ('CPF', 'CNPJ')),
    documento               VARCHAR(18),  -- PODE SER NULL (não presente no PDF)

    -- Contato (opcionais — não presentes no PDF Aberama)
    telefone                VARCHAR(20),
    email                   VARCHAR(255),

    -- Localização (opcional)
    estado_uf               CHAR(2),

    -- Dados do Veículo (não extraídos do PDF Aberama)
    placa                   VARCHAR(7),   -- NÃO presente no PDF atual
    ano                     INTEGER CHECK (ano >= 1900 AND ano <= 2100), -- NÃO presente

    -- Dados do Equipamento (obrigatórios)
    serial_equipamento      VARCHAR(100) NOT NULL,  -- Serial do scanner AUTEL

    -- Dados da Licença SGW (específicos do documento)
    scanner_marca           VARCHAR(50) DEFAULT 'AUTEL',
    regiao_ativacao         VARCHAR(50),  -- Ex: "AMÉRICA DO NORTE"
    login_sgw               VARCHAR(100), -- Credencial de acesso
    senha_sgw               VARCHAR(100), -- Senha de acesso
    data_expiracao          DATE,         -- Data de validade da licença

    -- Observações e Metadados
    observacoes             TEXT,

    -- Metadados do Processamento
    arquivo_origem          VARCHAR(500) NOT NULL,
    status                  VARCHAR(20) DEFAULT 'concluido' 
                            CHECK (status IN ('pendente', 'processando', 'concluido', 'erro', 'reprocessando')),

    -- Modo de Extração
    modo_extracao           VARCHAR(20) CHECK (modo_extracao IN ('regex', 'ia_claude', 'hibrido')),
    confianca_extracao      DECIMAL(3,2),  -- 0.00 a 1.00

    -- Campos preenchidos / Campos totais
    campos_preenchidos      INTEGER DEFAULT 0,
    campos_totais           INTEGER DEFAULT 12,

    -- Tentativas de Reprocessamento
    tentativas              INTEGER DEFAULT 0,
    max_tentativas          INTEGER DEFAULT 3,

    -- Timestamps
    criado_em               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processado_em           TIMESTAMP,

    -- Lote de Processamento
    lote_id                 UUID REFERENCES lotes_processamento(id),

    -- Dados Brutos (para debug/reprocessamento)
    texto_bruto_pagina1     TEXT,  -- Texto extraído da capa
    texto_bruto_completo    TEXT,  -- Texto completo do PDF
    resposta_ia             JSONB  -- Resposta da IA (se usado modo IA)
);
```

### 3.2 Índices

```sql
-- Índices para consultas frequentes
CREATE INDEX idx_sgw_status ON extracoes_sgw(status);
CREATE INDEX idx_sgw_lote ON extracoes_sgw(lote_id);
CREATE INDEX idx_sgw_serial ON extracoes_sgw(serial_equipamento);
CREATE INDEX idx_sgw_documento ON extracoes_sgw(documento);
CREATE INDEX idx_sgw_criado_em ON extracoes_sgw(criado_em DESC);
CREATE INDEX idx_sgw_nome ON extracoes_sgw USING gin(to_tsvector('portuguese', nome_razao_social));
```

---

## 4. Engine de Extração Refatorada — Aberama SGW

### 4.1 Estratégia de Extração por Página

```typescript
interface EstrategiaExtracao {
    pagina: number;
    prioridade: number;
    campos: string[];
    metodo: 'regex' | 'ocr' | 'ia';
}

const ESTRATEGIAS_ABERAMA: EstrategiaExtracao[] = [
    {
        pagina: 1,      // CAPA DA LICENÇA — mais importante
        prioridade: 1,
        campos: ['nome_razao_social', 'serial_equipamento', 'scanner_marca', 
                 'regiao_ativacao', 'login_sgw', 'senha_sgw', 'data_expiracao'],
        metodo: 'regex'
    },
    {
        pagina: 0,      // NOME DO ARQUIVO — fallback
        prioridade: 2,
        campos: ['nome_razao_social', 'serial_equipamento'],
        metodo: 'regex'
    }
];
```

### 4.2 Regex Específicos para PDF Aberama

```typescript
class AberamaExtractor {

    // ==================== PÁGINA 1: CAPA DA LICENÇA ====================

    private regexNome = /NOME\s*
?\s*([A-Z][A-Z\s]+(?:LTDA|ME|EPP|EIRELI)?)/i;

    private regexSerialNumber = /SERIAL\s*NUMBER\s*
?\s*([A-Z0-9]{10,20})/i;

    private regexScanner = /SCANNER\s*
?\s*([A-Z]+)/i;

    private regexRegiao = /REGI[ÃA]O\s*
?\s*([A-Z\s]+)/i;

    private regexLogin = /LOGIN\s*
?\s*([a-z0-9_]+)/i;

    private regexSenha = /SENHA\s*
?\s*([@A-Za-z0-9!#$%]+)/i;

    private regexExpira = /EXPIRA\s*EM[:\s]*(\d{2}\/\d{2}\/\d{4})/i;

    // ==================== NOME DO ARQUIVO ====================

    private regexNomeArquivo = /^([A-Z\s]+)_(?:[A-Z0-9]+)_.+\.pdf$/i;

    private regexSerialArquivo = /^[A-Z\s]+_([A-Z0-9]{10,20})_.+\.pdf$/i;

    // ==================== MÉTODOS DE EXTRAÇÃO ====================

    async extrair(pdfBuffer: Buffer, nomeArquivo: string): Promise<ResultadoExtracao> {
        const campos: Record<string, CampoExtraido> = {};

        // 1. Extrair texto de todas as páginas
        const paginas = await this.extrairTextoPorPagina(pdfBuffer);

        // 2. Processar Página 1 (CAPA)
        const textoPagina1 = paginas[0] || '';
        campos.nome_razao_social = this.extrairCampo(textoPagina1, this.regexNome, 'regex');
        campos.serial_equipamento = this.extrairCampo(textoPagina1, this.regexSerialNumber, 'regex');
        campos.scanner_marca = this.extrairCampo(textoPagina1, this.regexScanner, 'regex');
        campos.regiao_ativacao = this.extrairCampo(textoPagina1, this.regexRegiao, 'regex');
        campos.login_sgw = this.extrairCampo(textoPagina1, this.regexLogin, 'regex');
        campos.senha_sgw = this.extrairCampo(textoPagina1, this.regexSenha, 'regex');
        campos.data_expiracao = this.extrairCampo(textoPagina1, this.regexExpira, 'regex');

        // 3. Fallback: Nome do arquivo
        if (!campos.nome_razao_social?.valor) {
            campos.nome_razao_social = this.extrairDoNomeArquivo(nomeArquivo, 'nome');
        }
        if (!campos.serial_equipamento?.valor) {
            campos.serial_equipamento = this.extrairDoNomeArquivo(nomeArquivo, 'serial');
        }

        // 4. Inferir tipo de documento
        campos.tipo_documento = this.inferirTipoDocumento(campos.nome_razao_social?.valor);

        // 5. Montar observações
        campos.observacoes = this.montarObservacoes(campos, nomeArquivo);

        // 6. Campos fixos
        campos.arquivo_origem = { campo: 'arquivo_origem', valor: nomeArquivo, confianca: 1.0, fonte: 'sistema', validado: true };
        campos.status = { campo: 'status', valor: 'concluido', confianca: 1.0, fonte: 'sistema', validado: true };

        // 7. Calcular confiança geral
        const camposPreenchidos = Object.values(campos).filter(c => c.valor !== null).length;
        const camposTotais = 12;
        const confianca = camposPreenchidos / camposTotais;

        return {
            arquivo: nomeArquivo,
            campos,
            textoCompleto: paginas.join(' '),
            status: confianca >= 0.5 ? 'sucesso' : 'parcial',
            modo: 'regex',
            tempoProcessamento: 0,
            tentativa: 1,
            camposPreenchidos,
            camposTotais
        };
    }

    private inferirTipoDocumento(nome: string | null): CampoExtraido {
        if (!nome) {
            return { campo: 'tipo_documento', valor: null, confianca: 0, fonte: 'inferencia', validado: false };
        }

        const nomeUpper = nome.toUpperCase();
        if (/(LTDA|ME|EPP|EIRELI|SA|SS)/.test(nomeUpper)) {
            return { campo: 'tipo_documento', valor: 'CNPJ', confianca: 0.9, fonte: 'inferencia', validado: false };
        }

        // Se tem mais de 2 palavras e não tem sufixo empresarial, provavelmente é PF
        const palavras = nome.trim().split(/\s+/);
        if (palavras.length >= 2 && palavras.length <= 5) {
            return { campo: 'tipo_documento', valor: 'CPF', confianca: 0.6, fonte: 'inferencia', validado: false };
        }

        return { campo: 'tipo_documento', valor: null, confianca: 0, fonte: 'inferencia', validado: false };
    }

    private montarObservacoes(campos: Record<string, CampoExtraido>, nomeArquivo: string): CampoExtraido {
        const partes: string[] = [];

        if (campos.scanner_marca?.valor) partes.push(`Scanner: ${campos.scanner_marca.valor}`);
        if (campos.regiao_ativacao?.valor) partes.push(`Região: ${campos.regiao_ativacao.valor}`);
        if (campos.login_sgw?.valor) partes.push(`Login SGW: ${campos.login_sgw.valor}`);
        if (campos.senha_sgw?.valor) partes.push(`Senha SGW: ${campos.senha_sgw.valor}`);
        if (campos.data_expiracao?.valor) partes.push(`Expira em: ${campos.data_expiracao.valor}`);

        partes.push(`Licença vinculada ao serial do scanner`);
        partes.push(`Arquivo: ${nomeArquivo}`);

        return {
            campo: 'observacoes',
            valor: partes.join(' | '),
            confianca: 0.9,
            fonte: 'compilacao',
            validado: true
        };
    }
}
```

---

## 5. Prompt para IA Claude (Modo Inteligente)

```
Você é um extrator de dados especializado em certificados de ativação SGW da Aberama Brasil.

Extraia os seguintes campos do documento PDF fornecido:

CAMPOS OBRIGATÓRIOS:
- nome_razao_social: Nome ou Razão Social do cliente (geralmente na capa, label "NOME")
- serial_equipamento: Número de série do scanner (label "SERIAL NUMBER", ex: VX2GS9C01263)

CAMPOS OPCIONAIS (pode ser null se não encontrado):
- tipo_documento: "CPF" ou "CNPJ" (inferir do nome — LTDA/EIRELI/ME = CNPJ)
- documento: Número do CPF ou CNPJ
- telefone: Telefone do cliente
- email: E-mail do cliente
- estado_uf: Sigla do estado (2 letras)
- placa: Placa do veículo
- ano: Ano do veículo (4 dígitos)

CAMPOS ESPECÍFICOS SGW (para observações):
- scanner_marca: Marca do scanner (ex: AUTEL)
- regiao_ativacao: Região de ativação (ex: AMÉRICA DO NORTE)
- login_sgw: Login de acesso SGW
- senha_sgw: Senha de acesso SGW
- data_expiracao: Data de expiração da licença (DD/MM/AAAA)

REGRAS IMPORTANTES:
1. A Página 1 é a CAPA DA LICENÇA — contém os dados principais do cliente
2. O NOME do cliente está no label "NOME" na capa
3. O SERIAL do scanner está no label "SERIAL NUMBER" na capa
4. O nome do arquivo segue o padrão: [NOME]_[SERIAL]_[DESCRICAO].pdf
5. Se não encontrar um campo, use null — NÃO invente dados
6. Para CPF/CNPJ não encontrados, retorne null (não está no PDF atual)
7. Compile dados extras (scanner, região, login, senha, expiração) no campo "observacoes"
8. O campo "vin_chassi" NÃO deve ser extraído — não é necessário para o SGW Pro
9. O campo "modelo" NÃO deve ser extraído — não é necessário para o SGW Pro

Retorne APENAS um objeto JSON válido com a estrutura exata abaixo:

{
  "nome_razao_social": "string",
  "tipo_documento": "CPF|CNPJ|null",
  "documento": "string|null",
  "telefone": "string|null",
  "email": "string|null",
  "estado_uf": "string|null",
  "placa": "string|null",
  "ano": "number|null",
  "serial_equipamento": "string",
  "observacoes": "string"
}
```

---

## 6. Exportação Excel — Colunas Aberama SGW

### 6.1 Estrutura da Planilha

```typescript
const COLUNAS_ABERAMA_SGW = [
    { header: 'Nome / Razão Social',  key: 'nome_razao_social',    width: 40 },
    { header: 'Tipo Doc',             key: 'tipo_documento',       width: 10 },
    { header: 'CPF/CNPJ',             key: 'documento',            width: 18 },
    { header: 'Telefone',             key: 'telefone',             width: 15 },
    { header: 'E-mail',               key: 'email',                width: 35 },
    { header: 'Estado (UF)',          key: 'estado_uf',            width: 12 },
    { header: 'Placa',                key: 'placa',                width: 10 },
    { header: 'Ano',                  key: 'ano',                  width: 8 },
    { header: 'Serial Equip.',        key: 'serial_equipamento',   width: 20 },
    { header: 'Scanner',              key: 'scanner_marca',        width: 15 },
    { header: 'Região',               key: 'regiao_ativacao',      width: 20 },
    { header: 'Login SGW',            key: 'login_sgw',            width: 20 },
    { header: 'Senha SGW',            key: 'senha_sgw',            width: 20 },
    { header: 'Expira em',            key: 'data_expiracao',       width: 15 },
    { header: 'Obs.',                 key: 'observacoes',          width: 50 },
    { header: 'Arquivo Origem',       key: 'arquivo_origem',       width: 40 },
    { header: 'Status',               key: 'status',               width: 12 },
    { header: 'Confiança',            key: 'confianca_extracao',   width: 12 }
];
```

---

## 7. Exemplo de Dados Extraídos (PDF Real)

### 7.1 Entrada
```
Arquivo: ADAO MENDES DE FREITAS_VX2GS9C01263_ABERAMA ATIVAÇÃO SECURITY GATEWAY.pdf
```

### 7.2 Saída

| Campo | Valor Extraído | Fonte | Confiança |
|-------|---------------|-------|-----------|
| nome_razao_social | ARLET CARVALHO COMERCIO LTDA | Página 1 (NOME) | 0.98 |
| tipo_documento | CNPJ | Inferência (LTDA) | 0.90 |
| documento | — | Não encontrado | 0.00 |
| telefone | — | Não encontrado | 0.00 |
| email | — | Não encontrado | 0.00 |
| estado_uf | — | Não encontrado | 0.00 |
| placa | — | Não encontrado | 0.00 |
| ano | — | Não encontrado | 0.00 |
| serial_equipamento | VX2GS9C01263 | Página 1 (SERIAL NUMBER) | 0.98 |
| scanner_marca | AUTEL | Página 1 (SCANNER) | 0.95 |
| regiao_ativacao | AMÉRICA DO NORTE | Página 1 (REGIÃO) | 0.95 |
| login_sgw | sgwaberama | Página 1 (LOGIN) | 0.95 |
| senha_sgw | @Autel123 | Página 1 (SENHA) | 0.95 |
| data_expiracao | 03/02/2027 | Página 1 (EXPIRA EM) | 0.95 |
| observacoes | Scanner: AUTEL \| Região: AMÉRICA DO NORTE \| Login SGW: sgwaberama \| Senha SGW: @Autel123 \| Expira em: 03/02/2027 \| Licença vinculada ao serial do scanner \| Arquivo: ADAO MENDES... | Compilação | 0.90 |
| arquivo_origem | ADAO MENDES DE FREITAS_VX2GS9C01263_ABERAMA ATIVAÇÃO SECURITY GATEWAY.pdf | Sistema | 1.00 |
| status | concluido | Sistema | 1.00 |
| confianca_extracao | 0.83 | Cálculo (10/12 campos) | — |

---

## 8. Validações Específicas

### 8.1 Validação do Serial do Scanner AUTEL
```typescript
function validarSerialAutel(serial: string): boolean {
    // Padrão observado: VX2GS9C01263 (13 caracteres alfanuméricos)
    return /^[A-Z0-9]{10,20}$/.test(serial);
}
```

### 8.2 Validação da Data de Expiração
```typescript
function validarDataExpiracao(data: string): boolean {
    // Formato: DD/MM/AAAA
    const regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
    if (!regex.test(data)) return false;

    const [dia, mes, ano] = data.split('/').map(Number);
    const dataObj = new Date(ano, mes - 1, dia);
    const hoje = new Date();

    // Data deve ser futura (licença válida)
    return dataObj > hoje;
}
```

---

## 9. Sistema de Fallback (Cascata)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORDEM DE EXTRAÇÃO                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. REGEX na Página 1 (CAPA)                                    │
│     ├── NOME → nome_razao_social                                │
│     ├── SERIAL NUMBER → serial_equipamento                      │
│     ├── SCANNER → scanner_marca                                 │
│     ├── REGIÃO → regiao_ativacao                                │
│     ├── LOGIN → login_sgw                                       │
│     ├── SENHA → senha_sgw                                       │
│     └── EXPIRA EM → data_expiracao                              │
│                                                                 │
│  2. FALLBACK: Nome do Arquivo                                   │
│     ├── Parte 1 → nome_razao_social (se não encontrado na capa) │
│     └── Parte 2 → serial_equipamento (se não encontrado na capa)│
│                                                                 │
│  3. INFERÊNCIA                                                  │
│     └── LTDA/ME/EIRELI → tipo_documento = CNPJ                   │
│                                                                 │
│  4. IA CLAUDE (se modo IA ativado ou regex falhou)              │
│     └── Análise visual das screenshots                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Configuração da Skill para Agente de IA

### 10.1 Instruções do Sistema (System Prompt)

```
Você é um agente de extração de dados especializado em certificados de ativação 
SGW (Security Gateway) da Aberama Brasil.

SEU OBJETIVO:
Extrair informações estruturadas de PDFs de certificados SGW e salvá-las no 
banco de dados do SGW Pro.

REGRAS FUNDAMENTAIS:
1. SEMPRE extraia da PÁGINA 1 primeiro (capa da licença)
2. O NOME do cliente está no label "NOME" na capa
3. O SERIAL do scanner está no label "SERIAL NUMBER" na capa
4. Dados de login/senha/região/expiração são para o campo "observacoes"
5. NUNCA invente dados — se não encontrar, use null
6. O nome do arquivo segue: [NOME]_[SERIAL]_[DESCRICAO].pdf
7. O campo "vin_chassi" NÃO deve ser extraído — não é necessário para o SGW Pro
8. O campo "modelo" NÃO deve ser extraído — não é necessário para o SGW Pro

CAMPOS QUE O PDF ABERAMA TEM:
✅ nome_razao_social (capa)
✅ serial_equipamento (capa)
✅ scanner_marca (capa)
✅ regiao_ativacao (capa)
✅ login_sgw (capa)
✅ senha_sgw (capa)
✅ data_expiracao (capa)

CAMPOS QUE O PDF ABERAMA NÃO TEM (usar null):
❌ documento (CPF/CNPJ numérico)
❌ telefone
❌ email
❌ estado_uf
❌ placa
❌ ano
❌ vin_chassi (REMOVIDO — não necessário)
❌ modelo (REMOVIDO — não necessário)

FORMATO DE SAÍDA:
Retorne sempre um JSON válido com os 12 campos do schema.
```

### 10.2 Função do Agente

```typescript
interface AgenteExtracao {
    nome: 'extrator_sgw_aberama';
    versao: '1.2.0';

    // Entrada
    entrada: {
        arquivo_pdf: File;
        modo: 'regex' | 'ia' | 'hibrido';
    };

    // Processamento
    processar: () => Promise<ResultadoExtracao>;

    // Validação
    validar: (resultado: ResultadoExtracao) => ValidacaoResult;

    // Saída
    saida: {
        salvar_banco: (dados: ResultadoExtracao) => Promise<UUID>;
        gerar_excel: (dados: ResultadoExtracao[]) => Promise<Buffer>;
        importar_sgw: (dados: ResultadoExtracao[]) => Promise<ImportReport>;
    };
}
```

---

## 11. Roadmap Refatorado

### Fase 1: MVP Regex (Semana 1)
- [x] Análise do PDF real Aberama
- [ ] Parser de texto com PDF.js
- [ ] Regex específicos para capa (Página 1)
- [ ] Fallback pelo nome do arquivo
- [ ] Exportação básica para Excel

### Fase 2: Validações (Semana 2)
- [ ] Validação de serial AUTEL
- [ ] Validação de data de expiração
- [ ] Cálculo de confiança por campo
- [ ] Sistema de retry para extração falha

### Fase 3: IA Claude (Semana 3)
- [ ] Prompt especializado para certificados Aberama
- [ ] Extração visual das screenshots
- [ ] Fallback automático Regex → IA
- [ ] Cache de resultados da IA

### Fase 4: Integração SGW Pro (Semana 4)
- [ ] Mapeamento de campos para schema SGW Pro
- [ ] API de importação
- [ ] Verificação de duplicatas por serial
- [ ] Relatório de importação

### Fase 5: UI e Deploy (Semana 5)
- [ ] Interface de upload de ZIP/PDFs
- [ ] Preview de extração antes de salvar
- [ ] Edição manual de campos
- [ ] Deploy em produção

---

## 12. Métricas de Sucesso

| Métrica | Target | Observação |
|---------|--------|------------|
| Taxa de extração de nome | > 98% | Fonte: Página 1 + nome do arquivo |
| Taxa de extração de serial | > 98% | Fonte: Página 1 + nome do arquivo |
| Campos nulos aceitáveis | documento, telefone, email, uf, placa, ano | Não presentes no PDF |
| Tempo por PDF | < 3s (Regex), < 8s (IA) | — |
| Confiância mínima | > 0.60 | Para considerar extração válida |

---

*Documento refatorado com base em análise do PDF real*
*Certificado Aberama Brasil — Ativação SGW*
*Última atualização: 2026-05-15*
*Versão: 1.2.0 — Campos "modelo" e "vin_chassi" removidos*
