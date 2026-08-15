/**
 * Error thrown when a user does not have enough balance for a withdrawal.
 */
export class InsufficientBalanceError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InsufficientBalanceError';
    }
}
