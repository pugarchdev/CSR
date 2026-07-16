import type { IncomingMessage, ServerResponse } from "http";
import { applyCorsHeaders } from "../src/config/cors";
import app from "../src/app";

type ExpressHandler = (req: IncomingMessage, res: ServerResponse) => unknown;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const expressApp = app as unknown as ExpressHandler;
    return expressApp(req, res);
  } catch (error) {
    console.error("API startup failed:", error);
    applyCorsHeaders(req, res);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ 
      error: "API startup failed",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }));
  }
}
