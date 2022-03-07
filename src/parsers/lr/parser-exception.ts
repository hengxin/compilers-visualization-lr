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
export class TypeNotMatchError extends ParserException {
    constructor() {
        super(1002, "TypeNotMatch");
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
export class TokenPtrOutOfRangeError extends ParserException {
    constructor() {
        super(1022, "TokenPtrOutOfRange");
    }
}
export class ActionNotExistError extends ParserException {
    constructor() {
        super(1023, "ActionNotExist");
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
export class ItemSetClosureDoneInfo extends ParserException {
    constructor() {
        super(2003, "ItemSetClosureDone");
    }
}