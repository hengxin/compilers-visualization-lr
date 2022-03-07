import { Token, _Symbol } from "./grammar"
class Tree {
    symbol: _Symbol;
    value: string;
    children: Tree[];

    constructor(symbol: _Symbol, value: string);
    constructor(symbol: _Symbol, children: Tree[]);
    constructor(symbol: _Symbol, arg: string | Tree[]) {
        this.symbol = symbol;
        if (typeof arg === "string") {
            this.value = arg;
            this.children = []
        } else {
            this.value = "";
            this.children = arg;
        }
    }

    toString() {
        return this.pretty(0);
    }

    private pretty(depth: number) {
        let prefix = " ".repeat(depth * 2);
        let s: string = prefix + this.symbol.name;
        if (this.symbol.isTerm) {
            s += "(" + this.value + ")"
        }
        s += "\n";
        this.children.forEach((child) => {
            s += child.pretty(depth + 1);
        });
        return s;
    }
}

export { Tree }