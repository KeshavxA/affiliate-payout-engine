import type { Database } from 'better-sqlite3';
import type { Sale } from '../entities/Sale.js';

export class SaleRepository {
    constructor(private db: Database) {}

    create(sale: Sale): void {
        const stmt = this.db.prepare(`
            INSERT INTO sales (id, user_id, brand, earning, status, advance_paid, advance_paid_at, reconciled_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
            sale.id, sale.user_id, sale.brand, sale.earning, sale.status, 
            sale.advance_paid, 
            sale.advance_paid_at ? sale.advance_paid_at.toISOString() : null,
            sale.reconciled_at ? sale.reconciled_at.toISOString() : null,
            sale.created_at.toISOString(),
            sale.updated_at.toISOString()
        );
    }

    find(userId?: string, status?: string): Sale[] {
        let query = 'SELECT * FROM sales WHERE 1=1';
        const params: any[] = [];
        if (userId) {
            query += ' AND user_id = ?';
            params.push(userId);
        }
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        query += ' ORDER BY created_at DESC';
        return this.db.prepare(query).all(...params) as Sale[];
    }
}
