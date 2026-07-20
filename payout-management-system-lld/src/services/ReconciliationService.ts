import type { Database } from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { NotFoundError } from '../errors/NotFoundError.js';
import { ConflictError } from '../errors/ConflictError.js';

export class ReconciliationService {
    constructor(private db: Database) {}

    reconcileSale(saleId: string, newStatus: 'approved' | 'rejected'): void {
        const runTransaction = this.db.transaction(() => {
            // 1. Fetch sale ensuring it is still 'pending'
            const saleStmt = this.db.prepare(
                `SELECT id, user_id, earning, advance_paid, status FROM sales WHERE id = ? AND status = 'pending'`
            );
            const sale = saleStmt.get(saleId) as { id: string; user_id: string; earning: number; advance_paid: number; status: string } | undefined;

            if (!sale) {
                // Sale might exist but not be pending, or not exist at all.
                // For simplicity, we treat "already reconciled" as a Conflict and "not found" as NotFound.
                // To do this cleanly, we can check if it exists at all.
                const exists = this.db.prepare(`SELECT status FROM sales WHERE id = ?`).get(saleId) as { status: string } | undefined;
                if (!exists) {
                    throw new NotFoundError(`Sale ${saleId} not found.`);
                } else {
                    throw new ConflictError(`Sale ${saleId} is already reconciled (${exists.status}).`);
                }
            }

            // 2. Compute final adjustment
            let adjustment = 0;
            if (newStatus === 'approved') {
                adjustment = sale.earning - sale.advance_paid;
            } else if (newStatus === 'rejected') {
                adjustment = -sale.advance_paid;
            }

            // Ensure 2 decimal precision
            adjustment = Number(adjustment.toFixed(2));

            // 3. Update sale status safely
            const updateSaleStmt = this.db.prepare(`
                UPDATE sales 
                SET status = ?, 
                    reconciled_at = CURRENT_TIMESTAMP, 
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND status = 'pending'
            `);
            const updateResult = updateSaleStmt.run(newStatus, sale.id);

            // Safety check against concurrent modifications
            if (updateResult.changes === 0) {
                throw new ConflictError(`Sale ${saleId} was modified concurrently and is no longer pending.`);
            }

            // 4. Record payout_transactions row
            const insertTransactionStmt = this.db.prepare(`
                INSERT INTO payout_transactions (
                    id, user_id, type, amount, status, related_sale_id, created_at, updated_at
                ) VALUES (?, ?, 'final_settlement', ?, 'completed', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `);
            insertTransactionStmt.run(randomUUID(), sale.user_id, adjustment, sale.id);

            // 5. Update user_balances
            const upsertBalanceStmt = this.db.prepare(`
                INSERT INTO user_balances (user_id, withdrawable_balance, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id) DO UPDATE SET 
                    withdrawable_balance = withdrawable_balance + ?,
                    updated_at = CURRENT_TIMESTAMP
            `);
            upsertBalanceStmt.run(sale.user_id, adjustment, adjustment);
        });

        // Use IMMEDIATE transaction to avoid deadlocks/busy waits during concurrent writes
        runTransaction.immediate();
    }
}
