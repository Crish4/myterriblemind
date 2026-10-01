import { handleUnfurlRequest } from 'cloudflare-workers-unfurl'
import { AutoRouter, cors, error, IRequest } from 'itty-router'
import { handleAssetDownload, handleAssetUpload } from './assetUploads'

// make sure our sync durable object is made available to cloudflare
export { TldrawDurableObject } from './TldrawDurableObject'

const allowedOrigins = (env: Env) =>
	env.ALLOWED_ORIGINS.split(',')
		.map((o) => o.trim())
		.filter(Boolean)

// Browsers send Origin on WebSocket upgrades but CORS doesn't apply to them, so check it ourselves.
const requireAllowedOrigin = (request: IRequest, env: Env) => {
	const origin = request.headers.get('origin')
	if (origin && !allowedOrigins(env).includes(origin)) return error(403, 'Forbidden origin')
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const { preflight, corsify } = cors({
			origin: (origin) => (allowedOrigins(env).includes(origin) ? origin : undefined),
			allowHeaders: ['Content-Type'],
			allowMethods: ['GET', 'POST', 'OPTIONS'],
		})

		const router = AutoRouter<IRequest, [env: Env, ctx: ExecutionContext]>({
			before: [preflight],
			finally: [corsify],
			catch: (e) => {
				console.error(e)
				return error(e)
			},
		})
			// realtime websocket syncing for the board, handled by its Durable Object
			.get('/api/connect/:roomId', requireAllowedOrigin, (request, env) => {
				const id = env.TLDRAW_DURABLE_OBJECT.idFromName(request.params.roomId)
				const room = env.TLDRAW_DURABLE_OBJECT.get(id)
				return room.fetch(request.url, { headers: request.headers, body: request.body })
			})

			// images and videos, stored in R2
			.post('/api/uploads/:uploadId', handleAssetUpload)
			.get('/api/uploads/:uploadId', handleAssetDownload)

			// bookmark previews for pasted URLs
			.get('/api/unfurl', handleUnfurlRequest)

			.all('*', () => new Response('Not found', { status: 404 }))

		return router.fetch(request, env, ctx)
	},
}
