import { ParserError, PARSER_EXCEPTION_MSG } from "./exception";

class _Symbol {
    name: string;
    isTerm: boolean = false;
    protected constructor(name: string) {
        this.name = name;
    }
    static deserialize(data: any): _Symbol {
        let type = data.__type__ as string;
        if (type === Terminal._type) {
            return new Terminal(data.name);
        } else if (type === NonTerminal._type) {
            return new NonTerminal(data.name);
        } else {
            throw new ParserError(PARSER_EXCEPTION_MSG.DESERIALIZE_FAILED);
        }
    };
    eq(other: _Symbol) {
        return this.isTerm === other.isTerm && this.name === other.name;
    }
}

class Terminal extends _Symbol {
    static _type: string = "Terminal";
    isTerm: boolean = true;
    constructor(name: string) {
        super(name);
    }
}

class NonTerminal extends _Symbol {
    static _type: string = "NonTerminal";
    isTerm: boolean = false;
    constructor(name: string) {
        super(name);
    }
}

const SYMBOL_START_NAME = "start";
const SYMBOL_START = new Terminal(SYMBOL_START_NAME);
const SYMBOL_END_NAME = "$";
const SYMBOL_END = new Terminal(SYMBOL_END_NAME);
const SYMBOL_EPSILON_NAME = "ε"
const SYMBOL_EPSILON = new Terminal(SYMBOL_EPSILON_NAME);
const SYMBOL_SHARP_NAME = "#";
const SYMBOL_SHARP = new Terminal(SYMBOL_SHARP_NAME);

class Rule {
    static _type: string = "Rule";
    origin: _Symbol;
    expansion: _Symbol[];
    order: number;
    priority: number;

    constructor(origin: _Symbol, expansion: _Symbol[], order: number, priority: number) {
        this.origin = origin;
        this.expansion = expansion;
        this.order = order;
        this.priority = priority;
    }

    static deserialize(data: any) {
        let type = data.__type__ as string;
        if (type !== Rule._type) {
            throw new ParserError(PARSER_EXCEPTION_MSG.DESERIALIZE_FAILED);
        }
        return new Rule(
            _Symbol.deserialize(data.origin),
            (data.expansion as any[]).map(m => _Symbol.deserialize(m)),
            data.order as number,
            data.options.priority ? data.options.priority as number : 0,
        );
    }

    toString() {
        let str = "";
        str += this.origin.name + " → "
        for (let i = 0; i < this.expansion.length; i++) {
            if (i === 0) {
                str += this.expansion[i].name;
            } else {
                str += " " + this.expansion[i].name;
            }
        }
        return str;
    }
}

class Token {
    static _type: string = "Token";
    type: string;
    symbol: _Symbol;
    value: string;
    startPos: number;
    line: number;
    column: number;
    endLine: number;
    endColumn: number;
    endPos: number;

    constructor(type: string, value: string, start_pos: number, line: number,
        column: number, endLine: number, endColumn: number, endPos: number) {
        this.type = type;
        this.symbol = SYMBOL_SHARP;
        this.value = value;
        this.startPos = start_pos;
        this.line = line;
        this.column = column;
        this.endLine = endLine;
        this.endColumn = endColumn;
        this.endPos = endPos;
    }

    static deserialize(data: any) {
        let type = data.__type__ as string;
        if (type !== Token._type) {
            throw new ParserError(PARSER_EXCEPTION_MSG.DESERIALIZE_FAILED);
        }
        return new Token(
            data.type as string, data.value as string,
            data.start_pos as number, data.line as number, data.column as number,
            data.end_line as number, data.end_column as number, data.end_pos as number
        );
    }
}

const TERMINAL_NAMES_REVERSE: { [name: string]: string } = {
    'DOT': '.',
    'COMMA': ',',
    'COLON': ':',
    'SEMICOLON': ';',
    'PLUS': '+',
    'MINUS': '-',
    'STAR': '*',
    'SLASH': '/',
    'BACKSLASH': '\\',
    'VBAR': '|',
    'QMARK': '?',
    'BANG': '!',
    'AT': '@',
    'HASH': '#',
    'DOLLAR': '$',
    'PERCENT': '%',
    'CIRCUMFLEX': '^',
    'AMPERSAND': '&',
    'UNDERSCORE': '_',
    'LESSTHAN': '<',
    'MORETHAN': '>',
    'EQUAL': '=',
    'DBLQUOTE': '"',
    'QUOTE': '\'',
    'BACKQUOTE': '`',
    'TILDE': '~',
    'LPAR': '(',
    'RPAR': ')',
    'LBRACE': '{',
    'RBRACE': '}',
    'LSQB': '[',
    'RSQB': ']',
    // 'NEWLINE': '\n',
    // 'CRLF': '\r\n',
    // 'TAB': '\t',
    // 'SPACE': ' ',
}

export {
    _Symbol, Terminal, NonTerminal,
    SYMBOL_START, SYMBOL_END, SYMBOL_EPSILON, SYMBOL_SHARP,
    Rule, Token, TERMINAL_NAMES_REVERSE
};