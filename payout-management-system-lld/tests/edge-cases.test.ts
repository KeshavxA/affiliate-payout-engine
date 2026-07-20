import request from 'supertest';
import app from '../src/index.js';
import { db } from '../src/db.js';

describe('Edge Cases (Step 4)', () => {
    const userId = 'test_user_edge';

    beforeAll(() => {
        // Clear DB for predictable tests
        db.exec('DELETE FROM payout_transactions');
        db.exec('DELETE FROM withdrawal_requests');
        db.exec('DELETE FROM sales');
        db.exec('DELETE FROM user_balances');
        db.exec(`INSERT INTO users (id, name) VALUES ('${userId}', 'Edge Case User') ON CONFLICT DO NOTHING`);
    });

    it('Negative/zero earning sales rejected cleanly (400)', async () => {
        const res = await request(app)
            .post('/sales')
            .send({ userId, brand: 'brand_1', earning: 0 });
        expect(res.status).toBe(400);
        expect(res.body.error).toContain("Earning must be greater than 0");
    });

    let saleId: string;
    it('Concurrent advance-payout runs & idempotency', async () => {
        // Create a valid sale
        const saleRes = await request(app)
            .post('/sales')
            .send({ userId, brand: 'brand_1', earning: 33.33 }); 
        expect(saleRes.status).toBe(201);
        saleId = saleRes.body.id;

        // Run concurrently
        const results = await Promise.all([
            request(app).post('/payouts/advance/run').send({ userId }),
            request(app).post('/payouts/advance/run').send({ userId }),
            request(app).post('/payouts/advance/run').send({ userId })
        ]);

        results.forEach(res => expect(res.status).toBe(200));

        // Check balance (only one advance should apply)
        const balRes = await request(app).get(`/users/${userId}/balance`);
        expect(balRes.body.withdrawable_balance).toBe(3.33); // 10% of 33.33 = 3.33
    });

    it('Reconciling a sale already approved -> 409', async () => {
        // First reconcile -> OK
        let res = await request(app).patch(`/sales/${saleId}/reconcile`).send({ status: 'approved' });
        expect(res.status).toBe(200);

        // Second reconcile -> 409 Conflict
        res = await request(app).patch(`/sales/${saleId}/reconcile`).send({ status: 'rejected' });
        expect(res.status).toBe(409);
        expect(res.body.error).toContain("already reconciled");
    });

    it('Reconciling a sale that never got an advance -> works', async () => {
        // Create new sale
        const saleRes = await request(app)
            .post('/sales')
            .send({ userId, brand: 'brand_2', earning: 50.00 });
        const newSaleId = saleRes.body.id;

        // We DO NOT run advance payout
        
        // Reconcile it directly
        const res = await request(app).patch(`/sales/${newSaleId}/reconcile`).send({ status: 'approved' });
        expect(res.status).toBe(200);

        // Balance: previous 3.33 + (33.33 - 3.33 = 30) + (50 - 0 = 50) = 83.33
        const balRes = await request(app).get(`/users/${userId}/balance`);
        expect(balRes.body.withdrawable_balance).toBe(83.33);
    });

    it('Withdrawal request when balance insufficient -> 400', async () => {
        const res = await request(app)
            .post('/withdrawals')
            .send({ userId, amount: 9000 }); 
        expect(res.status).toBe(400);
        expect(res.body.error).toContain("insufficient balance");
    });

    let txId: string;
    it('Withdrawal request success & within 24h -> 409', async () => {
        // First withdrawal
        let res = await request(app)
            .post('/withdrawals')
            .send({ userId, amount: 10 });
        expect(res.status).toBe(201);

        // Try immediately again
        res = await request(app)
            .post('/withdrawals')
            .send({ userId, amount: 5 });
        expect(res.status).toBe(409);
        expect(res.body.error).toContain("wait 24 hours");

        // Grab the transaction ID for the failed test
        const txsRes = await request(app).get(`/users/${userId}/transactions`);
        const tx = txsRes.body.find((t: any) => t.type === 'withdrawal' && t.status === 'pending');
        txId = tx.id;
    });

    it('Failed payout -> amount returns to balance and can be withdrawn again', async () => {
        // Balance before failed tx outcome: 83.33 - 10 = 73.33
        const balBefore = await request(app).get(`/users/${userId}/balance`);
        expect(balBefore.body.withdrawable_balance).toBe(73.33);

        // Mark it as failed
        const res = await request(app).patch(`/withdrawals/dummy-id/status`).send({
            status: 'failed',
            transactionId: txId
        });
        expect(res.status).toBe(200);

        // Balance should be refunded: 73.33 + 10 = 83.33
        const balAfter = await request(app).get(`/users/${userId}/balance`);
        expect(balAfter.body.withdrawable_balance).toBe(83.33);

        // We should be able to withdraw again immediately
        const retryRes = await request(app).post('/withdrawals').send({ userId, amount: 10 });
        expect(retryRes.status).toBe(201);
    });
});
