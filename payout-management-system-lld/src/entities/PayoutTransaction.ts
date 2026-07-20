export interface PayoutTransaction {
    id: string;
    user_id: string;
    type: 'advance' | 'final_settlement' | 'withdrawal';
    amount: number;
    status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'rejected';
    related_sale_id: string | null;
    created_at: Date;
    updated_at: Date;
}
