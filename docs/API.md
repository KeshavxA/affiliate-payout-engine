# Payout Management API

This document details the REST API endpoints, their request/response JSON schemas, and possible error codes.

---

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

**Error Responses:**
- `400 Bad Request`: When `earning` <= 0 or missing required fields.
```json
{ "error": "Earning must be greater than 0" }
```

---

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

---

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

**Error Responses:**
- `400 Bad Request`: If status is not 'approved' or 'rejected'.
- `404 Not Found`: If the sale ID doesn't exist.
- `409 Conflict`: If the sale is already reconciled or was modified concurrently.
```json
{ "error": "Sale uuid is already reconciled (approved)." }
```

---

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

---

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

---

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

**Error Responses:**
- `400 Bad Request`: If `amount` exceeds the `withdrawable_balance` or is <= 0.
```json
{ "error": "Insufficient balance. Available: 0" }
```
- `409 Conflict`: If a withdrawal was made within the last 24 hours.
```json
{ "error": "You must wait 24 hours between withdrawals." }
```

---

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

**Error Responses:**
- `404 Not Found`: If the transaction doesn't exist.
- `409 Conflict`: If the transaction is already resolved.

---

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
