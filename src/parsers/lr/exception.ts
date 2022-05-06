export class ParserError extends Error {
    extra?: string;
    constructor(msg: number, extra?: string) {
        super(msg.toString());
        this.extra = extra;
    }
}

export class ParserInfo extends Error {
    extra?: string;
    constructor(msg: number, extra?: string) {
        super(msg.toString());
        this.extra = extra;
    }
}

export const PARSER_EXCEPTION_MSG = {
    // ERROR
    FATAL_ERROR: 1000, // 出现此错误则极有可能是算法实现上出现了问题
    INVALID_OPERATION: 1001,
    DESERIALIZE_FAILED: 1002,
    LR_ITEM_INDEX_OUT_OF_RANGE: 1011,
    AUTOMATON_STATES_NOT_FOUND: 1031,
    START_SYMBOL_NOT_FOUND: 1051,
    UNEXPECTED_TOKEN: 1052, // 应含有extra信息
    TOKEN_LIST_INDEX_OUT_OF_RANGE: 1053,

    // INFO
    LR_ITEM_SET_CLOSURE_HAVE_CALCULATED: 2021,
    AUTOMATON_STATE_CLOSURE_NEED_CALCULATE: 2031,
    AUTOMATON_STATE_CLOSURE_HAVE_APPENDED: 2032,
    LOOKAHEADS_HAVE_PROPAGATED: 2033,
    NEED_SPONTANEOUSLY_GENERATE: 2034,
    PARSE_TABLE_HAVE_CALCULATED: 2041,
    PARSE_TABLE_NEED_CALCULATE: 2051,
    PARSER_DONE: 2052,
};