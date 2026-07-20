export interface WithdrawalRequest {
    id: string;
    user_id: string;
    amount: number;
    status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'rejected';
    requested_at: Date;
    settled_at: Date | null;
}
