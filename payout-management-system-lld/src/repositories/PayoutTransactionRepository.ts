import type { Database } from 'better-sqlite3';
import type { PayoutTransaction } from '../entities/PayoutTransaction.js';

export class PayoutTransactionRepository {
    constructor(private db: Database) {}

    create(transaction: PayoutTransaction): void {
        // TODO: Implement insert
    }

    findById(id: string): PayoutTransaction | undefined {
        // TODO: Implement select by id
        return undefined;
    }

    update(id: string, updates: Partial<PayoutTransaction>): void {
        // TODO: Implement update
    }
}
