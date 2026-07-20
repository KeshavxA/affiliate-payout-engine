# Affiliate Payout Engine (LLD)

A robust User Payout Management System built as a Low-Level Design (LLD) assignment. It manages an affiliate's lifecycle starting from pending sales, through an idempotent 10% advance payout job, to final reconciliation and strictly-guarded withdrawal requests.

Built with **TypeScript**, **Node.js**, **Express**, and **SQLite**.

---

## 🚀 Quick Setup & Demo

### 1. Installation
Ensure you have Node.js 20+ installed.

```bash
# Install all dependencies
npm install

# Setup environment variables
cp .env.example .env
```

### 2. Run the Demo
This runs a completely automated, end-to-end simulation recreating the exact assignment requirements (3 pending sales, advance payout, reconciliation of 2 approved / 1 rejected, and final balance verification).

```bash
npm run demo
```

### 3. Run the Test Suite
Executes the comprehensive Jest integration test suite covering all edge cases (idempotency, cooldown constraints, insufficient balances, etc.).

```bash
npm run test
```

### 4. Start the Server
Start the Express API server locally.

```bash
npm run dev
```

---

## 🏗️ Architecture & Component Overview

```text
    [ HTTP Clients / Brand Webhooks ]
                |
                v
       +-------------------+
       |   Express API     |
       |  (src/api/routes) |
       +-------------------+
                |
                v
       +-----------------------------------------+
       |             Services Layer              |
       | - AdvancePayoutService                  |
       | - ReconciliationService                 |
       | - WithdrawalService                     |
       | - FailedPayoutRecoveryService           |
       +-----------------------------------------+
                |
                v
       +-----------------------------------------+
       |           Repositories Layer            |
       | - SaleRepository                        |
       | - PayoutTransactionRepository           |
       | - WithdrawalRepository                  |
       | - UserBalanceRepository                 |
       +-----------------------------------------+
                |
                v
       +-------------------+
       |   better-sqlite3  |
       |   (SQLite DB)     |
       +-------------------+
```

---

## 💡 Top 5 Design Decisions & Trade-offs

1. **SQLite for Strict Concurrency**
   - *Decision:* Using SQLite with `better-sqlite3`.
   - *Why:* It enforces transactional safety without requiring distributed locks. By wrapping all operations in `BEGIN IMMEDIATE TRANSACTION`, we inherently prevent race conditions (like double-spending during concurrent withdrawal requests).

2. **Idempotency via Row-level Flags vs. Aggregation**
   - *Decision:* We track `advance_paid` directly on the `sales` table instead of grouping and summing over the `payout_transactions` ledger table.
   - *Why:* A simple `SELECT ... WHERE advance_paid = 0` is `O(1)` with an index, whereas computing historical sums via `SUM(amount)` over a growing ledger creates a massive `O(N)` bottleneck during high-volume cron jobs.

3. **Synchronized Derived Balance Table**
   - *Decision:* Maintaining a standalone `user_balances` table rather than calculating balances on-the-fly (`Compute on Read`).
   - *Why:* Affiliate transaction ledgers grow indefinitely. A strictly synchronized balance table guarantees `O(1)` lookups for the `/balance` and `/withdrawals` endpoints, keeping the user-facing app lightning fast.

4. **Rounding Strategy**
   - *Decision:* 10% calculations are rounded to exactly 2 decimal places using JavaScript's `Math.round(val * 100) / 100`.
   - *Why:* Prevents floating-point precision bleeding (`0.300000004`). (Note: In a true production environment, integer-based micro-cents would be optimal).

5. **Withdrawal Cooldown Reset on Failure**
   - *Decision:* A 24-hour limit on withdrawals is enforced. However, if a withdrawal *fails* (e.g. gateway error), the `FailedPayoutRecoveryService` refunds the balance and actively **resets** the cooldown (`last_withdrawal_at = NULL`).
   - *Why:* Outstanding UX. We explicitly chose not to penalize the user for downstream banking/infrastructure failures that sit completely out of their control, allowing them to retry their withdrawal immediately.
