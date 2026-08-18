/**
 * Represents the withdrawable balance of a user.
 */
export interface UserBalance {
    readonly user_id: string;
    readonly withdrawable_balance: number;
    readonly last_withdrawal_at: Date | null;
    readonly updated_at: Date;
}
