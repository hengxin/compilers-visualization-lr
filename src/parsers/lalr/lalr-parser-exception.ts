export class ParserException extends Error {
    protected constructor(code: number, msg: string) {
        super(msg);
    }
}

// ERROR
export class LRItemIndexOutOfRangeError extends ParserException {
    constructor() {
        super(1001, "LRItemIndexOutOfRange");
    }
}
export class AutomatonStatePtrOutOfRangeError extends ParserException {
    constructor() {
        super(1011, "AutomatonStatePtrOutOfRange");
    }
}
export class StartSymbolNotFoundError extends ParserException {
    constructor() {
        super (1021, "StartSymbolNotFound");
    }
}

// INFO
export class AutomatonDoneInfo extends ParserException {
    constructor() {
        super(2001, "AutomatonDone");
    }
}
export class LexicalAnalysisDoneInfo extends ParserException {
    constructor() {
        super(2002, "LexicalAnalysisDone");
    }
}