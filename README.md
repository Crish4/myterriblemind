# UNSORTED

A local-first infinite canvas for thoughts, drawings, images and beautiful chaos.

## Run locally

Requirements:
- Node.js 20+

Then:

```bash
npm install
npm run dev
```

Open http://localhost:3000

## What is included

- Infinite canvas
- Pan and zoom
- Text
- Sticky notes
- Freehand drawing
- Shapes
- Arrows
- Images
- Links
- Drag / resize / rotate
- Undo / redo
- Sync across devices (tldraw sync on Cloudflare), unlocked with a passphrase
- JSON export/import

The canvas is intentionally not organized. The mess is the product.

## Data & sync

The board lives in a Cloudflare Durable Object (one room, `unsorted`); images and videos live in an R2 bucket. Every device that knows the passphrase sees and edits the same board live. Export a JSON backup periodically anyway.

### One-time setup

1. Get a tldraw hobby license key: https://tldraw.dev/get-a-license/hobby (non-commercial; the "made with tldraw" watermark must stay visible).
2. Deploy the sync worker (needs a free Cloudflare account):

   ```bash
   cd sync-worker
   npm install
   npx wrangler login
   npx wrangler r2 bucket create unsorted-assets
   npx wrangler secret put SYNC_PASSPHRASE
   npm run deploy
   ```

   Note the `https://unsorted-sync.<you>.workers.dev` URL it prints.
3. In Vercel → Project → Settings → Environment Variables, add `NEXT_PUBLIC_SYNC_URL` (the worker URL) and `NEXT_PUBLIC_TLDRAW_LICENSE_KEY`, then redeploy.

### Local development

```bash
echo 'SYNC_PASSPHRASE=pick-something' > sync-worker/.dev.vars
npm --prefix sync-worker run dev          # worker on :8787
echo 'NEXT_PUBLIC_SYNC_URL=http://localhost:8787' > .env.local
npm run dev                               # app on :3000
```

## Next steps

Possible future additions:
- Better custom visual language for objects
- Paste images directly from clipboard
- Custom paper/marker tools
- Image drop zone
- Rich text controls
- Search without imposing organization
- Chaos mode
- Export as a poster/image
