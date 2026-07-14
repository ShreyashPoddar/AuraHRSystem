/**
 * prisma.ts — Singleton Prisma client for AuraHR.
 *
 * Prisma 7 uses the "query compiler" engine, which requires a Driver Adapter
 * implementing the DriverAdapter interface. Since @prisma/adapter-mysql is not
 * installed, we build a minimal but complete adapter over the mysql2/promise
 * pool that is already present in node_modules.
 *
 * The adapter exposes the two methods Prisma actually calls at runtime:
 *   - queryRaw / executeRaw (SQL execution)
 *   - startTransaction / getConnectionInfo
 *
 * IMPORTANT: Do not import this file from any browser/client component.
 */

import { PrismaClient } from '@prisma/client';
import mysql from 'mysql2/promise';

// ── Types expected by Prisma 7 DriverAdapter ───────────────────────────────────

type Query = { sql: string; args: unknown[] };
type Result<T> = { ok: true; value: T } | { ok: false; error: Error };

interface ColumnType {
  name: string;
  typeName: string | null;
  isNullable: boolean;
}

interface ResultSet {
  columnNames: string[];
  columnTypes: ColumnType[];
  rows: unknown[][];
}

// ── Build mysql2 pool ──────────────────────────────────────────────────────────

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL && typeof window === 'undefined') {
  throw new Error('[prisma.ts] DATABASE_URL is not set in environment variables.');
}

const pool = DB_URL
  ? mysql.createPool({ uri: DB_URL, waitForConnections: true, connectionLimit: 10 })
  : null;

// ── Minimal DriverAdapter implementation ──────────────────────────────────────

function makeAdapter(p: mysql.Pool) {
  return {
    provider: 'mysql' as const,
    adapterName: '@local/mysql2-adapter',

    async queryRaw(query: Query): Promise<Result<ResultSet>> {
      try {
        const [rows, fields] = await p.query<mysql.RowDataPacket[]>(
          { sql: query.sql, values: query.args as unknown[], rowsAsArray: true }
        );
        const columnNames  = (fields ?? []).map((f: mysql.FieldPacket) => f.name);
        const columnTypes  = (fields ?? []).map((f: mysql.FieldPacket) => ({
          name:       f.name,
          typeName:   String(f.type ?? 'TEXT'),
          isNullable: Boolean(((f.flags as any) ?? 0) & 0x0001),
        }));
        return { ok: true, value: { columnNames, columnTypes, rows: rows as unknown[][] } };
      } catch (e) {
        return { ok: false, error: e as Error };
      }
    },

    async executeRaw(query: Query): Promise<Result<number>> {
      try {
        const [result] = await p.execute<mysql.OkPacket>(query.sql, query.args as unknown[]);
        return { ok: true, value: result.affectedRows ?? 0 };
      } catch (e) {
        return { ok: false, error: e as Error };
      }
    },

    async startTransaction() {
      const conn = await p.getConnection();
      await conn.beginTransaction();
      const txAdapter = {
        provider:    'mysql' as const,
        adapterName: '@local/mysql2-adapter',
        queryRaw:    (q: Query) => makeAdapter(p).queryRaw(q),
        executeRaw:  (q: Query) => makeAdapter(p).executeRaw(q),
        commit:      async () => { await conn.commit(); conn.release(); return { ok: true as const, value: undefined }; },
        rollback:    async () => { await conn.rollback(); conn.release(); return { ok: true as const, value: undefined }; },
      };
      return { ok: true as const, value: txAdapter };
    },

    async getConnectionInfo(): Promise<Result<{ schemaName?: string; maxBindValues?: number }>> {
      return { ok: true, value: { maxBindValues: 65535 } };
    },
  };
}

// ── Singleton pattern ──────────────────────────────────────────────────────────

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  (pool
    ? new PrismaClient({ adapter: makeAdapter(pool) as any })
    : (() => { throw new Error('[prisma.ts] Cannot create PrismaClient: DATABASE_URL is not set.'); })()
  );

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;