// const { get_parser, Lark, ParsingFrontend, ConfigurationError, LexerThread, LALR_Parser, ParseConf, ParserState } = require("./lib/json_parser.js");
import {
    get_parser,
    Lark,
    ParsingFrontend,
    ConfigurationError,
    LexerThread,
    LALR_Parser,
    ParseConf, ParserState,
    _Parser,
    Token,
    TerminalDef,
    Rule,
    Symbol as _Symbol
} from "./lib/json_parser.js";


const MEMORY = {
    rules: new Array<Rule>(),
    symbolMap: new Map<string, _Symbol>(),
};

/**
 * LR(0) 项 (Item)
 * 文法 G 的一个 LR(0) 项是 G 的某个产生式加上一个位于体部的点。
 * 例：[A → ·XYZ]
 */
class LR0Item {
    rule: Rule;
    readonly index: number;

    constructor(rule: Rule, index: number = 0) {
        this.rule = rule;
        this.index = index;
    }

    equal(other: LR0Item): boolean {
        return other.rule === this.rule && other.index === this.index;
    }

    end(): boolean {
        return this.index === this.rule.expansion.length;
    }

    /**
     * 调用该方法前请先判断是否为end
     */
    current(): _Symbol {
        return this.rule.expansion[this.index];
    }

    /**
     * 返回一个index+1的新的RulePtr，并非将本RulePtr右移。
     */
    advance(): LR0Item {
        return new LR0Item(this.rule, this.index + 1);
    }
}


/**
 * 项集
 * 是若干项构成的集合。句柄识别自动机的一个状态可以表示为一个项集。
 */
class LR0ItemSet {
    kernel: LR0Item[];
    closure: LR0Item[];
    done: boolean;
    private searchIndex: number;

    constructor(kernel: LR0Item[]) {
        this.kernel = kernel;
        this.closure = [];
        this.kernel.forEach((item) => { this.closure.push(item); });
        this.searchIndex = 0;
        this.done = false;
    }

    /**
     * 通过比较kernel是否相同判断项集是否相同
     */
    equal(other: LR0ItemSet): boolean {
        return this.kernelEqual(other.kernel);
    }

    kernelEqual(other: LR0Item[]) {
        if (this.kernel.length !== other.length) {
            return false;
        }
        let res = true;
        other.forEach((item): void => {
            if (!this.inKernel(item)) {
                res = false;
                return; // return arrow function
            }
        });
        return res;
    }

    private inKernel(i: LR0Item): boolean {
        let res = false;
        this.kernel.forEach((item): void => {
            if (item.equal(i)) {
                res = true;
                return; // return arrow function
            }
        });
        return res;
    }

    /**
     * 判断一个LR0项是否在闭包内
     */
    have(i: LR0Item): boolean {
        let res = false;
        this.closure.forEach((item): void => {
            if (item.equal(i)) {
                res = true;
                return; // return arrow function
            }
        });
        return res;
    }

    computeClosureByStep(all: Rule[]): ClosureExpandList {
        let stepRes: ClosureExpandList = [];
        if (this.done) {
            return stepRes;
        }
        // 遍历闭包中的每一项[A -> a·Bb]
        let item = this.closure[this.searchIndex];
        let rightSym: _Symbol = item.rule.expansion[item.index];
        console.log(rightSym.name)
        // 寻找产生式B -> r
        for (let rule of all) {
            // if (rightSym.eq(rule.origin)) {
            if (rightSym === rule.origin) {
                let newPtr = new LR0Item(rule, 0);
                // 如果[B -> ·r]不在闭包中，则将[B -> ·r]加入到闭包
                if (!this.have(newPtr)) {
                    // this.closure.push(newPtr);
                    stepRes.push(newPtr);
                }
            }
        }
        ++this.searchIndex;
        // while (this.#searchIndex < this.closure.length) {
        // }
        if (stepRes.length === 0) {
            this.done = true;
        }
        this.closure.push(...stepRes);
        return stepRes;
    }

    computeClosure(all: Rule[]): ClosureExpandList[] {
        let steps: ClosureExpandList[] = [];
        while (!this.done) {
            let res = this.computeClosureByStep(all);
            if (res.length > 0) {
                steps.push(res);
            }
        }
        return steps;
    }

    nextSymbols() {
        let terminalTransitions = new Map<_Symbol, LR0Item[]>();
        let nonTerminalTransitions = new Map<_Symbol, LR0Item[]>();
        this.closure.forEach((item) => {
            if (!item.end()) {
                let sym = item.current();
                if (sym.is_term) {
                    if (!terminalTransitions.has(sym)) {
                        terminalTransitions.set(sym, []);
                    }
                    terminalTransitions.get(sym).push(item.advance());
                } else {
                    if (!nonTerminalTransitions.has(sym)) {
                        nonTerminalTransitions.set(sym, []);
                    }
                    nonTerminalTransitions.get(sym).push(item.advance());
                }
            }
        });
        return { terminalTransitions, nonTerminalTransitions };
    }

    gotoByStep(symbol: _Symbol) {

    }
}

type ClosureExpandList = LR0Item[];
type AutomatonState = LR0ItemSet;
interface StatePath {
    from: number;
    to: number;
    symbol: _Symbol
}
class Automaton {
    /**
     * 自动机的状态集
     */
    states: AutomatonState[];
    paths: StatePath[];
    // relations:

    private stateSearchPtr: number;

    constructor(startState: AutomatonState) {
        this.stateSearchPtr = 0;
    }

    currentStateClosure(all: Rule[]) {
        this.states[this.stateSearchPtr].computeClosure(all);
    }

    bfsByStep() {
        let { terminalTransitions, nonTerminalTransitions } = this.states[this.stateSearchPtr].nextSymbols();
        let expand = (kernel: LR0Item[], sym: _Symbol): void => {
            let target = -1;
            // 从一个项集GOTO操作，检查GOTO(I)是否已经存在
            for (let i = 0; i <= this.stateSearchPtr; ++i) {
                if (this.states[i].kernelEqual(kernel)) {
                    // return // return arrow function
                    target = i;
                    break;
                }
            }
            if (target === -1) {
                this.states.push(new LR0ItemSet(kernel));
                target = this.states.length - 1;
            }
            this.paths.push({
                from: this.stateSearchPtr,
                to: target,
                symbol: sym
            });
        }
        terminalTransitions.forEach(expand);
        nonTerminalTransitions.forEach(expand);
        // TODO 这里可能有问题，terminalTransitions和nonTerminalTransitions都空的话，ptr还加么
        ++this.stateSearchPtr;
    }

}

class ControllableLalrParser {

    /**
     * 本程序中token和symbol的区别：
     * symbol表示的是抽象的符号，即文法中的终结符与非终结符。
     * token表示的是具体的内容，即输入流中的每一个此法单元。
     */

    lark: Lark;
    text: string;
    automaton: Automaton;
    tokenList: Token[];
    rules: Rule[] = null;
    symbolMap: Map<string, _Symbol> = new Map();
    startRule: Rule = null;
    currentToken: Token = null;

    // lr0States: 

    constructor(text: string) {
        this.lark = get_parser();
        this.text = text;
        this.tokenList = null;
        this.rules = this.lark.rules;
        // this.#currentToken = null;
        this.init();
        this.lex();
    }

    private init() {
        let saveInSymbolMap = (symbol: _Symbol): _Symbol => {
            if (!this.symbolMap.has(symbol.name)) {
                this.symbolMap.set(symbol.name, symbol);
            }
            return this.symbolMap.get(symbol.name);
        }

        this.rules.forEach((rule) => {
            rule.origin = saveInSymbolMap(rule.origin);
            if (rule.origin.name === "start") {
                this.startRule = rule;
            }
            rule.expansion.forEach((sym: _Symbol, i: number, arr: _Symbol[]) => {
                arr[i] = saveInSymbolMap(sym);
            });
        });
        if (!this.startRule) {
            throw new Error("未找到开始符号");
        }
        console.log("INIT");
        this.automaton = new Automaton(new LR0ItemSet([new LR0Item(this.startRule)]));
    }

    lex() {
        if (this.tokenList) {
            // 报错，已经lex过了
        }
        this.tokenList = [];
        // 官方文档写的Lark.lex方法要求lexer="basic"。但从源码中可见，它实际上会自己创建一个临时的BasicLexer
        let tokenGenerator = this.lark.lex(this.text);
        for (let iter = tokenGenerator.next(); !iter.done; iter = tokenGenerator.next()) {
            let token = iter.value;
            this.tokenList.push(token);
        }
        return this.tokenList;
    }

}

export { ControllableLalrParser, LR0Item, LR0ItemSet }
