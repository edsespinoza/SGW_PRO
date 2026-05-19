function Get-SkillDesc($name, $en) {
  $map = @{}
  $map['ai-image-generation']         = 'Gera imagens com FLUX, Gemini, Grok, Seedream, Reve e 50+ modelos via inference.sh CLI'
  $map['ai-video-generation']         = 'Gera videos com Google Veo, Seedance, Wan, Grok e 40+ modelos via inference.sh CLI'
  $map['content-marketing']           = 'Ajuda a construir estrategias de marketing de conteudo, blogs, SEO e thought leadership'
  $map['docx']                        = 'Cria, le, edita e manipula documentos Word (.docx) com formatacao profissional'
  $map['find-skills']                 = 'Descobre e instala skills de agente para estender capacidades'
  $map['frontend-design']             = 'Cria interfaces frontend de alto nivel com qualidade de producao e design refinado'
  $map['impeccable']                  = 'Skill de design com 23 comandos: auditar, polir, animar, refinar interfaces'
  $map['infsh-cli']                   = 'Executa 150+ apps de IA via inference.sh CLI: imagens, videos, LLMs, busca, Twitter'
  $map['nano-banana-2']               = 'Gera e edita imagens com Google Nano Banana 2 (Gemini 3.1 Flash Image Preview)'
  $map['pdf']                         = 'Le, extrai, combina, divide, gira e faz OCR em arquivos PDF'
  $map['remotion-best-practices']     = 'Melhores praticas para criacao de video em React com Remotion'
  $map['twitter-automation']          = 'Automatiza Twitter/X: postar, curtir, seguir, DM, agendar conteudo'
  $map['ui-ux-pro-max']               = 'Inteligencia de design UI/UX: 50+ estilos, 161 paletas, 57 fontes, 99 diretrizes'
  $map['vercel-react-best-practices'] = 'Diretrizes de performance React/Next.js da Vercel Engineering'
  $map['web-design-guidelines']       = 'Revisa conformidade com Diretrizes de Interface da Web (acessibilidade, UX, design)'
  if ($map.ContainsKey($name)) { return $map[$name] }
  return $en
}

$dirs = @()
if (Test-Path '.claude\skills') { $dirs += '.claude\skills' }
if (Test-Path '.opencode\skills') { $dirs += '.opencode\skills' }

$all = @{}
foreach ($d in $dirs) {
  Get-ChildItem $d -Directory | ForEach-Object {
    $n = $_.Name
    $desc = ''
    $md = Join-Path $_.FullName 'SKILL.md'
    if (Test-Path $md) {
      $lines = Get-Content $md
      foreach ($line in $lines) {
        if ($line -match '^description:\s*"?([^"]*?)"?$') {
          $desc = $matches[1]
          break
        }
      }
    }
    if (-not $all.ContainsKey($n)) { $all[$n] = $desc }
  }
}

Write-Output ''
Write-Output '=== SKILLS DISPONIVEIS ==='
Write-Output ''

$all.Keys | Sort-Object | ForEach-Object {
  $n = $_
  $en = $all[$n]
  $pt = Get-SkillDesc $n $en
  Write-Output "  $n"
  Write-Output "  $pt"
  Write-Output ''
}

Write-Output "Total: $($all.Count) skills instaladas"