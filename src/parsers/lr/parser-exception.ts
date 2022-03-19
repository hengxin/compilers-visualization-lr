export class ParserError extends Error {
    extra?:string;
    constructor(msg: number, extra?:string) {
        // @ts-ignore
        super(PARSER_EXCEPTION_MSG_STRING[msg]);
        if (extra !== undefined) {
            this.extra = extra;
        }
    }
}

export const PARSER_EXCEPTION_MSG = {
    FATAL_ERROR: 1000, // 出现此错误则极有可能是算法实现上出现了问题
    LR_ITEM_INDEX_OUT_OF_RANGE: 1011,
    AUTOMATON_STATES_INDEX_OUT_OF_RANGE: 1012,
    TOKEN_LIST_INDEX_OUT_OF_RANGE: 1013,
    LR_ITEM_TYPE_NOT_MATCH: 1021,
    INVALID_OPERATION: 1023,
    START_SYMBOL_NOT_FOUND: 1031,
    UNEXPECTED_TOKEN: 1032, // 应含有extra信息
    LR_ITEM_SET_CLOSURE_CALC_DONE: 1101,
    LOOKAHEADS_HAVE_PROPAGATED: 1102,
    HAVE_NOT_SPONTANEOUSLY_GENERATED: 1103,

};
const PARSER_EXCEPTION_MSG_STRING = {
    1000: "Fatal error",
    1011: "LR item index out of range",
    1012: "Automaton states index out of range",
    1013: "Token list index out of range",
    1021: "LR item type not match",
    1023: "Invalid operation",
    1031: "Start symbol not found",
    1032: "Unexpected token",
    1101: "LR item set closure clac done",
    1102: "Lookaheads have propagated",
    1103: "Have not spontaneously generated",
};