// Test-only drop-in for `@workspace/db`, selected by the `pglite-test` export
// condition (see lib/db/package.json and the api-server `test` script).
//
// It exposes the same `db`, `pool`, and schema exports as ../index.ts, but backed
// by an in-memory PGlite database with every forward migration applied. It also
// counts every statement Drizzle issues, so tests can assert how many database
// operations a request costs (relevant to per-operation-billed Postgres hosts).
//
// Never imported by production code: the default export condition still
// resolves to ../index.ts (node-postgres + DATABASE_URL).
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../schema";

export const pglite = new PGlite();

const migrationsDir = fileURLToPath(new URL("../../migrations/", import.meta.url));
for (const file of readdirSync(migrationsDir).filter((f) => /^\d{4}_.*(?<!\.down)\.sql$/.test(f)).sort()) {
  await pglite.exec(readFileSync(migrationsDir + file, "utf8"));
}

let statementCount = 0;
const statements: string[] = [];

/** Statements Drizzle has issued since the last reset (BEGIN/COMMIT excluded). */
export const queryCounter = {
  reset(): void {
    statementCount = 0;
    statements.length = 0;
  },
  get count(): number {
    return statementCount;
  },
  get statements(): readonly string[] {
    return statements;
  },
};

export const db = drizzle(pglite, {
  schema,
  logger: {
    logQuery(query: string) {
      statementCount += 1;
      statements.push(query);
    },
  },
});

/** Minimal `pg.Pool` stand-in for the few raw `pool.query(sql)` callers (runtime schema guard). */
export const pool = {
  async query(sqlText: string, params?: unknown[]) {
    statementCount += 1;
    statements.push(sqlText);
    if (params && params.length > 0) return pglite.query(sqlText, params);
    const results = await pglite.exec(sqlText);
    return results[results.length - 1] ?? { rows: [] };
  },
};

export * from "../schema";
