---
name: sgw-pro-certificate-processor
description: >
  SGW Pro Certificate Processor - Skill para processamento inteligente de certificados
  de ativação Security Gateway (SGW) da Aberama Brasil. Extrai, valida e estrutura
  dados de licenças SGW de scanners AUTEL para veículos Stellantis (Fiat, Jeep, 
  RAM, etc.). Suporta: extração de PDF, validação de credenciais, verificação de 
  expiração, geração de relatórios, e integração com sistemas de gestão de licenças.
  Keywords: sgw, security gateway, aberama, autel, scanner, stellantis, licença,
  certificado, ativação, fiat, jeep, ram, serial number, credenciais.
---

# SGW Pro Certificate Processor

## Visão Geral

Esta skill processa certificados de ativação SGW (Security Gateway) emitidos pela **Aberama Brasil** para scanners **AUTEL**. O sistema extrai dados estruturados de PDFs, valida credenciais, verifica prazos de expiração e gera relatórios para gestão de licenças de diagnóstico em veículos do grupo **Stellantis** (Fiat, Jeep, RAM, Peugeot, etc.).

## Estrutura de Dados do Certificado

### Campos Principais (Obrigatórios)

| Campo | Tipo | Descrição | Validação |
|-------|------|-----------|-----------|
| `nome_cliente` | string | Nome/Razão Social do cliente | Min 3 chars, alfanumérico |
| `serial_number` | string | Número de série do scanner | Regex: `^[A-Z0-9]{12,16}$` |
| `scanner_modelo` | string | Modelo do scanner | Enum: `["AUTEL"]` (extensível) |
| `regiao` | string | Região de ativação | Enum: `["AMÉRICA DO NORTE", "EUROPA", "OUTRAS REGIÕES"]` |
| `login` | string | Login de acesso SGW | Min 4 chars, alfanumérico + underscore |
| `senha` | string | Senha de acesso SGW | Min 8 chars, requer símbolo + número |
| `data_expiracao` | date | Data de expiração da licença | Formato: `DD/MM/YYYY`, futuro |
| `data_ativacao` | date | Data de ativação | Formato: `DD/MM/YYYY`, passado |

### Campos Derivados (Calculados)

| Campo | Tipo | Cálculo |
|-------|------|---------|
| `dias_restantes` | integer | `data_expiracao - data_atual` |
| `status_licenca` | enum | `ATIVA` / `EXPIRANDO` (< 30 dias) / `EXPIRADA` |
| `hash_verificacao` | string | SHA256 dos campos obrigatórios |
| `plataforma_homologacao` | string | Derivado da região (AutoAuth, etc.) |

## Algoritmo de Processamento

### Fase 1: Extração de PDF

```
INPUT: arquivo_pdf (multipart/form-data)
OUTPUT: texto_extraido (string), imagens[] (base64)

PASSOS:
1. Validar tipo MIME: application/pdf
2. Extrair texto via OCR + parsing de camadas
3. Identificar página de licença (página 1 do padrão Aberama)
4. Extrair imagens do selo de validação (página 2)
5. Retornar texto bruto para Fase 2
```

### Fase 2: Parse Estruturado

```python
def parse_certificado(texto_bruto: str) -> dict:
    import re
    from datetime import datetime

    resultado = {
        "nome_cliente": None,
        "serial_number": None,
        "scanner_modelo": None,
        "regiao": None,
        "login": None,
        "senha": None,
        "data_expiracao": None,
        "data_ativacao": None,
        "extraido_em": datetime.now().isoformat(),
        "confianca": 0.0
    }

    patterns = {
        "nome_cliente": r'NOME\s*[:\-]?\s*
?(.+?)(?=
\s*(SERIAL|SCANNER|REGI[ÃA]O|LOGIN|SENHA|EXPIRA))',
        "serial_number": r'SERIAL\s*NUMBER\s*[:\-]?\s*([A-Z0-9]{12,16})',
        "scanner_modelo": r'SCANNER\s*[:\-]?\s*(AUTEL)',
        "regiao": r'REGI[ÃA]O\s*[:\-]?\s*(AM[ÉE]RICA\s*DO\s*NORTE|EUROPA|OUTRAS?\s*REGI[ÕO]ES?)',
        "login": r'LOGIN\s*[:\-]?\s*(\S+)',
        "senha": r'SENHA\s*[:\-]?\s*(\S+)',
        "data_expiracao": r'EXPIRA\s*EM[:\-]?\s*(\d{2}/\d{2}/\d{4})'
    }

    campos_encontrados = 0
    for campo, pattern in patterns.items():
        match = re.search(pattern, texto_bruto, re.IGNORECASE | re.MULTILINE | re.DOTALL)
        if match:
            resultado[campo] = match.group(1).strip()
            campos_encontrados += 1

    resultado["confianca"] = campos_encontrados / len(patterns)

    if resultado["data_expiracao"]:
        resultado["data_expiracao"] = datetime.strptime(
            resultado["data_expiracao"], "%d/%m/%Y"
        ).strftime("%Y-%m-%d")

    if resultado["data_expiracao"]:
        exp = datetime.strptime(resultado["data_expiracao"], "%Y-%m-%d")
        ativ = exp.replace(year=exp.year - 1)
        resultado["data_ativacao"] = ativ.strftime("%Y-%m-%d")

    return resultado
```

### Fase 3: Validação de Dados

```python
def validar_certificado(dados: dict) -> dict:
    from datetime import datetime, timedelta
    import re

    erros = []
    warnings = []

    # Validação de NOME
    if not dados.get("nome_cliente") or len(dados["nome_cliente"]) < 3:
        erros.append("NOME: Mínimo 3 caracteres obrigatório")

    # Validação de SERIAL NUMBER
    serial = dados.get("serial_number", "")
    if not re.match(r'^[A-Z0-9]{12,16}$', serial):
        erros.append(f"SERIAL_NUMBER: Formato inválido ({serial})")

    # Validação de SCANNER
    if dados.get("scanner_modelo") != "AUTEL":
        warnings.append("SCANNER: Modelo não homologado para SGW Aberama")

    # Validação de REGIÃO
    regioes_validas = ["AMÉRICA DO NORTE", "EUROPA", "OUTRAS REGIÕES"]
    if dados.get("regiao") not in regioes_validas:
        erros.append(f"REGIÃO: Valor inválido ({dados.get('regiao')})")

    # Validação de LOGIN
    login = dados.get("login", "")
    if not re.match(r'^[a-zA-Z0-9_]{4,}$', login):
        erros.append("LOGIN: Mínimo 4 chars alfanuméricos/underscore")

    # Validação de SENHA
    senha = dados.get("senha", "")
    if len(senha) < 8 or not re.search(r'[0-9]', senha) or not re.search(r'[!@#$%^&*]', senha):
        warnings.append("SENHA: Recomendado mínimo 8 chars com número e símbolo")

    # Validação de DATAS
    hoje = datetime.now()

    if dados.get("data_expiracao"):
        exp = datetime.strptime(dados["data_expiracao"], "%Y-%m-%d")
        if exp < hoje:
            erros.append("DATA_EXPIRACAO: Licença já expirada")
        elif exp < hoje + timedelta(days=30):
            warnings.append("DATA_EXPIRACAO: Licença expira em menos de 30 dias")

    if dados.get("data_ativacao"):
        ativ = datetime.strptime(dados["data_ativacao"], "%Y-%m-%d")
        if ativ > hoje:
            erros.append("DATA_ATIVACAO: Data de ativação no futuro")

    status = "VALIDO" if not erros else "INVALIDO"
    if warnings and status == "VALIDO":
        status = "VALIDO_COM_ALERTAS"

    return {
        "status": status,
        "erros": erros,
        "warnings": warnings,
        "validado_em": datetime.now().isoformat()
    }
```

### Fase 4: Enriquecimento de Dados

```python
def enriquecer_dados(dados: dict) -> dict:
    from datetime import datetime, timedelta
    import hashlib

    hoje = datetime.now()

    if dados.get("data_expiracao"):
        exp = datetime.strptime(dados["data_expiracao"], "%Y-%m-%d")
        dados["dias_restantes"] = (exp - hoje).days

        if dados["dias_restantes"] < 0:
            dados["status_licenca"] = "EXPIRADA"
        elif dados["dias_restantes"] <= 30:
            dados["status_licenca"] = "EXPIRANDO"
        else:
            dados["status_licenca"] = "ATIVA"

    campos_chave = f"{dados.get('serial_number')}{dados.get('login')}{dados.get('data_expiracao')}"
    dados["hash_verificacao"] = hashlib.sha256(campos_chave.encode()).hexdigest()[:16]

    mapa_plataforma = {
        "AMÉRICA DO NORTE": "AutoAuth (Americana)",
        "EUROPA": "Plataforma Europeia Stellantis",
        "OUTRAS REGIÕES": "Plataforma Regional"
    }
    dados["plataforma_homologacao"] = mapa_plataforma.get(dados.get("regiao"), "Desconhecida")

    dados["alertas"] = []
    if dados.get("dias_restantes", 999) <= 7:
        dados["alertas"].append("RENOVACAO_URGENTE")
    if dados.get("dias_restantes", 999) <= 30:
        dados["alertas"].append("RENOVACAO_PREVIA")

    return dados
```

## API de Integração

### Endpoint: Processar Certificado

```
POST /api/v1/sgw/certificado/processar
Content-Type: multipart/form-data

Request:
  - arquivo: File (PDF do certificado)
  - validar_integridade: boolean (default: true)
  - gerar_relatorio: boolean (default: false)

Response (200 OK):
{
  "success": true,
  "data": {
    "certificado_id": "uuid-v4",
    "dados_extraidos": {
      "nome_cliente": "ARLET CARVALHO COMERCIO LTDA",
      "serial_number": "VX2GS9C01263",
      "scanner_modelo": "AUTEL",
      "regiao": "AMÉRICA DO NORTE",
      "login": "sgwaberama",
      "senha": "@Autel123",
      "data_expiracao": "2027-02-03",
      "data_ativacao": "2026-02-03",
      "dias_restantes": 264,
      "status_licenca": "ATIVA",
      "plataforma_homologacao": "AutoAuth (Americana)",
      "hash_verificacao": "a1b2c3d4e5f67890"
    },
    "validacao": {
      "status": "VALIDO",
      "erros": [],
      "warnings": ["SENHA: Recomendado mínimo 8 chars com número e símbolo"]
    },
    "metadados": {
      "nome_arquivo": "ADAO MENDES DE FREITAS_VX2GS9C01263_ABERAMA ATIVAÇÃO SECURITY GATEWAY.pdf",
      "tamanho_bytes": 245760,
      "paginas": 11,
      "processado_em": "2026-05-15T23:03:00Z",
      "versao_skill": "1.0.0"
    }
  }
}
```

### Endpoint: Validar Credenciais

```
POST /api/v1/sgw/credenciais/validar
Content-Type: application/json

Request:
{
  "serial_number": "VX2GS9C01263",
  "login": "sgwaberama",
  "senha": "@Autel123",
  "regiao": "AMÉRICA DO NORTE"
}

Response:
{
  "valido": true,
  "teste_conectividade": {
    "status": "SUCESSO",
    "servidor": "sgw-autel-northamerica.aberama.br",
    "latencia_ms": 145,
    "protocolo": "HTTPS"
  }
}
```

### Endpoint: Consultar Status de Licença

```
GET /api/v1/sgw/licenca/{serial_number}/status

Response:
{
  "serial_number": "VX2GS9C01263",
  "status": "ATIVA",
  "dias_restantes": 264,
  "expira_em": "2027-02-03",
  "alertas": [],
  "historico_ativacoes": [
    {
      "data": "2026-02-03",
      "veiculo": "FIAT/1P-Nova Strada",
      "vin": "9BD281B31MYW17888",
      "status": "SUCESSO"
    }
  ]
}
```

## Fluxo de Ativação no Scanner (Referência)

Baseado no procedimento documentado no certificado Aberama:

```
1. PRÉ-REQUISITOS:
   ✓ Scanner conectado à internet
   ✓ Veículo Stellantis com SGW disponível
   ✓ Scanner logado na plataforma AUTEL
   ✓ Atualizações pendentes instaladas

2. PROCEDIMENTO:
   a) Conectar scanner à tomada de diagnóstico do veículo
   b) Ligar ignição
   c) Acessar: Diagnóstico → Seleção automática
   d) Aguardar detecção do VIN (falha esperada → OK)
   e) ESC → Seleção manual → Selecionar ano/modelo
   f) Escolher região: North America (para AMÉRICA DO NORTE)
   g) Inserir credenciais: login + senha + "Memorizar-me"
   h) Aguardar: "A estabelecer comunicação com o veículo..."
   i) Confirmação: "Security gateway unlocked successfully"

3. PÓS-ATIVAÇÃO:
   ✓ Diagnóstico completo liberado
   ✓ Credenciais memorizadas no scanner
   ✓ Licença vinculada ao serial number (não transferível)
```

## Regras de Negócio

### Vinculação Exclusiva
- A licença é **vinculada exclusivamente** ao `serial_number` informado
- **Não é transferível** para outro scanner, mesmo em caso de troca ou dano
- Exceção: Defeito comprovado do scanner com substituição autorizada pelo fabricante

### Renovação
- Prazo padrão: **12 meses** da data de ativação
- Alerta de renovação: **30 dias** antes da expiração
- Alerta urgente: **7 dias** antes da expiração

### Reembolso
- **Não permitido** após liberação do acesso
- Exceção: Falha técnica confirmada no ato do desbloqueio (acompanhamento Aberama)

### Plataforma de Homologação
- Pode ser alterada pelo fabricante do scanner **sem aviso prévio**
- Mudança pode interromper funcionamento da licença
- Aberama oferece consultoria técnica para reativação

## Esquema de Dados (Database)

```sql
CREATE TABLE certificados_sgw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_cliente VARCHAR(255) NOT NULL,
    serial_number VARCHAR(16) NOT NULL UNIQUE,
    scanner_modelo VARCHAR(50) NOT NULL DEFAULT 'AUTEL',
    regiao VARCHAR(50) NOT NULL,
    login VARCHAR(100) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    data_ativacao DATE NOT NULL,
    data_expiracao DATE NOT NULL,
    status_licenca VARCHAR(20) NOT NULL DEFAULT 'ATIVA',
    plataforma_homologacao VARCHAR(100),
    hash_verificacao VARCHAR(16),
    arquivo_original VARCHAR(255),
    processado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_regiao CHECK (regiao IN ('AMÉRICA DO NORTE', 'EUROPA', 'OUTRAS REGIÕES')),
    CONSTRAINT chk_status CHECK (status_licenca IN ('ATIVA', 'EXPIRANDO', 'EXPIRADA', 'SUSPENSA'))
);

CREATE INDEX idx_serial ON certificados_sgw(serial_number);
CREATE INDEX idx_status ON certificados_sgw(status_licenca);
CREATE INDEX idx_expiracao ON certificados_sgw(data_expiracao);
CREATE INDEX idx_cliente ON certificados_sgw(nome_cliente);

CREATE TABLE historico_ativacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificado_id UUID REFERENCES certificados_sgw(id),
    data_ativacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    veiculo_modelo VARCHAR(100),
    vin VARCHAR(17),
    status VARCHAR(20) NOT NULL,
    ip_origem INET,
    detalhes JSONB
);
```

## Eventos e Webhooks

```
Evento: sgw.licenca.criada
  - Disparado quando novo certificado é processado com sucesso
  - Payload: dados do certificado + metadados

Evento: sgw.licenca.expirando
  - Disparado 30 dias antes da expiração
  - Payload: serial_number, dias_restantes, data_expiracao

Evento: sgw.licenca.expirada
  - Disparado na data de expiração
  - Payload: serial_number, data_expiracao

Evento: sgw.ativacao.sucesso
  - Disparado quando ativação no scanner é confirmada
  - Payload: serial_number, veiculo, vin, timestamp
```

## Exemplo de Uso (Python SDK)

```python
from sgw_pro import SGWProcessor

processor = SGWProcessor(api_key="sua_chave_api")

with open("certificado.pdf", "rb") as f:
    resultado = processor.processar_certificado(
        arquivo=f,
        validar_integridade=True,
        gerar_relatorio=True
    )

print(f"Cliente: {resultado.dados.nome_cliente}")
print(f"Serial: {resultado.dados.serial_number}")
print(f"Expira em: {resultado.dados.dias_restantes} dias")
print(f"Status: {resultado.validacao.status}")

if resultado.dados.alertas:
    for alerta in resultado.dados.alertas:
        print(f"ALERTA: {alerta}")

validacao = processor.validar_credenciais(
    serial_number="VX2GS9C01263",
    login="sgwaberama",
    senha="@Autel123",
    regiao="AMÉRICA DO NORTE"
)

if validacao.valido:
    print("Credenciais válidas e servidor respondendo")
```

## Tratamento de Erros

| Código | Descrição | Ação Recomendada |
|--------|-----------|------------------|
| `CERTIFICADO_INVALIDO` | PDF não contém campos obrigatórios | Verificar arquivo e reenviar |
| `SERIAL_DUPLICADO` | Serial já cadastrado no sistema | Consultar status da licença existente |
| `CREDENCIAIS_INVALIDAS` | Login/senha não conferem | Verificar com cliente/Aberama |
| `REGIAO_INVALIDA` | Região não suportada | Confirmar região do veículo |
| `LICENCA_EXPIRADA` | Licença fora do prazo | Solicitar renovação |
| `SCANNER_NAO_HOMOLOGADO` | Modelo não suportado | Verificar compatibilidade |
| `SERVIDOR_SGW_INDISPONIVEL` | Falha na conectividade | Tentar novamente mais tarde |

## Considerações de Segurança

1. **Senhas**: Nunca armazenar em plaintext. Usar bcrypt/argon2 com salt
2. **PDFs**: Validar MIME type e magic bytes antes de processar
3. **Rate Limiting**: Máximo 10 processamentos/minuto por IP
4. **Auditoria**: Logar todas as operações de leitura de credenciais
5. **Criptografia**: TLS 1.3 para todas as comunicações
6. **Acesso**: RBAC - apenas roles `admin` e `suporte_tecnico` acessam credenciais

## Versionamento

- **v1.0.0** (2026-05-15): Versão inicial com suporte a Aberama Brasil + AUTEL
- **v1.1.0** (planejado): Suporte a múltiplos fabricantes de scanner
- **v1.2.0** (planejado): Integração com APIs de homologação Stellantis
- **v2.0.0** (planejado): Suporte a OCR em imagens (sem PDF)

## Referências

- Documento base: Certificado Aberama Brasil - SGW Security Gateway
- Fabricante scanner: AUTEL (autel.com)
- Grupo veicular: Stellantis (stellantis.com)
- Plataforma homologação: AutoAuth (autoauth.com)

---
*Skill desenvolvida para automação de processos SGW Aberama Brasil*
*Compatível com sistemas de gestão de licenças e diagnóstico veicular*
