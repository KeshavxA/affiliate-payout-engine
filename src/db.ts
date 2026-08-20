import DatabaseConstructor from 'better-sqlite3';
import type { Database } from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The initialized better-sqlite3 database instance.
 */
export const db: Database = new DatabaseConstructor(process.env.DATABASE_URL || './payouts.db');

/**
 * Initializes the database schema using the definitions in db/schema.sql.
 */
export function initDb(): void {
    const schemaSql = readFileSync(join(process.cwd(), 'db', 'schema.sql'), 'utf-8');
    db.exec(schemaSql);
}
