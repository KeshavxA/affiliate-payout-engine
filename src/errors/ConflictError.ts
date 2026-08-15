/**
 * Error thrown when a request conflicts with the current state of the server.
 */
export class ConflictError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ConflictError';
    }
}
