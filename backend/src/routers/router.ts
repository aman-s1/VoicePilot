import { testController } from "../controllers/test.controller";
export const router = {
  async handler(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if(url.pathname === "/api/test") {
      return testController(req);
    }

    return new Response("Not Found", { status: 404 });
  }
}