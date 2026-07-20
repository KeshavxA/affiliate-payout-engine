import { Router } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../db.js';
import { SaleRepository } from '../repositories/SaleRepository.js';
import { PayoutTransactionRepository } from '../repositories/PayoutTransactionRepository.js';
import { UserBalanceRepository } from '../repositories/UserBalanceRepository.js';
import { WithdrawalRepository } from '../repositories/WithdrawalRepository.js';
import { AdvancePayoutService } from '../services/AdvancePayoutService.js';
import { ReconciliationService } from '../services/ReconciliationService.js';
import { WithdrawalService } from '../services/WithdrawalService.js';
import { FailedPayoutRecoveryService } from '../services/FailedPayoutRecoveryService.js';
import { NotFoundError } from '../errors/NotFoundError.js';
import { ConflictError } from '../errors/ConflictError.js';
import { ValidationError } from '../errors/ValidationError.js';
import { InsufficientBalanceError } from '../errors/InsufficientBalanceError.js';
import { WithdrawalCooldownError } from '../errors/WithdrawalCooldownError.js';

export const router = Router();

const saleRepo = new SaleRepository(db);
const txRepo = new PayoutTransactionRepository(db);
const balanceRepo = new UserBalanceRepository(db);
const withdrawalRepo = new WithdrawalRepository(db);

const advanceService = new AdvancePayoutService(db);
const reconciliationService = new ReconciliationService(db);
const withdrawalService = new WithdrawalService(db);
const recoveryService = new FailedPayoutRecoveryService(db);

// Helper for error handling
const asyncWrap = (fn: any) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);

// POST /sales
router.post('/sales', asyncWrap(async (req: any, res: any) => {
    const { userId, brand, earning } = req.body;
    if (!userId || !brand || earning == null) {
        throw new ValidationError("Missing required fields: userId, brand, or earning");
    }
    if (Number(earning) <= 0) {
        throw new ValidationError("Earning must be greater than 0");
    }
    
    const sale = {
        id: randomUUID(),
        user_id: userId,
        brand,
        earning: Number(earning),
        status: 'pending' as const,
        advance_paid: 0,
        advance_paid_at: null,
        reconciled_at: null,
        created_at: new Date(),
        updated_at: new Date()
    };
    saleRepo.create(sale);
    res.status(201).json(sale);
}));

// GET /sales?userId=&status=
router.get('/sales', asyncWrap(async (req: any, res: any) => {
    const { userId, status } = req.query;
    const sales = saleRepo.find(userId as string, status as string);
    res.json(sales);
}));

// PATCH /sales/:id/reconcile
router.patch('/sales/:id/reconcile', asyncWrap(async (req: any, res: any) => {
    const { status } = req.body;
    if (status !== 'approved' && status !== 'rejected') {
        throw new ValidationError('Status must be approved or rejected');
    }
    reconciliationService.reconcileSale(req.params.id, status);
    res.json({ message: `Sale ${req.params.id} reconciled as ${status}` });
}));

// POST /payouts/advance/run
router.post('/payouts/advance/run', asyncWrap(async (req: any, res: any) => {
    const { userId } = req.body;
    advanceService.runAdvancePayout(userId);
    res.json({ message: 'Advance payout processed successfully' });
}));

// GET /users/:id/balance
router.get('/users/:id/balance', asyncWrap(async (req: any, res: any) => {
    const balance = balanceRepo.findByUserId(req.params.id);
    if (!balance) {
        return res.json({ withdrawable_balance: 0, last_withdrawal_at: null });
    }
    res.json(balance);
}));

// POST /withdrawals
router.post('/withdrawals', asyncWrap(async (req: any, res: any) => {
    const { userId, amount } = req.body;
    if (!userId || amount == null || Number(amount) <= 0) {
        throw new ValidationError("Missing or invalid fields: userId, amount must be > 0");
    }
    withdrawalService.requestWithdrawal(userId, Number(amount));
    res.status(201).json({ message: 'Withdrawal requested successfully' });
}));

// PATCH /withdrawals/:id/status
router.patch('/withdrawals/:id/status', asyncWrap(async (req: any, res: any) => {
    const { status, transactionId } = req.body;
    
    // First update the withdrawal request
    withdrawalRepo.updateStatus(req.params.id, status);

    // Then trigger recovery if transactionId is provided (as per spec)
    if (transactionId) {
        recoveryService.markPayoutOutcome(transactionId, status);
    }
    
    res.json({ message: 'Withdrawal status updated' });
}));

// GET /users/:id/transactions
router.get('/users/:id/transactions', asyncWrap(async (req: any, res: any) => {
    const txs = txRepo.findByUserId(req.params.id);
    res.json(txs);
}));

// Generic error handler
router.use((err: any, req: any, res: any, next: any) => {
    if (err instanceof ValidationError || err instanceof InsufficientBalanceError) {
        return res.status(400).json({ error: err.message });
    }
    if (err instanceof NotFoundError) {
        return res.status(404).json({ error: err.message });
    }
    if (err instanceof ConflictError || err instanceof WithdrawalCooldownError) {
        return res.status(409).json({ error: err.message });
    }
    // Fallback for unexpected errors
    res.status(500).json({ error: err.message });
});
