/**
 * Represents a request made by a user to withdraw funds.
 */
export interface WithdrawalRequest {
    readonly id: string;
    readonly user_id: string;
    readonly amount: number;
    readonly status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'rejected';
    readonly requested_at: Date;
    readonly settled_at: Date | null;
}
