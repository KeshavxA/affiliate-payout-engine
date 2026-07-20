import type { Database } from 'better-sqlite3';
import type { UserBalance } from '../entities/UserBalance.js';

export class UserBalanceRepository {
    constructor(private db: Database) {}

    createOrUpdate(balance: UserBalance): void {
        // TODO: Implement upsert
    }

    findByUserId(userId: string): UserBalance | undefined {
        // TODO: Implement select by user_id
        return undefined;
    }
}
