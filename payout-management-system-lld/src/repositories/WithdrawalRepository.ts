import type { Database } from 'better-sqlite3';
import type { WithdrawalRequest } from '../entities/WithdrawalRequest.js';

export class WithdrawalRepository {
    constructor(private db: Database) {}

    create(request: WithdrawalRequest): void {
        // TODO: Implement insert
    }

    findById(id: string): WithdrawalRequest | undefined {
        // TODO: Implement select by id
        return undefined;
    }

    update(id: string, updates: Partial<WithdrawalRequest>): void {
        // TODO: Implement update
    }
}
