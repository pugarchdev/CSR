/**
 * Structured single-line JSON logger for the verification module.
 * Repo convention is console logging (captured by Vercel); this adds
 * machine-parseable structure and correlation IDs without new deps.
 *
 * NEVER pass Aadhaar numbers, OTPs, or raw API payloads into this logger.
 */

type LogLevel = "info" | "warn" | "error";

interface LogFields {
  correlationId?: string;
  [key: string]: unknown;
}

const emit = (level: LogLevel, message: string, fields: LogFields = {}) => {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    module: "verification",
    message,
    ...fields
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
};

export const logger = {
  info: (message: string, fields?: LogFields) => emit("info", message, fields),
  warn: (message: string, fields?: LogFields) => emit("warn", message, fields),
  error: (message: string, fields?: LogFields) => emit("error", message, fields)
};
