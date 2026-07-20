import type { Database } from 'better-sqlite3';
import { randomUUID } from 'crypto';

export class AdvancePayoutService {
    constructor(private db: Database) {}

    runAdvancePayout(userId: string): void {
        const runTransaction = this.db.transaction(() => {
            // 1. Find all pending sales for user where advance_paid = 0
            const pendingSalesStmt = this.db.prepare(
                `SELECT id, earning FROM sales WHERE user_id = ? AND status = 'pending' AND advance_paid = 0`
            );
            const sales = pendingSalesStmt.all(userId) as { id: string; earning: number }[];

            if (sales.length === 0) {
                return; // Idempotent: safe to run multiple times if no sales found
            }

            let totalAdvance = 0;

            const updateSaleStmt = this.db.prepare(`
                UPDATE sales 
                SET advance_paid = ?, 
                    advance_paid_at = CURRENT_TIMESTAMP, 
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND advance_paid = 0
            `);

            const insertTransactionStmt = this.db.prepare(`
                INSERT INTO payout_transactions (
                    id, user_id, type, amount, status, related_sale_id, created_at, updated_at
                ) VALUES (?, ?, 'advance', ?, 'completed', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `);

            for (const sale of sales) {
                // Compute 10% of earning per sale
                const advanceAmount = Number((sale.earning * 0.10).toFixed(2));
                
                // 2. Conditional update: ensures idempotency if run concurrently
                const result = updateSaleStmt.run(advanceAmount, sale.id);
                
                if (result.changes === 1) {
                    totalAdvance += advanceAmount;
                    
                    // 3. Create a payout_transactions row (type=advance) per sale
                    insertTransactionStmt.run(randomUUID(), userId, advanceAmount, sale.id);
                }
            }

            if (totalAdvance > 0) {
                // 4. Credit user_balances.withdrawable_balance using UPSERT
                const upsertBalanceStmt = this.db.prepare(`
                    INSERT INTO user_balances (user_id, withdrawable_balance, updated_at)
                    VALUES (?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(user_id) DO UPDATE SET 
                        withdrawable_balance = withdrawable_balance + ?,
                        updated_at = CURRENT_TIMESTAMP
                `);
                upsertBalanceStmt.run(userId, totalAdvance, totalAdvance);
            }
        });

        // Use EXCLUSIVE/IMMEDIATE transaction to avoid busy conflicts in SQLite with concurrent writes
        runTransaction.immediate();
    }
}
