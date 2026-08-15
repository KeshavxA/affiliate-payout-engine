/**
 * Error thrown when a user requests a withdrawal too soon after their last one.
 */
export class WithdrawalCooldownError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'WithdrawalCooldownError';
    }
}
