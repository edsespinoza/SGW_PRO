# IEM Tracker — SGW Pro

> Registro de avaliações do Índice de Eficiência do Modelo por sessão.

| Data | Ts | Qs | Cs | IEM | Status | Sessão |
|------|----|----|----|-----|--------|--------|
| 2026-05-14 | 1.0 | 1.0 | 1.0 | 100 | 🟢 EXCELENTE | Correções: QA-OFF1, BUG-004, BUG-008, A11Y-01 + TESTE LOCAL ✅ |

---

## Fórmula

```
IEM = (0,45 × Ts + 0,35 × Qs + 0,20 × Cs) × 100
```

### Critérios

- **Ts** (Tempo/Execução): tarefas concluídas corretamente
- **Qs** (Qualidade): soluções técnicas adequadas
- **Cs** (Comunicação): clareza nas explicações

---

*Atualizado: 2026-05-14*
2026-05-16 � Revis�o UI/UX (index + sgw_pro) � IEM 95 � ?? EXCELENTE
  - index.html: fadeUp 550ms?300ms + prefers-reduced-motion, emojis?SVG, skip link
  - sgw_pro.html: @import?link+display=swap, watchdog emoji?SVG, �?SVG, skip link, ????SVG+aria-label


2026-05-16 � Migra��o Fase 1+2 (Backend + Frontend) � IEM 91 � ?? EXCELENTE
  - Fase 1: api-server/ (Express+PostgreSQL+JWT+AES-256-GCM), sql/init.sql, docker-compose+nginx atualizados, docs/fases
  - Fase 2: APIClient class, LoginPage, auth flow, APP.KEY removido, S.enc/dec no-ops, API-first/IDB-fallback, AGENTS.md atualizado
2026-05-18 � Correção tela preta Clientes (BUG-013) � IEM 88 � ?? EXCELENTE
  - BUG-013: Popover IIFE removida do Clients (ReferenceError: hoveredLic fora de escopo), movida para o Dashboard
  - L.days / L.daysBetween com guards typeof + Number.isNaN (BUG-009, BUG-010)
  - Docker rebuild + deploy verificado via curl
| 2026-05-18 (noturna) | 0.85 | 0.80 | 0.85 | 83 | ✅ BOM | Correções pós-reversão: Tailwind CDN->pre-built CSS, Babel syntax errors, UpArea/Serial restaurados, popover no Dashboard, SW cache bump |

