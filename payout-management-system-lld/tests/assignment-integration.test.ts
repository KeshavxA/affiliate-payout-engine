import request from 'supertest';
import app from '../src/index.js';
import { db } from '../src/db.js';

describe('Assignment Example Integration Test', () => {
    const userId = 'user_assignment_example';

    beforeAll(() => {
        // Clear tables to start fresh
        db.exec('DELETE FROM payout_transactions');
        db.exec('DELETE FROM withdrawal_requests');
        db.exec('DELETE FROM sales');
        db.exec('DELETE FROM user_balances');
        db.exec(`INSERT INTO users (id, name) VALUES ('${userId}', 'Example User') ON CONFLICT DO NOTHING`);
    });

    it('Executes the assignment scenario perfectly', async () => {
        // 1. Create 3 pending sales of ₹40 each
        const sale1 = await request(app).post('/sales').send({ userId, brand: 'brand_1', earning: 40 });
        const sale2 = await request(app).post('/sales').send({ userId, brand: 'brand_1', earning: 40 });
        const sale3 = await request(app).post('/sales').send({ userId, brand: 'brand_1', earning: 40 });
        
        expect(sale1.status).toBe(201);
        
        // 2. Run advance payout job -> advance = ₹12 total (₹4 each)
        await request(app).post('/payouts/advance/run').send({ userId });
        
        let balRes = await request(app).get(`/users/${userId}/balance`);
        expect(balRes.body.withdrawable_balance).toBe(12); // ₹12 total advance

        // 3. Reconcile: 1 rejected, 2 approved
        await request(app).patch(`/sales/${sale1.body.id}/reconcile`).send({ status: 'rejected' });
        await request(app).patch(`/sales/${sale2.body.id}/reconcile`).send({ status: 'approved' });
        await request(app).patch(`/sales/${sale3.body.id}/reconcile`).send({ status: 'approved' });

        // 4. Verify Final adjustments
        // advance: ₹12
        // final payout = -₹4 (clawback) + ₹36 (remainder) + ₹36 (remainder) = ₹68
        // Total Expected Balance = 12 + 68 = 80
        balRes = await request(app).get(`/users/${userId}/balance`);
        expect(balRes.body.withdrawable_balance).toBe(80);
    });
});
