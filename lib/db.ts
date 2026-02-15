import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

let connectionString =
  process.env.DATABASE_URL ??
  process.env.DIRECT_URL ??
  "postgresql://localhost:5432/postgres";

// Supabase: optimize for serverless to avoid circuit breaker / connection exhaustion
if (
  connectionString.includes("supabase.com") ||
  connectionString.includes("supabase.co")
) {
  const sep = connectionString.includes("?") ? "&" : "?";
  const extra: string[] = [];
  // Pooler (port 6543) needs pgbouncer=true for Prisma
  if (
    connectionString.includes("pooler.supabase.com") &&
    !connectionString.includes("pgbouncer=")
  )
    extra.push("pgbouncer=true");
  if (!connectionString.includes("connection_limit="))
    extra.push("connection_limit=1");
  if (extra.length) connectionString += sep + extra.join("&");
}

const adapter = new PrismaPg({ connectionString });

const prismaClientSingleton = () => new PrismaClient({ adapter });

declare global {
  // eslint-disable-next-line no-var
  var prisma: ReturnType<typeof prismaClientSingleton> | undefined;
}

export const db = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prisma = db;
