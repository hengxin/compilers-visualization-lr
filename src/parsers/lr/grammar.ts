interface Deserialize {
    // _type: string;
    // deserialize: (data: Map<string, any>) => void;
}
type SerializationData = Map<string, any>;
class _Symbol implements Deserialize {
    name: string;
    isTerm: boolean = false;
    protected constructor(name: string) {
        this.name = name;
    }
    static deserialize(data: SerializationData): _Symbol {
        let type = data.get("__type__") as string;
        if (type === Terminal._type) {
            return new Terminal(data.get("name"));
        } else if (type === NonTerminal._type) {
            return new NonTerminal(data.get("name"));
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

class RuleOptions {
    static _type: string = "RuleOptions";
    keepAllTokens: boolean = true;
    expand1: boolean = false;
    priority?: any;
}

class Rule {
    static _type: string = "Rule";
    origin: _Symbol;
    expansion: _Symbol[];
    order: number;
    alias?: any;
    options?: RuleOptions;

    constructor(origin: _Symbol, expansion: _Symbol[], order:number = 0, alias?:any, options?:RuleOptions) {
        this.origin = origin;
        this.expansion = expansion;
        this.order = order
        this.alias = alias;
        this.options = options;
    }

    static deserialize(data: SerializationData) {
        let type = data.get("__type__") as string;
        if (type !== Rule._type) {
            // error
        }
        return new Rule(
            _Symbol.deserialize(data.get("origin") as SerializationData),
            (data.get("expansion") as SerializationData[]).map(m => _Symbol.deserialize(m)),
            data.get("order") as number,
            // alias & options
        );
    }
}