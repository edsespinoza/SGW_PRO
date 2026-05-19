# Nano Banana 2 — Geração e Edição Avançada de Imagens

```yaml
name: nano-banana-2
```

## Descrição
Ferramenta especializada para geração e edição de imagens utilizando a API **Google Nano Banana 2** (`gemini-3.1-flash-image-preview`).

Esta skill deve ser utilizada sempre que houver necessidade de:

- Criar imagens realistas ou artísticas
- Editar imagens existentes
- Fazer composições com múltiplas referências
- Controlar resolução e proporção da imagem
- Produzir imagens para redes sociais, banners, wallpapers, apresentações e materiais técnicos
- Gerar resultados rápidos com alta qualidade visual

A solução oferece suporte para resoluções desde **512px até 4K**, além de múltiplas proporções de tela e consistência visual entre personagens, objetos e elementos gráficos.

---

# Nano Banana 2 — Guia Técnico de Utilização

## Objetivo
O Nano Banana 2 foi desenvolvido para simplificar fluxos de trabalho de geração visual utilizando IA, permitindo criar ou modificar imagens com rapidez, fidelidade visual e controle avançado de parâmetros.

O modelo utilizado nesta implementação é:

- `gemini-3.1-flash-image-preview`

> Não utilizar `gemini-3-pro-image-preview` nesta skill.

---

# Estrutura de Execução

Execute os comandos sempre a partir do diretório principal do projeto.

⚠️ **Importante:**
Não utilize `cd` diretamente dentro da pasta da skill antes da execução.

---

# Geração de Nova Imagem

## Comando

```bash
uv run ./.agents/skills/nano-banana-2/scripts/generate_image.py \
  --prompt "descrição da imagem" \
  --filename "nome-da-imagem.png" \
  [--resolution 512px|1K|2K|4K] \
  [--aspect-ratio PROPORCAO] \
  [--api-key SUA_CHAVE]
```

---

# Edição de Imagem com Referências

## Comando

```bash
uv run ./.agents/skills/nano-banana-2/scripts/generate_image.py \
  --prompt "instruções de edição" \
  --filename "imagem-editada.png" \
  --input-image "caminho/imagem1.png" \
  [--input-image "caminho/imagem2.png"] \
  [--resolution 512px|1K|2K|4K] \
  [--aspect-ratio PROPORCAO] \
  [--api-key SUA_CHAVE]
```

---

# Modelo Utilizado

## Modelo Oficial

```text
gemini-3.1-flash-image-preview
```

Este modelo foi otimizado para:

- Baixa latência
- Geração rápida
- Edição visual avançada
- Preservação de identidade visual
- Manipulação multimodal
- Controle de resolução e proporção

---

# Resoluções Suportadas

| Resolução | Uso Recomendado |
|---|---|
| 512px | Rascunhos rápidos e testes |
| 1K | Uso padrão e redes sociais |
| 2K | Qualidade intermediária/profissional |
| 4K | Impressão, banners e alta definição |

---

# Conversão Inteligente de Solicitações

## Interpretação Automática

| Solicitação do Usuário | Resolução Aplicada |
|---|---|
| “rascunho rápido” | 512px |
| “thumbnail” | 512px |
| “imagem simples” | 1K |
| “qualidade média” | 2K |
| “alta resolução” | 4K |
| “qualidade para impressão” | 4K |

---

# Proporções de Tela Suportadas

## Aspect Ratios Compatíveis

```text
1:1
1:4
1:8
2:3
3:2
3:4
4:1
4:3
4:5
5:4
8:1
9:16
16:9
21:9
```

---

# Recomendações de Uso por Formato

| Aplicação | Aspect Ratio |
|---|---|
| Post quadrado | 1:1 |
| Stories/Reels | 9:16 |
| Banner widescreen | 16:9 |
| Cinemático | 21:9 |
| Impressão retrato | 2:3 |
| Banner panorâmico | 4:1 |

---

# Uso de Imagens de Referência

O sistema suporta até **14 imagens de referência simultaneamente**.

## Aplicações recomendadas

- Manter consistência de personagens
- Preservar logotipos
- Mesclar elementos visuais
- Criar campanhas visuais consistentes
- Reproduzir estilos específicos
- Combinar múltiplas referências técnicas

---

# Chave da API

A chave da API é resolvida automaticamente seguindo esta prioridade:

1. Argumento:

```bash
--api-key
```

2. Variável de ambiente:

```bash
GEMINI_API_KEY
```

---

# Tratamento de Erros

Caso nenhuma chave válida seja encontrada:

- A execução deve ser interrompida imediatamente
- Um erro claro e objetivo deve ser exibido ao usuário
- Não prosseguir com chamadas inválidas à API

---

# Padronização de Nome de Arquivos

## Estrutura Recomendada

```text
aaaa-mm-dd-hh-mm-ss-nome.png
```

## Exemplos

```text
2026-02-26-17-31-04-jardim-japones.png
2026-02-26-17-31-59-banner-social.png
```

---

# Boas Práticas de Prompt

## Para Geração de Imagem

Utilizar descrições:

- Claras
- Objetivas
- Detalhadas
- Contextualizadas
- Com indicação de estilo visual quando necessário

---

## Para Edição de Imagem

Sempre informar:

- O que deve ser alterado
- O que deve ser preservado
- Estilo desejado
- Fidelidade esperada
- Resolução final
- Contexto da aplicação

---

# Fluxo Recomendado

## Processo Ideal

1. Definir objetivo da imagem
2. Escolher resolução adequada
3. Definir proporção correta
4. Inserir referências visuais
5. Elaborar prompt técnico detalhado
6. Executar geração
7. Validar fidelidade visual
8. Ajustar e iterar se necessário

---

# Exemplos de Uso

## Exemplo 1 — Criação de Imagem 4K

```bash
uv run ./.agents/skills/nano-banana-2/scripts/generate_image.py \
  --prompt "Cidade futurista com iluminação neon refletindo na chuva durante o pôr do sol" \
  --filename "2026-02-26-17-45-00-cidade-futurista.png" \
  --resolution 4K \
  --aspect-ratio 16:9
```

---

## Exemplo 2 — Edição com Múltiplas Referências

```bash
uv run ./.agents/skills/nano-banana-2/scripts/generate_image.py \
  --prompt "Criar imagem publicitária mantendo fidelidade total ao logotipo e identidade do personagem" \
  --filename "2026-02-26-17-50-10-campanha-publicitaria.png" \
  --input-image "logo.png" \
  --input-image "personagem.png" \
  --resolution 2K \
  --aspect-ratio 4:5
```

---

# Considerações Técnicas

O Nano Banana 2 é indicado para ambientes que necessitam:

- Automação de geração visual
- Criação rápida de material gráfico
- Integração com pipelines de IA
- Produção de conteúdo para marketing
- Desenvolvimento de interfaces visuais
- Edição assistida por inteligência artificial
- Criação de protótipos gráficos
- Workflows multimodais avançados

---

# Resultado Esperado

Após a execução:

- A imagem deve ser salva em formato `.png`
- O arquivo deve ser armazenado no diretório atual do projeto
- O caminho completo do arquivo gerado deve ser retornado
- Não é necessário reabrir a imagem após a geração, exceto quando solicitado

---

# Observações Finais

Esta skill foi otimizada para:

- Alto desempenho
- Flexibilidade operacional
- Compatibilidade multimodal
- Integração com pipelines automatizados
- Geração visual profissional
- Produção escalável de imagens via IA

O uso adequado das referências e prompts impacta diretamente na qualidade final da geração.

