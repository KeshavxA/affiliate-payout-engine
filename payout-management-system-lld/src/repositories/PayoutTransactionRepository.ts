import type { Database } from 'better-sqlite3';
import type { PayoutTransaction } from '../entities/PayoutTransaction.js';

export class PayoutTransactionRepository {
    constructor(private db: Database) {}

    findByUserId(userId: string): PayoutTransaction[] {
        return this.db.prepare(`SELECT * FROM payout_transactions WHERE user_id = ? ORDER BY created_at DESC`).all(userId) as PayoutTransaction[];
    }
}
