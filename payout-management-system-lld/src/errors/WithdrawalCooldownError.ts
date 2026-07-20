export class WithdrawalCooldownError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'WithdrawalCooldownError';
    }
}
