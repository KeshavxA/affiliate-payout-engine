import type { Database } from 'better-sqlite3';
import type { UserBalance } from '../entities/UserBalance.js';

/**
 * Repository for accessing user balances.
 */
export class UserBalanceRepository {
    constructor(private readonly db: Database) {}

    /**
     * Retrieves the balance for a given user.
     */
    findByUserId(userId: string): UserBalance | undefined {
        return this.db.prepare(`SELECT * FROM user_balances WHERE user_id = ?`).get(userId) as UserBalance | undefined;
    }
}
