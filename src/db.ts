import DatabaseConstructor from 'better-sqlite3';
import type { Database } from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

export const db: Database = new DatabaseConstructor(process.env.DATABASE_URL || './payouts.db');

export function initDb() {
    const schemaSql = readFileSync(join(process.cwd(), 'db', 'schema.sql'), 'utf-8');
    db.exec(schemaSql);
}
