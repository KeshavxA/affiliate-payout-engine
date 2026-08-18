/**
 * Represents a sale tracked for an affiliate user.
 */
export interface Sale {
    readonly id: string;
    readonly user_id: string;
    readonly brand: 'brand_1' | 'brand_2' | 'brand_3';
    readonly earning: number;
    readonly status: 'pending' | 'approved' | 'rejected';
    readonly advance_paid: number;
    readonly advance_paid_at: Date | null;
    readonly reconciled_at: Date | null;
    readonly created_at: Date;
    readonly updated_at: Date;
}
