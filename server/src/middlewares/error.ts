import { Request, Response, NextFunction } from "express";
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const code = err.status || 500;
  const message = err.message || "Internal server error";
  if (process.env.NODE_ENV !== "production") console.error(err);
  res.status(code).json({ code, message });
}