import type { Database } from 'better-sqlite3';
import type { WithdrawalRequest } from '../entities/WithdrawalRequest.js';

/**
 * Repository for managing WithdrawalRequest entities.
 */
export class WithdrawalRepository {
    constructor(private readonly db: Database) {}

    /**
     * Retrieves a withdrawal request by its ID.
     */
    findById(id: string): WithdrawalRequest | undefined {
        return this.db.prepare(`SELECT * FROM withdrawal_requests WHERE id = ?`).get(id) as WithdrawalRequest | undefined;
    }

    /**
     * Updates the status of a withdrawal request and records the settlement time.
     */
    updateStatus(id: string, status: string): void {
        this.db.prepare(`UPDATE withdrawal_requests SET status = ?, settled_at = CURRENT_TIMESTAMP WHERE id = ?`).run(status, id);
    }

    /**
     * Retrieves all withdrawal requests for a given user, ordered by most recent first.
     */
    findByUserId(userId: string): WithdrawalRequest[] {
        return this.db.prepare(`SELECT * FROM withdrawal_requests WHERE user_id = ? ORDER BY requested_at DESC`).all(userId) as WithdrawalRequest[];
    }
}
