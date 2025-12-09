import { testController } from '../controllers/test.controller';
import { interpretFormController } from '../controllers/interpret-form.controller';

export const router = {
	async handler(req: Request): Promise<Response> {
		const url = new URL(req.url);

		if (url.pathname === '/api/test') {
			return testController(req);
		}

		if (url.pathname === '/api/form/interpret' && req.method === 'POST') {
			return interpretFormController(req);
		}

		return new Response('Not Found', { status: 404 });
	},
};
