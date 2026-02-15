import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

let connectionString =
  process.env.DATABASE_URL ??
  process.env.DIRECT_URL ??
  "postgresql://localhost:5432/postgres";

// Supabase: optimize for serverless to avoid circuit breaker
if (
  connectionString.includes("supabase.com") ||
  connectionString.includes("supabase.co")
) {
  const sep = connectionString.includes("?") ? "&" : "?";
  const extra: string[] = [];
  // Transaction pooler (port 6543) requires pgbouncer=true; Session (5432) does not
  const isTransactionPooler =
    connectionString.includes("pooler.supabase.com") &&
    connectionString.includes(":6543/");
  if (isTransactionPooler && !connectionString.includes("pgbouncer="))
    extra.push("pgbouncer=true");
  if (!connectionString.includes("connection_limit="))
    extra.push("connection_limit=1");
  if (!connectionString.includes("connect_timeout="))
    extra.push("connect_timeout=30");
  if (!connectionString.includes("pool_timeout="))
    extra.push("pool_timeout=30");
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
