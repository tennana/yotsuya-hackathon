# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Configuration

- **Language**: TypeScript
- **Package Manager**: pnpm
- **Framework**: SvelteKit (Svelte 5, runes mode enforced for all non-`node_modules` files)
- **Deploy target**: Cloudflare Workers via `@sveltejs/adapter-cloudflare`
- **Styling**: Tailwind CSS v4 (configured via Vite plugin — no `tailwind.config.js`)
- **Backend**: Supabase (auth, database, storage)
- **AI**: OpenAI SDK
- **Validation**: Zod

## Common Commands

```sh
pnpm dev          # start dev server
pnpm build        # wrangler types check + vite build
pnpm preview      # preview production build via wrangler (port 4173)
pnpm check        # wrangler types check + svelte-kit sync + svelte-check
pnpm check:watch  # svelte-check in watch mode
pnpm lint         # prettier --check + eslint
pnpm format       # prettier --write
pnpm gen          # regenerate wrangler Cloudflare environment types (Env)
```

There is no test suite configured yet.

## Architecture

### Cloudflare Workers + SvelteKit

The app deploys as a Cloudflare Worker. The `wrangler.jsonc` points at `.svelte-kit/cloudflare/_worker.js`. Cloudflare-specific bindings (KV, R2, AI, etc.) are declared in `wrangler.jsonc` and become available via `platform.env` in SvelteKit load functions and API routes. After adding a binding, run `pnpm gen` to regenerate `Env` types, which flow into `App.Platform` in `src/app.d.ts`.

### Svelte 5 Runes

Runes mode is enabled globally (`svelte.config.js` sets `runes: true` for all non-`node_modules` files). Use `$state`, `$derived`, `$effect`, `$props`, `$bindable`, etc. — the legacy Options API (`export let`, `$:`, `createEventDispatcher`) must not be used.

### Supabase Integration

Supabase is used for auth, database, and storage. The `supabase/` directory contains local dev config (`config.toml`) and seed files. When integrating with SvelteKit SSR, use `@supabase/ssr` (already installed) to create server-side clients that read cookies from the `RequestEvent`.

## Svelte MCP Tools

The Svelte MCP server provides comprehensive Svelte 5 / SvelteKit documentation. Use these tools in this order:

### 1. list-sections
Use **first** to discover all available documentation sections. Always call this when starting a Svelte/SvelteKit task.

### 2. get-documentation
Fetch full docs for sections identified by `list-sections`. After calling `list-sections`, analyze `use_cases` and fetch **all** relevant sections.

### 3. svelte-autofixer
Analyzes Svelte code for issues. **Must be called on every Svelte file before sending it to the user.** Keep calling until no issues or suggestions remain.

### 4. playground-link
Generates a Svelte Playground link. Only call after explicit user confirmation, and **never** when code has been written to project files.
