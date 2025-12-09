export async function testController(req: Request): Promise<Response> {
	return new Response('test endpoint!');
}
