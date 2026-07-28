/**
 * prisma.ts — Singleton Prisma client for AuraHR.
 *
 * Prisma 7 requires a driver adapter for all databases. For MySQL/MariaDB,
 * Prisma's officially supported package is @prisma/adapter-mariadb (there is
 * no separate @prisma/adapter-mysql — MariaDB's driver works for both).
 *
 * IMPORTANT: Do not import this file from any browser/client component.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL && typeof window === 'undefined') {
  throw new Error('[prisma.ts] DATABASE_URL is not set in environment variables.');
}

// Parse DATABASE_URL (mysql://user:pass@host:port/database) into discrete
// fields, since PrismaMariaDb takes connection params rather than a raw URL.
function parseConnectionUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ''),
  };
}

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  (DB_URL
    ? new PrismaClient({
        adapter: new PrismaMariaDb({
          ...parseConnectionUrl(DB_URL),
          connectionLimit: 10,
        }),
      })
    : (() => { throw new Error('[prisma.ts] Cannot create PrismaClient: DATABASE_URL is not set.'); })()
  );

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;