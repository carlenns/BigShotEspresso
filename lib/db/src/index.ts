import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// DATABASE_POOL_MAX caps connections (node-postgres default 10). On Prisma
// Postgres use the pooled URL (pooled.db.prisma.io) and a small cap, e.g. 5,
// to stay inside the plan's connection limit.
const poolMax = Number(process.env.DATABASE_POOL_MAX);
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(Number.isInteger(poolMax) && poolMax > 0 ? { max: poolMax } : {}),
});
export const db = drizzle(pool, { schema });

export * from "./schema";
