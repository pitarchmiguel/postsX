import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

let connectionString =
  process.env.DATABASE_URL ??
  process.env.DIRECT_URL ??
  "postgresql://localhost:5432/postgres";

// Supabase pooler (port 6543) requires pgbouncer=true for Prisma compatibility
if (
  connectionString.includes("pooler.supabase.com") &&
  !connectionString.includes("pgbouncer=true")
) {
  connectionString +=
    (connectionString.includes("?") ? "&" : "?") + "pgbouncer=true";
}

const adapter = new PrismaPg({ connectionString });

const prismaClientSingleton = () => new PrismaClient({ adapter });

declare global {
  // eslint-disable-next-line no-var
  var prisma: ReturnType<typeof prismaClientSingleton> | undefined;
}

export const db = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prisma = db;
