export class CommonError extends Error {
    extra?: string;
    constructor(msg: string, extra?: string) {
        super(msg);
        this.extra = extra;
    }
}