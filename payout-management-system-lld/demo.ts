import { db, initDb } from './src/db.js';
import { SaleRepository } from './src/repositories/SaleRepository.js';
import { AdvancePayoutService } from './src/services/AdvancePayoutService.js';
import { ReconciliationService } from './src/services/ReconciliationService.js';
import { UserBalanceRepository } from './src/repositories/UserBalanceRepository.js';
import { PayoutTransactionRepository } from './src/repositories/PayoutTransactionRepository.js';
import { randomUUID } from 'crypto';

// Initialize the database tables if they don't exist
initDb();

const saleRepo = new SaleRepository(db);
const advanceService = new AdvancePayoutService(db);
const reconciliationService = new ReconciliationService(db);
const balanceRepo = new UserBalanceRepository(db);
const txRepo = new PayoutTransactionRepository(db);

async function runDemo() {
    console.log('================================================');
    console.log('🚀 Starting Payout Management System Demo 🚀');
    console.log('================================================\n');

    const userId = 'john_doe_' + Date.now();

    // 1. Create user john_doe
    console.log(`👤 Creating user ${userId}...`);
    db.exec(`INSERT INTO users (id, name) VALUES ('${userId}', 'John Doe')`);

    // 2. Insert 3 sales of ₹40 each
    console.log('\n🛒 Inserting 3 pending sales of ₹40 each...');
    const sales = [];
    for (let i = 0; i < 3; i++) {
        const sale = {
            id: randomUUID(),
            user_id: userId,
            brand: 'brand_1' as const,
            earning: 40,
            status: 'pending' as const,
            advance_paid: 0,
            advance_paid_at: null,
            reconciled_at: null,
            created_at: new Date(),
            updated_at: new Date()
        };
        saleRepo.create(sale);
        sales.push(sale);
    }
    console.log(`✅ Created 3 sales.`);

    // 3. Run advance payout job
    console.log('\n⚙️  Running Advance Payout Job...');
    advanceService.runAdvancePayout(userId);
    
    let balance = balanceRepo.findByUserId(userId);
    console.log(`💰 Withdrawable Balance after Advance: ₹${balance?.withdrawable_balance}`);
    console.log(`   (Expected: ₹12.00)`);

    // 4. Reconcile sales (1 rejected, 2 approved)
    console.log('\n⚖️  Reconciling sales (1 rejected, 2 approved)...');
    reconciliationService.reconcileSale(sales[0].id, 'rejected');
    reconciliationService.reconcileSale(sales[1].id, 'approved');
    reconciliationService.reconcileSale(sales[2].id, 'approved');

    // 5. Print final balance and ledger
    balance = balanceRepo.findByUserId(userId);
    console.log(`\n💵 Final Withdrawable Balance: ₹${balance?.withdrawable_balance}`);
    console.log(`   (Expected: ₹80.00)`);

    console.log('\n📜 Full Transaction Ledger:');
    const txs = txRepo.findByUserId(userId);
    
    // Map to simple objects for pretty printing
    const tableData = txs.map(tx => ({
        Type: tx.type,
        Amount: `₹${tx.amount.toFixed(2)}`,
        Status: tx.status,
        Date: new Date(tx.created_at).toLocaleString()
    }));
    
    console.table(tableData);
}

runDemo().catch(console.error);
