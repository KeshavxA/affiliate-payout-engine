# Low Level Design

This document will contain the LLD for the User Payout Management System.

## Database Schema (ER Description)

### users
- `id` (PK)
- `name`
- `created_at`

### sales
- `id` (PK)
- `user_id` (FK -> users)
- `brand` (enum/string: brand_1, brand_2, brand_3)
- `earning` (decimal)
- `status` (enum: pending, approved, rejected)
- `advance_paid` (decimal, default 0) — tracks whether/how much advance was already paid on THIS sale
- `advance_paid_at` (nullable timestamp)
- `reconciled_at` (nullable timestamp)
- `created_at`
- `updated_at`

### payout_transactions
- `id` (PK)
- `user_id` (FK -> users)
- `type` (enum: advance, final_settlement, withdrawal)
- `amount` (decimal, can be negative for adjustments)
- `status` (enum: pending, completed, failed, cancelled, rejected)
- `related_sale_id` (nullable FK -> sales, for advance/settlement rows)
- `created_at`
- `updated_at`

### withdrawal_requests
- `id` (PK)
- `user_id` (FK -> users)
- `amount` (decimal)
- `status` (enum: pending, completed, failed, cancelled, rejected)
- `requested_at`
- `settled_at` (nullable)

### user_balances (derived/cached, optional but recommended for O(1) reads)
- `user_id` (PK, FK -> users)
- `withdrawable_balance` (decimal)
- `last_withdrawal_at` (nullable timestamp) — enforces the 24h rule
- `updated_at`

### Relationships
- 1 user -> many sales
- 1 user -> many transactions
- 1 user -> many withdrawal_requests
- 1 user -> 1 user_balance
- 1 sale -> at most one advance transaction

### Key Design Decision
**Advance Tracking**: The `advance_paid` tracking lives on the `sales` row (not just in the transactions table). This ensures that idempotency is a single indexed check (`WHERE status='pending' AND advance_paid=0`), instead of an aggregation over transaction history.

## SQL Schema

```sql
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    brand TEXT CHECK (brand IN ('brand_1', 'brand_2', 'brand_3')),
    earning DECIMAL(10, 2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
    advance_paid DECIMAL(10, 2) DEFAULT 0,
    advance_paid_at DATETIME,
    reconciled_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payout_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT CHECK (type IN ('advance', 'final_settlement', 'withdrawal')),
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'rejected')),
    related_sale_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (related_sale_id) REFERENCES sales(id)
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'rejected')),
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    settled_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_balances (
    user_id TEXT PRIMARY KEY,
    withdrawable_balance DECIMAL(10, 2) DEFAULT 0,
    last_withdrawal_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Class / Module Design

### Entities

- `Sale`: Represents an affiliate sale earning.
- `PayoutTransaction`: Represents a payout movement (advance, settlement, withdrawal).
- `WithdrawalRequest`: Represents a user's request to withdraw their withdrawable balance.
- `UserBalance`: Represents the derived/cached balance for a user.

### Repositories

- `SaleRepository`
  - Responsibilities: Manage `sales` table (CRUD) and specific queries for pending advances.
  - Methods: `create()`, `findById()`, `update()`, `delete()`, `findPendingUnadvanced(userId)`

- `PayoutTransactionRepository`
  - Responsibilities: Manage `payout_transactions` table.
  - Methods: `create()`, `findById()`, `update()`

- `WithdrawalRepository`
  - Responsibilities: Manage `withdrawal_requests` table.
  - Methods: `create()`, `findById()`, `update()`

- `UserBalanceRepository`
  - Responsibilities: Manage `user_balances` table.
  - Methods: `createOrUpdate()`, `findByUserId()`

### Services

- `AdvancePayoutService`
  - Responsibilities: Process 10% advances on pending sales.
  - Methods: `runAdvancePayout(userId)`
  - Design Details: Uses an SQLite IMMEDIATE transaction and conditional `UPDATE ... WHERE advance_paid = 0` to guarantee idempotency and avoid race conditions under concurrent executions. Credits `user_balances` utilizing an `ON CONFLICT DO UPDATE` upsert.

- `ReconciliationService`
  - Responsibilities: Transition sales from pending to approved/rejected and compute final settlements.
  - Methods: `reconcileSale(saleId, newStatus)`
  - Design Details: Idempotent operation utilizing `WHERE status = 'pending'` for conditionality, rejecting already reconciled sales. Calculates adjustments correctly (crediting the remainder for approved, or debiting/clawing back advances for rejected) and updates the `user_balances`.

- `WithdrawalService`
  - Responsibilities: Handle user requests to withdraw their accumulated funds.
  - Methods: `requestWithdrawal(userId, amount)`
  - Design Details: Validates that `withdrawable_balance >= amount` and ensures the 24-hour cooldown constraint. Inserts records into both `withdrawal_requests` and `payout_transactions`, debits the user balance, and updates the `last_withdrawal_at` timestamp natively inside a single transaction. Throws typed `InsufficientBalanceError` and `WithdrawalCooldownError`.

- `FailedPayoutRecoveryService`
  - Responsibilities: Resolve pending payout transactions to their final state and refund balances if the payout failed.
  - Methods: `markPayoutOutcome(transactionId, outcome)`
  - Design Details: **Trade-off on `last_withdrawal_at`**: When a payout fails (e.g. `rejected` or `cancelled`), the amount is credited back to `user_balances`, but the `last_withdrawal_at` is *not* reset. **Stance**: We choose not to penalize the user for a failure that might be outside of their control (such as a banking error). Retaining the timestamp allows the user to immediately attempt a withdrawal again, prioritizing UX over strict calendar-blocking of failed attempts.

### Class Diagram (Text Form)

```text
+-----------------------+       +-------------------------------+
|       Entities        |       |         Repositories          |
+-----------------------+       +-------------------------------+
| - Sale                | <---- | - SaleRepository              |
| - PayoutTransaction   | <---- | - PayoutTransactionRepository |
| - WithdrawalRequest   | <---- | - WithdrawalRepository        |
| - UserBalance         | <---- | - UserBalanceRepository       |
+-----------------------+       +-------------------------------+
                                               ^
                                               |
                                +-------------------------------+
                                |           Services            |
                                +-------------------------------+
                                | - AdvancePayoutService        |
                                | - ReconciliationService       |
                                | - WithdrawalService           |
                                | - FailedPayoutRecoveryService |
                                +-------------------------------+
```
