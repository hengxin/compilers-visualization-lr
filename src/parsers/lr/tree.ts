import { Token, Symbol as _Symbol } from "./lib/new_example.js"
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
        
    }
}

export { Tree }