export interface UserBalance {
    user_id: string;
    withdrawable_balance: number;
    last_withdrawal_at: Date | null;
    updated_at: Date;
}
