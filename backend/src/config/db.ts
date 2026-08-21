import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prismaClient: PrismaClient };

const basePrisma =
  globalForPrisma.prismaClient ||
  new PrismaClient({
    log: [
      { emit: "event", level: "error" },
      { emit: "stdout", level: "warn" },
    ],
    errorFormat: "minimal",
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaClient = basePrisma;
}

// Helper to detect transient PostgreSQL / network connection reset errors
const isConnectionResetError = (err: any): boolean => {
  const msg = String(err?.message || err || "").toLowerCase();
  const code = String(err?.code || "");
  return (
    code === "P1001" ||
    code === "P1002" ||
    code === "P1008" ||
    code === "P1017" ||
    code === "P2024" ||
    msg.includes("10054") ||
    msg.includes("connectionreset") ||
    msg.includes("connection reset") ||
    msg.includes("forcibly closed") ||
    msg.includes("econnreset") ||
    msg.includes("e57p01") ||
    msg.includes("terminating connection") ||
    msg.includes("closed connection") ||
    msg.includes("connection closed") ||
    msg.includes("connection lost") ||
    msg.includes("can't reach database server") ||
    msg.includes("server has closed the connection") ||
    msg.includes("broken pipe") ||
    msg.includes("socket hang up") ||
    msg.includes("epipe") ||
    msg.includes("etimedout")
  );
};

// Suppress transient idle socket drop / connection reset logs (handled by query retry middleware)
(basePrisma as any).$on("error", (e: any) => {
  if (isConnectionResetError(e)) {
    // Transient idle socket drop / remote reset — automatically reconnected and retried
    return;
  }
  console.error("[Prisma Engine Error]", e?.message || e);
});

/**
 * Resilient DB Query Extension.
 * Automatically catches serverless / remote connection drop errors (10054 ConnectionReset, E57P01, P1001, P1017, P2024),
 * reconnects Prisma Client, and retries the query with exponential backoff up to 3 times.
 */
export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        let retries = 0;
        const maxRetries = 3;

        while (true) {
          try {
            return await query(args);
          } catch (error: any) {
            const code = String(error?.code || "");
            // Do not retry P2028 inside an already closed/expired interactive transaction
            if (code !== "P2028" && isConnectionResetError(error) && retries < maxRetries) {
              retries++;
              try {
                await basePrisma.$connect().catch(() => {});
              } catch {
                // Suppress error during reconnect attempt
              }
              await new Promise((resolve) => setTimeout(resolve, 200 * retries));
              continue;
            }
            throw error;
          }
        }
      },
    },
  },
});

export default prisma;
