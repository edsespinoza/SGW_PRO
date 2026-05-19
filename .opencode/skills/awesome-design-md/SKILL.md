---
name: awesome-design-md
description: Use when the user wants to build UI inspired by a known brand, apply a design system from a real website, or create a DESIGN.md for their own project. Wraps the VoltAgent/awesome-design-md collection of 70+ DESIGN.md files from brands like Stripe, Linear, Vercel, Apple, Notion, Supabase, Figma, and more.
license: MIT
compatibility: opencode, claude-code, cursor
---

## How to Use

1. Identify the brand the user wants (e.g. "Stripe", "Linear", "Vercel", "Apple", "Notion").
2. Fetch the brand's DESIGN.md from the GitHub raw URL:
   ```
   https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/{brand}/DESIGN.md
   ```
3. Extract the exact design tokens: colors (hex), fonts, spacing, radius, shadow, component patterns, voice.
4. Apply the tokens to the target UI — new component, page, or re-skin of existing code.

## Supported Brands (70+)

Fetch by slug. Use `design-md/{slug}/DESIGN.md` in the repo URL.

Popular: stripe, vercel, linear, notion, apple, supabase, figma, claude, cursor, expo, mongodb, spotify, airbnb, tesla, coinbase, sentry, posthog, raycast, warp, cal, resend, replicate, zapier, uber, nvidia, ibm, framer, sanity, runwayml, elevenlabs, miro, mintlify, webflow, together-ai, superhuman, ollama, opencode-ai, kraken, composio, clay, lovable, minimax, cohere, mistral-ai, hashicorp, clickhouse, pinterest, intercom, ferrari, lamborghini, bmw, renault, revolut, wise, spacex, voltagent, x-ai, doordash, opensea, linktree

## Workflow

1. If brand is unknown, ask which brand or suggest the closest match from the list.
2. Always read the actual DESIGN.md before generating UI — do not invent tokens.
3. When mixing brand tokens with existing project code, keep structural conventions (file layout, component API) and swap only visual tokens.
4. If the requested brand is not in the collection, say so and suggest the closest alternative.
