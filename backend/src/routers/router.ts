import { testController } from '../controllers/test.controller';
import { interpretFormController } from '../controllers/interpret-form.controller';
export const router = {
	async handler(req: Request, env: Env): Promise<Response> {
		const url = new URL(req.url);

		// 1. CORS Headers
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		};

		// 2. Handle Preflight Options
		if (req.method === 'OPTIONS') {
			return new Response(null, {
				headers: corsHeaders,
			});
		}

		let response: Response;

		if (url.pathname === '/api/test') {
			response = await testController(req);
		} else if (url.pathname === '/api/interpret-form' && req.method === 'POST') {
			response = await interpretFormController(req, env);
		} else {
			response = new Response('Not Found', { status: 404 });
		}

		// 3. Attach CORS headers to actual response
		Object.entries(corsHeaders).forEach(([key, value]) => {
			response.headers.set(key, value);
		});

		return response;
	},
};
