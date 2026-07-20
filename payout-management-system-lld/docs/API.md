# Payout Management API

## Sales

### Create a Sale
`POST /sales`
Creates a new sale (useful for testing/seeding).

**Request Body:**
```json
{
  "userId": "user_123",
  "brand": "brand_1",
  "earning": 100.50
}
```

**Response (`201 Created`):**
```json
{
  "id": "uuid",
  "user_id": "user_123",
  "brand": "brand_1",
  "earning": 100.50,
  "status": "pending",
  "advance_paid": 0,
  "advance_paid_at": null,
  "reconciled_at": null,
  "created_at": "2023-10-10T12:00:00.000Z",
  "updated_at": "2023-10-10T12:00:00.000Z"
}
```

### List Sales
`GET /sales?userId=user_123&status=pending`
Lists all sales, optionally filtered by user ID and/or status.

**Response (`200 OK`):**
```json
[
  {
    "id": "uuid",
    "user_id": "user_123",
    "brand": "brand_1",
    "earning": 100.50,
    "status": "pending"
  }
]
```

### Reconcile Sale
`PATCH /sales/:id/reconcile`
Transitions a pending sale to approved or rejected, adjusting the user's withdrawable balance accordingly.

**Request Body:**
```json
{
  "status": "approved"
}
```

**Response (`200 OK`):**
```json
{
  "message": "Sale uuid reconciled as approved"
}
```

## Payouts

### Trigger Advance Payout Job
`POST /payouts/advance/run`
Calculates and pays out the 10% advance for all un-advanced pending sales for a specific user.

**Request Body:**
```json
{
  "userId": "user_123"
}
```

**Response (`200 OK`):**
```json
{
  "message": "Advance payout processed successfully"
}
```

## Withdrawals & Balances

### Get User Balance
`GET /users/:id/balance`
Retrieves a user's current withdrawable balance and their last withdrawal timestamp.

**Response (`200 OK`):**
```json
{
  "user_id": "user_123",
  "withdrawable_balance": 10.05,
  "last_withdrawal_at": "2023-10-10T12:00:00.000Z"
}
```

### Request Withdrawal
`POST /withdrawals`
Initiates a withdrawal request if the user has sufficient balance and has passed the 24h cooldown.

**Request Body:**
```json
{
  "userId": "user_123",
  "amount": 10.05
}
```

**Response (`201 Created`):**
```json
{
  "message": "Withdrawal requested successfully"
}
```

### Update Withdrawal Status
`PATCH /withdrawals/:id/status`
Updates the outcome of a withdrawal request. If a payout fails and `transactionId` is provided, triggers the recovery service to refund the user.

**Request Body:**
```json
{
  "status": "failed",
  "transactionId": "transaction-uuid-here"
}
```

**Response (`200 OK`):**
```json
{
  "message": "Withdrawal status updated"
}
```

## Ledger & Transactions

### Get User Transactions
`GET /users/:id/transactions`
Fetches a user's entire payout transaction ledger (advances, final settlements, withdrawals).

**Response (`200 OK`):**
```json
[
  {
    "id": "uuid",
    "user_id": "user_123",
    "type": "advance",
    "amount": 10.05,
    "status": "completed",
    "related_sale_id": "sale-uuid-here",
    "created_at": "2023-10-10T12:00:00.000Z"
  }
]
```
