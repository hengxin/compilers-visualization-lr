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
} from "./lib/example_parser.js";

/**
 * LR(0) 项 (Item)
 * 文法 G 的一个 LR(0) 项是 G 的某个产生式加上一个位于体部的点。
 * 例：[A → ·XYZ]
 */
class LR0Item {
    rule: Rule;
    readonly index: number;

    constructor(rule: Rule, index: number = 0) {
        // TODO assert index <= rule.expansion.length
        this.rule = rule;
        this.index = index;
    }

    toString(): string {
        let s = "[ " + this.rule.origin.name + " ->";
        for (let i = 0; i < this.rule.expansion.length; i++) {
            s += " ";
            if (i === this.index) {
                s += "·";
            }
            s += this.rule.expansion[i].name;
        }
        return s + (this.end() ? "·" : "") + " ]";
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

    toString(): string {
        if (!this.done) {
            // TODO 怎么写比较好？
            return "NEED CLOSURE";
        }
        let s = "LR0ItemSet: \n";
        this.closure.forEach((item) => {
            s += item.toString() + "\n";
        });
        s += "------------";
        return s;
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
        this.searchIndex++;
        // while (this.#searchIndex < this.closure.length) {
        // }
        this.closure.push(...stepRes);
        if (this.searchIndex === this.closure.length) {
            this.done = true;
        }
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
        let nonTerminalTransitions = new Map<_Symbol, LR0Item[]>();
        let terminalTransitions = new Map<_Symbol, LR0Item[]>();
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
        return { nonTerminalTransitions, terminalTransitions, };
    }

    gotoByStep(symbol: _Symbol) {

    }
}

type ClosureExpandList = LR0Item[];

interface AutomatonStatePath {
    from: number;
    to: number;
    symbol: _Symbol
}
type AutomatonState = LR0ItemSet;
/**
 * 1: 应该进行CLOSURE操作
 * 2：应该进行GOTO操作
 */
type AutomatonOperation = 1 | 2;
class Automaton {
    /**
     * 自动机的状态集
     */
    states: AutomatonState[] = [];
    paths: AutomatonStatePath[] = [];
    done: boolean = false;

    private stateSearchPtr: number = 0;
    private op: AutomatonOperation = 1;
    private memory: ParserMemory = null;

    constructor(startState: AutomatonState, memory: ParserMemory) {
        this.states.push(startState);
        this.memory = memory;
    }

    toString(): string {
        let s = "";
        this.states.forEach((state) => {
            s += state.toString() + "\n";
        });
        return s;
    }

    currentStateClosure() {
        // assert this.stateSearchPtr < this.states.length;
        this.states[this.stateSearchPtr].computeClosure(this.memory.rules);
    }

    bfsByStep() {
        // assert this.stateSearchPtr < this.states.length;
        let { nonTerminalTransitions, terminalTransitions } = this.states[this.stateSearchPtr].nextSymbols();
        let stateNum = this.states.length;
        let expand = (kernel: LR0Item[], sym: _Symbol): void => {
            let target = -1;
            // 从一个项集GOTO操作，检查GOTO(I)是否已经存在
            for (let i = 0; i < stateNum; i++) {
                if (this.states[i].kernelEqual(kernel)) {
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
        nonTerminalTransitions.forEach(expand);
        terminalTransitions.forEach(expand);
        this.stateSearchPtr++;
        if (this.stateSearchPtr >= this.states.length) {
            this.done = true;
        }
    }

    next() {
        if (this.done) {
            // throw INFO
        }
        switch (this.op) {
            case 1:
                this.currentStateClosure();
                this.op = 2;
                break;
            case 2:
                this.bfsByStep();
                this.op = 1;
                break;
            default:
                break;
        }
    }
}

interface ParserMemory {
    rules: Rule[],
    symbolMap: Map<string, _Symbol>,
}

class ControllableLalrParser {

    /**
     * 本程序中token和symbol的区别：
     * symbol表示的是抽象的符号，即文法中的终结符与非终结符。
     * token表示的是具体的内容，即输入流中的每一个此法单元。
     */

    lark: Lark = null;
    text: string = null;
    automaton: Automaton = null;
    tokenList: Token[] = null;
    memory: ParserMemory = null;
    // rules: Rule[] = null;
    // symbolMap: Map<string, _Symbol> = new Map();
    startRule: Rule = null;
    currentToken: Token = null;

    // lr0States: 

    constructor(text: string) {
        this.lark = get_parser();
        this.text = text;
        this.memory = {
            rules: this.lark.rules,
            symbolMap: new Map<string, _Symbol>(),
        }
        // this.rules = this.lark.rules;
        // this.#currentToken = null;
        this.init();
        this.lex();
    }

    /**
     * 获取所有的符号(Symbol)和所有的产生式(Rule)
     */
    private init() {
        let saveInSymbolMap = (symbol: _Symbol): _Symbol => {
            if (!this.memory.symbolMap.has(symbol.name)) {
                this.memory.symbolMap.set(symbol.name, symbol);
            }
            return this.memory.symbolMap.get(symbol.name);
        }

        this.memory.rules.forEach((rule) => {
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
        this.automaton = new Automaton(new LR0ItemSet([new LR0Item(this.startRule)]), this.memory);
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

    test() {
        do {
            this.automaton.next();
        } while (!this.automaton.done);
        console.log(this.automaton.toString());
    }
}

export { ControllableLalrParser, LR0Item, LR0ItemSet }
