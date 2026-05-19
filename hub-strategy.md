# Hub autotech.app.br — Estratégia + Arquitetura
> Gerado em 2026-05-13 | Baseado em: análise de código SGW Pro v11, skill frontend-design, agente marketing-strategist, Vercel knowledge-update 2026

---

## Estrutura de URLs

```
autotech.app.br/
├── /                  → Hub Central (nova landing page)
├── /hub               → Painel do usuário logado (SSO unificado)
├── /sgw-pro/          → SGW Pro v11 (HTML estático)
├── /adas-pro/         → ADAS Pro (existente)
├── /extractor/        → SGW Zip Extractor (freemium, standalone)
├── /planos            → Pricing unificado cross-produto
├── /api/ai-proxy      → Vercel Function — proxy Anthropic (elimina BUG-002)
└── /api/health        → healthcheck cross-system
```

---

## Modelo de Planos (âncora: Profissional)

| Plano | Preço/mês | Inclui |
|---|---|---|
| Solo | R$ 297 | SGW Pro (1 usuário) |
| **Profissional** | **R$ 497** | **SGW Pro + ADAS Pro — "Mais popular"** |
| Equipe | R$ 897 | SGW Pro + ADAS Pro + 5 usuários |
| Distribuidor | R$ 1.897 | Todos + 20 usuários + API Extractor + suporte prioritário |

Anual com 30% de desconto. Extractor: freemium (10 PDFs/mês grátis → pago acima).

---

## Sequência de Lançamento

```
Mês 1         Mês 2          Mês 3–4        Mês 5+
SGW Pro       Extractor      ADAS Pro       Academy
(deploy)      (freemium)     + SSO Hub      + API pública
```

---

## Top 4 Integrações por ROI

1. **Extractor → SGW Pro** — importação automática de lote (elimina 30–45min de trabalho)
2. **SGW Pro → alertas vencimento** — WhatsApp/e-mail 30/15/7 dias antes (reduz churn)
3. **SGW Pro ↔ ADAS Pro** — cliente compartilhado, sem recadastro
4. **Hub SSO** — login único para todos os sistemas

---

## Copy do Hub Central (3 variantes)

**A — Controle (remarketing/e-mail):**
> Headline: "Gerencie cada licença SGW e calibração ADAS em um painel."
> Sub: "A plataforma da Aberama Brasil para técnicos que não podem perder acesso em campo."
> CTA: "Acessar meu painel →"

**B — Dor/urgência (tráfego frio/anúncios):**
> Headline: "Licença SGW vencida em campo custa caro. Controle com antecedência."
> Sub: "O SGW Pro rastreia vencimentos, gera certificados e centraliza seus clientes. Usado por distribuidores Autel, Launch e OBDSTAR."
> CTA: "Testar 14 dias grátis →"

**C — Identidade profissional (landing principal):**
> Headline: "A plataforma dos técnicos automotivos de alto nível no Brasil."
> Sub: "De scanners de R$8k a R$50k, os melhores técnicos controlam licenças SGW, assinaturas ADAS e dados de ativação — tudo em autotech.app.br."
> CTA: "Fazer parte do hub →"

---

## Arquitetura Técnica do Hub

### Vercel (plataforma recomendada)

- **vercel.ts** como configuração tipada (recomendado 2026 — substitui vercel.json)
- Fluid Compute para Vercel Functions (Node.js 24, sem edge limitations)
- **Vercel AI Gateway** para rotear chamadas ao Anthropic (elimina exposição de chave no cliente)
- Cada sistema: HTML estático servido da respectiva subpasta

### Comunicação cross-system (mesma origin)

```js
// Namespace por sistema
localStorage.setItem('sgw:lastClient', JSON.stringify(client));
localStorage.getItem('adas:userId');

// Mensagens real-time entre abas
const ch = new BroadcastChannel('autotech-hub');
ch.postMessage({ type: 'CLIENT_UPDATED', payload: clientData });
ch.onmessage = (e) => { /* sincroniza estado */ };
```

### Proxy Anthropic (Vercel Function)

```ts
// api/ai-proxy/route.ts
export async function POST(req: Request) {
  const body = await req.json();
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY, // env var no Vercel, nunca no cliente
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return new Response(response.body, { status: response.status });
}
```

### vercel.ts (configuração do hub)

```ts
import { type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  rewrites: [
    { source: '/sgw-pro/(.*)', destination: '/sgw-pro/$1' },
    { source: '/adas-pro/(.*)', destination: '/adas-pro/$1' },
    { source: '/extractor/(.*)', destination: '/extractor/$1' },
  ],
  headers: [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' cdn.tailwindcss.com cdn.jsdelivr.net cdnjs.cloudflare.com unpkg.com",
            "style-src 'self' 'unsafe-inline' fonts.googleapis.com cdn.tailwindcss.com",
            "font-src 'self' fonts.gstatic.com",
            "img-src 'self' data: blob:",
            "connect-src 'self' /api/ai-proxy",  // BLOQUEIA chamada direta ao Anthropic
          ].join('; '),
        },
      ],
    },
  ],
};
```

---

## Vulnerabilidades Críticas (pre-deploy checklist)

| Prioridade | Bug | Solução |
|---|---|---|
| 🔴 Antes do deploy | `anthropicKey` no IDB sem criptografia | Proxy Vercel Function + `process.env.ANTHROPIC_API_KEY` |
| 🔴 Antes do deploy | Chamada direta `api.anthropic.com` (CORS + exposição) | Substituir por `/api/ai-proxy` no ExtractorBatch |
| 🟠 Sprint 1 | CPF/CNPJ/senhas SGW no IDB sem criptografia | `S.enc()` antes de `db.save()`, `S.dec()` ao ler |
| 🟠 Sprint 1 | Sem autenticação | Token simples em localStorage + pin de acesso na Settings |
| 🟡 Sprint 2 | CDN `cdnjs` sem SRI `integrity=` | Adicionar `integrity` + `crossorigin="anonymous"` |

---

## Frontend Design — SGW Pro Hub (Direção Estética)

Baseado na skill `frontend-design` + decisões confirmadas em `bug.md`:

- **Paleta:** Cyan `#22d3ee` → Violet `#a78bfa` (Linear-inspired gradient) — comprometido, não tímido
- **Tipografia:** Bebas Neue (display) + Chivo 900 (headings) + Inter 400/500 (body) — já instalados
- **Layout Hub:** Bento Grid assimétrico — cards de tamanhos variados, não grid uniforme
- **Efeito de fundo:** Noise texture SVG + gradient mesh Cyan/Violet + sutil grain overlay
- **Animação:** stagger fadeUp (.af .d1–d8) para cards do bento; typing animation no hero
- **Diferencial visual:** borda de gradiente animada nos cards de sistema (border-image animation)
