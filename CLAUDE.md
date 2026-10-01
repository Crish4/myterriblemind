# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

UNSORTED: an infinite canvas ("everything I didn't know where to put") built on Next.js 15 (App Router), React 19 and tldraw 5, synced across devices with `@tldraw/sync` running on a Cloudflare Worker. The README says the lack of organization is intentional ("the mess is the product"), so don't add structure, folders or sorting features unless asked. tldraw runs under a **hobby (non-commercial) license**: the "made with tldraw" watermark must stay visible, so never hide it with CSS or components.

## Commands

Requires Node.js 20+. Two separate npm projects: the Next.js app at the root (deployed to Vercel at https://myterriblemind.vercel.app) and `sync-worker/` (deployed to Cloudflare).

```bash
npm run dev                         # app on :3000 (needs NEXT_PUBLIC_SYNC_URL in .env.local)
npm run build                       # production build; also the app's type-check
npm --prefix sync-worker run dev    # worker on :8787 (needs SYNC_PASSPHRASE in sync-worker/.dev.vars)
npm --prefix sync-worker run typecheck
npm --prefix sync-worker run deploy
npm --prefix sync-worker run types  # regenerate worker-configuration.d.ts after editing wrangler.toml
```

There are no lint or test scripts. `sync-worker` is excluded from the root tsconfig. Client and worker `tldraw`/`@tldraw/*` versions must stay in lockstep or the sync protocol breaks.

## Architecture

- **Client (`app/canvas.tsx`, `app/sync.ts`):** a `"use client"` component that renders only after mount. Without a stored passphrase (`localStorage["unsorted-passphrase"]`) it shows `PassphraseGate`, which validates against `/api/auth-check`. With one, `SyncedCanvas` connects through `useSync` to the single room `ROOM_ID = "unsorted"`. There is no local persistence layer any more; the server is the source of truth.
- **Auth:** one shared secret, `SYNC_PASSPHRASE` (a Wrangler secret). HTTP calls send `Authorization: Bearer`. WebSocket connects can't set headers, so they pass `?token=`. The worker also rejects WebSocket upgrades from origins not in `ALLOWED_ORIGINS` (a var in `wrangler.toml`, overridable in `.dev.vars`). Asset **downloads** are deliberately unauthenticated (unguessable ids) so `<img src>` works; uploads and unfurls need the token.
- **Worker (`sync-worker/src`):** `worker.ts` handles routing, CORS and auth. `TldrawDurableObject.ts` (copied from tldraw's `tldraw-sync-cloudflare` template) keeps the room in Durable Object SQLite using WebSocket hibernation. `assetUploads.ts` stores images and videos in R2. Custom shapes would need adding to both the worker schema and the client.
- **Legacy migration:** before sync, boards lived in `localStorage["unsorted-canvas-v1"]`. On first connect, `offerLegacyBoard` offers to load that board into the room, but only if the room has no shapes.
- **tldraw UI trimming:** the `components` prop sets most of tldraw's chrome to `null`. The app's own overlay (brand, top-right actions, help, hint and sync status) is absolutely positioned over `.canvas`.
- **Styling:** plain CSS in `app/globals.css`. `.tl-container`'s background is forced to transparent so the dotted paper background shows through. `colorScheme="light"`.
