import type { Database } from 'better-sqlite3';

export class FailedPayoutRecoveryService {
    constructor(private db: Database) {}

    markPayoutOutcome(transactionId: string, outcome: 'cancelled' | 'rejected' | 'failed' | 'completed'): void {
        const runTransaction = this.db.transaction(() => {
            const txStmt = this.db.prepare(`
                SELECT id, user_id, type, amount, status FROM payout_transactions WHERE id = ?
            `);
            const tx = txStmt.get(transactionId) as { id: string; user_id: string; type: string; amount: number; status: string } | undefined;

            if (!tx) {
                throw new Error(`Transaction ${transactionId} not found.`);
            }

            if (tx.status !== 'pending') {
                throw new Error(`Transaction ${transactionId} is already resolved with status '${tx.status}'.`);
            }

            // Update transaction status
            const updateTxStmt = this.db.prepare(`
                UPDATE payout_transactions 
                SET status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND status = 'pending'
            `);
            const updateResult = updateTxStmt.run(outcome, transactionId);

            if (updateResult.changes === 0) {
                throw new Error(`Transaction ${transactionId} was modified concurrently.`);
            }

            // Refund logic for failed withdrawals
            if (tx.type === 'withdrawal' && (outcome === 'cancelled' || outcome === 'rejected' || outcome === 'failed')) {
                const updateBalanceStmt = this.db.prepare(`
                    UPDATE user_balances 
                    SET withdrawable_balance = withdrawable_balance + ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ?
                `);
                // Note: We do NOT reset last_withdrawal_at here so the user isn't unfairly blocked from a retry.
                updateBalanceStmt.run(tx.amount, tx.user_id);
            }
        });

        runTransaction.immediate();
    }
}
