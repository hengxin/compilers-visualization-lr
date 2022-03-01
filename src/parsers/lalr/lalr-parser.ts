// const { get_parser, Lark, ParsingFrontend, ConfigurationError, LexerThread, LALR_Parser, ParseConf, ParserState } = require("./lib/json_parser.js");
import * as E from "./lalr-parser-exception.js";
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
    Symbol as _Symbol,
    Terminal,
    NonTerminal
} from "./lib/lark_parser.js";

abstract class LRItem {
    rule: Rule;
    readonly index: number;

    constructor(rule: Rule, index: number = 0) {
        if (index > rule.expansion.length) {
            throw new E.LRItemIndexOutOfRangeError();
        }
        this.rule = rule;
        this.index = index;
    }

    abstract toString(): string;

    abstract equal(other: LRItem): boolean;

    end(): boolean {
        return this.index === this.rule.expansion.length;
    }

    /**
     * 如果this.end()为false，则返回对应的Symbol。
     * 如果this.end()为true，则返回undefined。
     */
    current(): _Symbol {
        return this.rule.expansion[this.index];
    }

    /**
     * 返回一个index+1的新的RulePtr，并非将本RulePtr右移。
     */
    abstract advance(): LRItem;
}



/**
 * LR(0) 项 (Item)
 * 文法 G 的一个 LR(0) 项是 G 的某个产生式加上一个位于体部的点。
 * 例：[A → ·XYZ]
 */
class LR0Item extends LRItem {
    constructor(rule: Rule, index: number = 0) {
        super(rule, index);
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

    /**
     * 返回一个index+1的新的RulePtr，并非将本RulePtr右移。
     */
    advance(): LR0Item {
        return new LR0Item(this.rule, this.index + 1);
    }
}

/**
 * LR(1) 项 (Item)
 * [A → α · β, a] (a ∈ T ∪ {$})，此处, a 是向前看符号, 数量为 1。
 */
class LR1Item extends LRItem {
    lookahead: _Symbol;

    constructor(rule: Rule, index: number = 0, lookahead: _Symbol) {
        super(rule, index);
        this.lookahead = lookahead;
    }

    toString(): string {
        throw new Error("Method not implemented.");
    }
    equal(other: LR1Item): boolean {
        return other.rule === this.rule && other.index === this.index &&
            other.lookahead === this.lookahead;
    }
    advance(): LR1Item {
        return new LR1Item(this.rule, this.index + 1, this.lookahead);
    }
}


/**
 * 项集
 * 是若干项构成的集合。句柄识别自动机的一个状态可以表示为一个项集。
 */
class LR0ItemSet {
    kernel: LR0Item[];
    closure: LR0Item[];
    id: number = 0;
    transitions: Map<_Symbol, LR0ItemSet> = new Map();
    /**
     * 闭包是否计算完成
     */
    done: boolean = false;
    /**
     * 是否为接受状态
     */
    accepting: boolean = false;
    /**
     * 是否为结束状态
     */
    end: boolean = false;
    private searchIndex: number = 0;

    constructor(kernel: LR0Item[], id: number) {
        this.kernel = kernel;
        this.id = id;
        this.closure = [];
        this.kernel.forEach((item) => { this.closure.push(item); });
    }

    toString(): string {
        let s = "LR0ItemSet " + this.id.toString() + ": \n";
        if (!this.done) {
            s += "Closure not computed.";
        } else {
            this.closure.forEach((item) => { s += item.toString() + "\n"; });
        }
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
        // 如果rightSym为undefined，说明某一个LR(0)项的index已经到了末尾，那么这个项集对应的状态为接受状态。
        if (!rightSym) {
            this.accepting = true;
            if (item.rule.origin.name === SYMBOL_START_NAME) {
                this.end = true;
            }
        }
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

    setTransition(sym: _Symbol, to: LR0ItemSet) {
        this.transitions.set(sym, to);
    }

    computeTransitions() {
        let nonTerminalTransitions = new Map<_Symbol, LR0Item[]>();
        let terminalTransitions = new Map<_Symbol, LR0Item[]>();
        this.closure.forEach((item) => {
            if (!item.end()) {
                let sym = item.current();
                if (sym.is_term) {
                    if (!terminalTransitions.has(sym)) {
                        terminalTransitions.set(sym, []);
                    }
                    terminalTransitions.get(sym)!.push(item.advance());
                } else {
                    if (!nonTerminalTransitions.has(sym)) {
                        nonTerminalTransitions.set(sym, []);
                    }
                    nonTerminalTransitions.get(sym)!.push(item.advance());
                }
            }
        });
        return { nonTerminalTransitions, terminalTransitions, };
    }
}

class LR1ItemSet {
    kernel: LR1Item[];
    closure: LR1Item[];
    id: number = 0;
    private searchIndex: number = 0;
    constructor(kernel: LR1Item[], id: number) {
        this.kernel = kernel;
        this.id = id;
        this.closure = [];
        this.kernel.forEach((item) => { this.closure.push(item); });
    }
    computeClosureByStep(all: Rule[]): ClosureExpandList {
        let stepRes: ClosureExpandList = [];

        let item = this.closure[this.searchIndex];
        let rightSym: _Symbol = item.rule.expansion[item.index];
        // ....

        for (let rule of all) {
            if (rightSym === rule.origin) {
                let lookahead: _Symbol;
                let nextSyms: _Symbol[] = item.rule.expansion.slice(item.index);
                nextSyms.push(item.lookahead);

            }
        }

        return stepRes;
    }
}

/**
 * 计算FIRST集合
 * https://lara.epfl.ch/w/cc09:algorithm_for_first_and_follow_sets
 */
function first(store: ParserStore) {
    let firstSet = new Map<_Symbol, Set<Terminal>>();
    let nullable = new Set<NonTerminal>();
    let finish = true;

    /**
     * 判断b是否为a的子集
     */
    function subset(a: Set<_Symbol>, b: Set<_Symbol>): boolean {
        if (b.size > a.size) {
            return false;
        }
        let values = b.values();
        for (let val of values) {
            if (!a.has(val)) {
                return false;
            }
        }
        return true;
    }

    store.symbolMap.forEach((sym) => {
        firstSet.set(sym, sym.is_term ? new Set([sym as Terminal]) : new Set());
    });
    do {
        finish = true;
        store.rules.forEach((rule) => {
            if (rule.expansion.length === 0 ||
                subset(nullable, new Set([...rule.expansion]))) {
                let before = nullable.size;
                nullable.add(rule.origin);
                nullable.size === before ? undefined : finish = false;
            }
            for (let i = 0; i < rule.expansion.length; i++) {
                if (i === 0 || subset(nullable, new Set(rule.expansion.slice(0, i)))) {
                    let before = firstSet.get(rule.origin)!.size;
                    firstSet.set(rule.origin,
                        new Set([...firstSet.get(rule.origin)!, ...firstSet.get(rule.expansion[i])!]));
                    firstSet.get(rule.origin)!.size === before ? undefined : finish = false;
                }
            }
        });
    } while (!finish);
    return { nullable, firstSet };
}

type ClosureExpandList = LR0Item[];

type AutomatonState = LR0ItemSet;
/**
 * 1: 应该计算ptr指向的状态的CLOSURE
 * 2：应该计算ptr指向的状态可转移的状态
 */
type AutomatonOperation = 1 | 2;
interface AutomatonBfsStepResult {
    from: AutomatonState,
    next: AutomatonState
}
interface AutomatonStepResult {
    op: AutomatonOperation,
    value: Array<ClosureExpandList> | AutomatonBfsStepResult
}
class Automaton {
    /**
     * 自动机的状态集
     */
    states: AutomatonState[] = [];
    // paths: AutomatonStatePath[] = [];
    done: boolean = false;

    private statePtr: number = 0;
    private op: AutomatonOperation = 1;
    private memory: ParserStore;

    constructor(startRule: Rule, memory: ParserStore) {
        let startState = new LR0ItemSet([new LR0Item(startRule)], 0);
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

    currentStateClosure(): Array<ClosureExpandList> {
        if (this.statePtr >= this.states.length) {
            throw new E.AutomatonStatePtrOutOfRangeError();
        }
        return this.states[this.statePtr].computeClosure(this.memory.rules);
    }

    bfsByStep(): AutomatonBfsStepResult {
        if (this.statePtr >= this.states.length) {
            throw new E.AutomatonStatePtrOutOfRangeError();
        }
        let { nonTerminalTransitions, terminalTransitions } = this.states[this.statePtr].computeTransitions();
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
                target = this.states.length;
                this.states.push(new LR0ItemSet(kernel, target));
            }
            this.states[this.statePtr].setTransition(sym, this.states[target]);
        }
        nonTerminalTransitions.forEach(expand);
        terminalTransitions.forEach(expand);
        this.statePtr++;
        if (this.statePtr >= this.states.length) {
            this.done = true;
        }
        return {
            from: this.states[this.statePtr - 1],
            next: this.states[this.statePtr]
        }
    }

    nextStep(): AutomatonStepResult {
        if (this.done) {
            throw new E.AutomatonDoneInfo();
        }
        if (this.op === 1) {
            this.op = 2;
            return { op: 1, value: this.currentStateClosure() };
        } else {
            this.op = 1;
            return { op: 2, value: this.bfsByStep() };
        }
    }
}

type ActionName = "Shift" | "Reduce" | "Goto" | "Accept";
type ActionAbbr = "s" | "r" | "g" | "acc";
class Action {
    name: ActionName;
    abbr: ActionAbbr;
    arg?: number;
    protected constructor(name: ActionName, abbr: ActionAbbr, arg?: number) {
        this.name = name;
        this.abbr = abbr;
        if (arg !== undefined) {
            this.arg = arg;
        }
    }
    toString() {
        return this.abbr +
            (this.arg === undefined ? "" : this.arg.toString());
    }
}
class Shift extends Action {
    constructor(arg: number) {
        super("Shift", "s", arg);
    }
}
class Reduce extends Action {
    constructor(arg: number) {
        super("Reduce", "r", arg);
    }
}
class Goto extends Action {
    constructor(arg: number) {
        super("Goto", "g", arg);
    }
}
class Accept extends Action {
    constructor() {
        super("Accept", "acc");
    }
}
type ParseTableInner = Array<Map<_Symbol, Action[]>>;
class ParseTable {
    actionTable: Array<Map<_Symbol, Action[]>>;
    gotoTable: Array<Map<_Symbol, Action[]>>;
    conflict: boolean = false;
    private automaton: Automaton;
    private memory: ParserStore;

    constructor(automaton: Automaton, memory: ParserStore) {
        this.automaton = automaton;
        this.memory = memory;
        this.actionTable = new Array(automaton.states.length);
        this.gotoTable = new Array(automaton.states.length);
        for (let i = 0; i < automaton.states.length; i++) {
            this.actionTable[i] = new Map();
            this.gotoTable[i] = new Map();
        }
    }

    toString() {
        let rows: string[][] = [];
        let actionHeader: string[] = [], gotoHeader: string[] = [];
        this.memory.symbolMap.forEach((sym, name) => {
            sym.is_term ? actionHeader.push(name) : gotoHeader.push(name);
        });
        let header = [...actionHeader, ...gotoHeader];
        this.automaton.states.forEach((state, index) => {
            let row: string[] = [index.toString()];
            header.forEach((val) => {
                let sym = this.memory.symbolMap.get(val)!;
                let tmp: Action[] = sym.is_term ? this.actionTable[index].get(sym)! : this.gotoTable[index].get(sym)!;
                row.push(tmp ? tmp.toString() : "");
            });
            rows.push(row);
        });
        header = ["", ...header];
        rows = [header, ...rows];
        let colWidth: number[] = [];
        for (let i = 0; i < rows[0].length; ++i) {
            let width = 0;
            rows.forEach((row) => { width = Math.max(width, row[i].length); });
            colWidth.push(width);
        }
        let actionWidth = actionHeader.length - 1, gotoWidth = gotoHeader.length - 1;
        for (let i = 0; i < actionHeader.length; i++) {
            actionWidth += colWidth[i + 1];
        }
        for (let i = 0; i < gotoHeader.length; i++) {
            gotoWidth += colWidth[i + actionHeader.length + 1];
        }
        actionWidth = Math.max(actionWidth, 6);
        gotoWidth = Math.max(gotoWidth, 4);
        let totalWidth = colWidth[0] + actionWidth + gotoWidth + 2;

        let str = ""
        str += "-".repeat(totalWidth + 2) + "\n";
        str += "|" + " ".repeat(colWidth[0]) + "|ACTION" +
            " ".repeat(actionWidth - 6) + "|GOTO" + " ".repeat(gotoWidth - 4) + "|\n";
        rows.forEach((row) => {
            str += "-".repeat(totalWidth + 2) + "\n|";
            row.forEach((value, index) => { str += value + " ".repeat(colWidth[index] - value.length) + "|"; });
            str += "\n";
        });
        str += "-".repeat(totalWidth + 2);
        return str;
    }

    private insert(table: ParseTableInner, stateId: number, sym: _Symbol, action: Action) {
        if (table[stateId].has(sym)) {
            this.conflict = true;
        } else {
            table[stateId].set(sym, []);
        }
        table[stateId].get(sym)!.push(action);
    }

    compute() {
        this.automaton.states.forEach((state) => {
            state.transitions.forEach((target, sym) => {
                if (sym.is_term) {
                    // GOTO(Ii, a) = Ij ∧ a ∈ T =⇒ ACTION[i, a] ← sj
                    this.insert(this.actionTable, state.id, sym, new Shift(target.id));
                } else {
                    // GOTO(Ii, A) = Ij ∧ A ∈ N =⇒ GOTO[i, A] ← gj
                    this.insert(this.gotoTable, state.id, sym, new Goto(target.id));
                }
            });
            state.closure.forEach((item) => {
                if (item.end()) {
                    if (item.rule.origin.name === SYMBOL_START_NAME) {
                        // [S′ → S·] ∈ Ii =⇒ action[i, $] ← acc
                        this.insert(this.actionTable, state.id, this.memory.symbolEnd, new Accept());
                    } else {
                        // [k : A → α·] ∈ Ii ∧ A ̸= S′ =⇒ ∀t ∈ T ∪ {$}. action[i, t] = rk
                        this.memory.symbolMap.forEach((sym) => {
                            this.insert(this.actionTable, state.id, sym, new Reduce(this.memory.ruleIndexMap.get(item.rule)!));
                        });
                    }
                }
            });
        });
    }
}



interface ParserStore {
    rules: Rule[],
    startRule: Rule,
    ruleIndexMap: Map<Rule, number>,
    symbolMap: Map<string, _Symbol>,
    symbolStart: _Symbol,
    symbolEnd: _Symbol,
}

const SYMBOL_START_NAME = "start";
const SYMBOL_END_NAME = "$END";
const SYMBOL_EPSILON_NAME = "$EPSILON"
const SYMBOL_EPSILON = new Terminal(SYMBOL_EPSILON_NAME);

class ControllableLRParser {

    /**
     * 本程序中token和symbol的区别：
     * symbol表示的是抽象的符号，即文法中的终结符与非终结符。
     * token表示的是具体的内容，即输入流中的每一个此法单元。
     */

    lark: Lark;
    text: string;
    automaton: Automaton;
    tokenList: Token[] = [];
    store: ParserStore;
    currentToken?: Token = undefined;
    parseTable: ParseTable;

    constructor(text: string) {
        this.lark = get_parser();
        this.text = text;
        // 获取所有的符号(Symbol)和所有的产生式(Rule)
        // @ts-ignore
        this.store = {
            rules: this.lark.rules,
            ruleIndexMap: new Map<Rule, number>(),
            symbolMap: new Map<string, _Symbol>(),
        }
        let saveInSymbolMap = (symbol: _Symbol): _Symbol => {
            if (!this.store.symbolMap.has(symbol.name)) {
                this.store.symbolMap.set(symbol.name, symbol);
            }
            let ret = this.store.symbolMap.get(symbol.name)!;
            return ret;
        }
        this.store.rules.forEach((rule, index) => {
            rule.origin = saveInSymbolMap(rule.origin);
            if (rule.origin.name === SYMBOL_START_NAME) {
                this.store.startRule = rule;
                this.store.symbolStart = rule.origin;
            }
            rule.expansion.forEach((sym: _Symbol, i: number, arr: _Symbol[]) => {
                arr[i] = saveInSymbolMap(sym);
            });
            this.store.ruleIndexMap.set(rule, index);
        });
        if (!this.store.startRule) {
            throw new E.StartSymbolNotFoundError();
        }
        this.store.symbolEnd = Terminal.deserialize({ name: SYMBOL_END_NAME, filter_out: false });
        saveInSymbolMap(this.store.symbolEnd);
        this.automaton = new Automaton(this.store.startRule, this.store);
        this.parseTable = new ParseTable(this.automaton, this.store);
    }

    lex() {
        if (this.tokenList.length !== 0) {
            throw new E.LexicalAnalysisDoneInfo();
        }
        // 官方文档写的Lark.lex方法要求lexer="basic"。但从源码中可见，它实际上会自己创建一个临时的BasicLexer
        let tokenGenerator = this.lark.lex(this.text);
        for (let iter = tokenGenerator.next(); !iter.done; iter = tokenGenerator.next()) {
            let token = iter.value;
            this.tokenList.push(token);
        }
        // EOF Token
        this.tokenList.push(new Token(SYMBOL_END_NAME, ""));
        return this.tokenList;
    }

    test() {
        do {
            let r = this.automaton.nextStep();
            console.log(r);
        } while (!this.automaton.done);
        console.log(this.automaton.toString());
        this.parseTable = new ParseTable(this.automaton, this.store);
        this.parseTable.compute();
        console.log(this.parseTable.toString());
    }
}

export { ControllableLRParser as ControllableLalrParser, LR0Item, LR0ItemSet }
