import type { Database } from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { InsufficientBalanceError } from '../errors/InsufficientBalanceError.js';
import { WithdrawalCooldownError } from '../errors/WithdrawalCooldownError.js';

export class WithdrawalService {
    constructor(private db: Database) {}

    requestWithdrawal(userId: string, amount: number): void {
        const runTransaction = this.db.transaction(() => {
            // 1. Fetch balance and last_withdrawal_at
            const balanceStmt = this.db.prepare(
                `SELECT withdrawable_balance, last_withdrawal_at FROM user_balances WHERE user_id = ?`
            );
            const balance = balanceStmt.get(userId) as { withdrawable_balance: number; last_withdrawal_at: string | null } | undefined;

            // 2. Check sufficient balance
            if (!balance || balance.withdrawable_balance < amount) {
                throw new InsufficientBalanceError(`User ${userId} has insufficient balance for withdrawal of ${amount}.`);
            }

            // 3. Check 24h cooldown
            if (balance.last_withdrawal_at) {
                // SQLite DATETIME values are 'YYYY-MM-DD HH:MM:SS' strings when fetched directly (or ISO strings depending on how inserted).
                // Our schema inserts CURRENT_TIMESTAMP which is 'YYYY-MM-DD HH:MM:SS' in UTC. We append 'Z' for safe JS Date parsing.
                const lastWithdrawalString = balance.last_withdrawal_at.endsWith('Z') 
                    ? balance.last_withdrawal_at 
                    : balance.last_withdrawal_at + 'Z';
                
                const lastWithdrawal = new Date(lastWithdrawalString).getTime();
                const now = Date.now();
                const ONE_DAY_MS = 24 * 60 * 60 * 1000;

                if (now - lastWithdrawal < ONE_DAY_MS) {
                    throw new WithdrawalCooldownError(`User ${userId} must wait 24 hours between withdrawals.`);
                }
            }

            // 4. Create withdrawal_requests row
            const insertWithdrawalStmt = this.db.prepare(`
                INSERT INTO withdrawal_requests (
                    id, user_id, amount, status, requested_at, settled_at
                ) VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP, NULL)
            `);
            insertWithdrawalStmt.run(randomUUID(), userId, amount);

            // 5. Create payout_transactions row
            const insertTransactionStmt = this.db.prepare(`
                INSERT INTO payout_transactions (
                    id, user_id, type, amount, status, related_sale_id, created_at, updated_at
                ) VALUES (?, ?, 'withdrawal', ?, 'pending', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `);
            insertTransactionStmt.run(randomUUID(), userId, amount);

            // 6. Debit balance and set last_withdrawal_at
            const updateBalanceStmt = this.db.prepare(`
                UPDATE user_balances 
                SET withdrawable_balance = withdrawable_balance - ?,
                    last_withdrawal_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `);
            updateBalanceStmt.run(amount, userId);
        });

        // Use IMMEDIATE to prevent deadlocks under high concurrency
        runTransaction.immediate();
    }
}
