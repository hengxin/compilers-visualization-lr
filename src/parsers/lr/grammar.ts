class _Symbol{
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
            // NotImplemented
            return new Terminal("?");
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

class Rule{
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
            // error
        }
        return new Rule(
            _Symbol.deserialize(data.origin),
            (data.expansion as any[]).map(m => _Symbol.deserialize(m)),
            data.order as number,
            data.options.priority ? data.options.priority as number : 0,
        );
    }
}

class Token{
    static _type: string = "Token";
    type: string;
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
            // error
        }
        return new Token(
            data.type as string, data.value as string,
            data.start_pos as number, data.line as number, data.column as number,
            data.end_line as number, data.end_column as number, data.end_pos as number
        );
    }
}

export { _Symbol, Terminal, NonTerminal, Rule, Token }