export interface Sale {
    id: string;
    user_id: string;
    brand: 'brand_1' | 'brand_2' | 'brand_3';
    earning: number;
    status: 'pending' | 'approved' | 'rejected';
    advance_paid: number;
    advance_paid_at: Date | null;
    reconciled_at: Date | null;
    created_at: Date;
    updated_at: Date;
}
