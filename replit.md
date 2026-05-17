# GTM Research Terminal

A frontend for the `kiterae_gtm_researcher` Blocks agent. Users submit Go-to-Market research queries and receive streaming results from the agent in real time.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/gtm-researcher run dev` — run the frontend (port 23010)
- `pnpm run typecheck` — full typecheck across all packages
- Required env: `BLOCKS_API_KEY` — Blocks Network API key (set in Replit Secrets)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS + shadcn/ui
- Agent SDK: `@blocks-network/sdk` (browser-safe consumer API)
- Markdown: `react-markdown` + `remark-gfm`
- API: Express 5
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/gtm-researcher/src/pages/Home.tsx` — main research interface
- `artifacts/gtm-researcher/src/hooks/use-research.ts` — Blocks SDK integration hook
- `artifacts/api-server/src/routes/blocksToken.ts` — token proxy endpoint (`POST /api/blocks-token`)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (health endpoint only; agent comms are via SDK directly)

## Architecture decisions

- **Token proxy pattern**: Browser SDK uses `tokenEndpoint: '/api/blocks-token'` (Mode 2). The API server holds `BLOCKS_API_KEY` and exchanges it for short-lived JWTs. The key never reaches the browser.
- **CDM config caching**: `blocksBackendUrl` is fetched once from `https://config.blocks.ai/config.json` and cached in memory to avoid repeated config fetches.
- **Client-side streaming**: All real-time communication (PubNub) happens browser-side via the SDK. The server only handles token issuance.
- **Per-session TaskClient**: A fresh `TaskClient` is created for each research session and destroyed when the session completes, following the SDK's resource management guidance.
- **Session history in sidebar**: Completed sessions are kept in React state for the session lifetime. No database needed — sessions are ephemeral.

## Product

Users enter a natural-language Go-to-Market research query. The agent (`kiterae_gtm_researcher`) processes it and streams back progress updates and the final research report. The UI shows a live activity log during research and a formatted markdown report when complete.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `BLOCKS_API_KEY` must be set in Replit Secrets before the token proxy will work.
- The `react-native` peer dependency warning from `@blocks-network/sdk → pubnub` is harmless — it's overridden in the workspace.
- Never expose `BLOCKS_API_KEY` to the browser. Always route through `/api/blocks-token`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
