import type { Database } from 'better-sqlite3';
import type { WithdrawalRequest } from '../entities/WithdrawalRequest.js';

export class WithdrawalRepository {
    constructor(private db: Database) {}

    findById(id: string): WithdrawalRequest | undefined {
        return this.db.prepare(`SELECT * FROM withdrawal_requests WHERE id = ?`).get(id) as WithdrawalRequest | undefined;
    }

    updateStatus(id: string, status: string): void {
        this.db.prepare(`UPDATE withdrawal_requests SET status = ?, settled_at = CURRENT_TIMESTAMP WHERE id = ?`).run(status, id);
    }
}
