import type { Database } from 'better-sqlite3';
import type { UserBalance } from '../entities/UserBalance.js';

export class UserBalanceRepository {
    constructor(private db: Database) {}

    findByUserId(userId: string): UserBalance | undefined {
        return this.db.prepare(`SELECT * FROM user_balances WHERE user_id = ?`).get(userId) as UserBalance | undefined;
    }
}
