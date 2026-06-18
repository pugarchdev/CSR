import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

// Error Middleware
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Express Error Handler:", err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation error",
      details: err.errors.map(e => ({ field: e.path.join("."), message: e.message }))
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";

  return res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {})
  });
};
