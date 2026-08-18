/**
 * Represents a transaction that changes the user's balance.
 */
export interface PayoutTransaction {
    readonly id: string;
    readonly user_id: string;
    readonly type: 'advance' | 'final_settlement' | 'withdrawal';
    readonly amount: number;
    readonly status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'rejected';
    readonly related_sale_id: string | null;
    readonly created_at: Date;
    readonly updated_at: Date;
}
