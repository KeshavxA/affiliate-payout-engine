import type { Database } from 'better-sqlite3';
import type { Sale } from '../entities/Sale.js';

export class SaleRepository {
    constructor(private db: Database) {}

    create(sale: Sale): void {
        // TODO: Implement insert
    }

    findById(id: string): Sale | undefined {
        // TODO: Implement select by id
        return undefined;
    }

    update(id: string, updates: Partial<Sale>): void {
        // TODO: Implement update
    }

    delete(id: string): void {
        // TODO: Implement delete
    }

    findPendingUnadvanced(userId: string): Sale[] {
        // TODO: Implement query: status='pending' AND advance_paid=0
        return [];
    }
}
