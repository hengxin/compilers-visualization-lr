import * as E from "./parser-exception.js";
import { Tree } from "./tree.js";
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
} from "./lib/new_example.js";

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

    override toString(): string {
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

    override equal(other: LR0Item): boolean {
        if (!(other instanceof LR0Item)) {
            throw new E.TypeNotMatchError()
        }
        return other.rule === this.rule && other.index === this.index;
    }

    override advance(): LR0Item {
        return new LR0Item(this.rule, this.index + 1);
    }
}

/**
 * LR(1) 项 (Item)
 * [A → α · β, a] (a ∈ T ∪ {$})，此处, a 是向前看符号, 数量为 1。
 */
class LR1Item extends LRItem {
    lookahead: _Symbol[] = [];

    constructor(rule: Rule, index: number, lookahead: _Symbol);
    constructor(rule: Rule, index: number, lookahead: _Symbol[]);
    constructor(rule: Rule, index: number = 0, lookahead: _Symbol | _Symbol[]) {
        super(rule, index);
        if (lookahead instanceof _Symbol) {
            this.lookahead.push(lookahead);

        } else {
            this.lookahead = lookahead;
        }
    }

    override toString(): string {
        let s = "[ " + this.rule.origin.name + " ->";
        for (let i = 0; i < this.rule.expansion.length; i++) {
            s += " ";
            if (i === this.index) {
                s += "·";
            }
            s += this.rule.expansion[i].name;
        }
        s += this.end() ? "·, " : ", ";
        for (let i = 0; i < this.lookahead.length; i++) {
            if (i !== 0) {
                s += "/"
            }
            s += this.lookahead[i].name;
        }
        return s + " ]";
    }

    override equal(other: LR1Item): boolean {
        if (!(other instanceof LR1Item)) {
            throw new E.TypeNotMatchError();
        }
        if (other.lookahead.length !== this.lookahead.length) {
            return false;
        }
        // 默认lookahead内不存在重复元素。
        // 因此只需看other.lookahead是否都在this.lookahead出现过。
        for (let i = 0; i < other.lookahead.length; i++) {
            if (!this.lookahead.includes(other.lookahead[i])) {
                return false;
            }
        }
        return other.rule === this.rule && other.index === this.index;
    }

    /**
     * 仅比较两个LR1项的LR0部分是否相同，即产生式和点的位置是否相同，忽略向前看符号。
     */
    equalLR0(other: LR1Item): boolean {
        if (!(other instanceof LR1Item)) {
            throw new E.TypeNotMatchError();
        }
        return other.rule === this.rule && other.index === this.index;
    }

    override advance(): LR1Item {
        return new LR1Item(this.rule, this.index + 1, this.lookahead.slice());
    }
}


/**
 * 项集
 * 是若干项构成的集合。句柄识别自动机的一个状态可以表示为一个项集。
 */
abstract class LRItemSet {
    /**
     * 内核项：包括初始项S' -> ·S以及点不在最左端的所有项。
     * 非内核项：除了S' -> ·S之外的点在最左端的所有项。
     */
    kernel: LRItem[];
    closure: LRItem[];
    id: number = 0;
    transitions: Map<_Symbol, LRItemSet> = new Map();
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
    protected searchIndex: number = 0;

    constructor(kernel: LRItem[], id: number) {
        this.kernel = kernel;
        this.id = id;
        this.closure = [];
        this.kernel.forEach((item) => { this.closure.push(item); });
    }

    abstract toString(): string;

    /**
     * 通过比较kernel是否相同判断项集是否相同
     */
    equal(other: LRItemSet): boolean {
        return this.kernelEqual(other.kernel);
    }

    kernelEqual(otherKer: LRItem[]) {
        if (this.kernel.length !== otherKer.length) {
            return false;
        }
        for (let i = 0; i < otherKer.length; i++) {
            if (!this.inKernel(otherKer[i])) {
                return false;
            }
        }
        return true;
    }

    private inKernel(item: LRItem): boolean {
        for (let i = 0; i < this.kernel.length; i++) {
            if (item.equal(this.kernel[i])) {
                return true;
            }
        }
        return false;
    }

    /**
     * 判断一个LR项是否在闭包内
     */
    have(item: LRItem): boolean {
        for (let i = 0; i < this.closure.length; i++) {
            if (this.closure[i].equal(item)) {
                return true;
            }
        }
        return false;
    }

    abstract computeClosureByStep(all: Rule[]): ClosureExpandList;

    computeClosure(all: Rule[]): ClosureExpandList[] {
        let steps: ClosureExpandList[] = [];
        while (!this.done) {
            let res = this.computeClosureByStep(all);
            steps.push(res);
        }
        return steps;
    }

    setTransition(sym: _Symbol, to: LRItemSet) {
        this.transitions.set(sym, to);
    }

    computeTransitions() {
        let nonTerminalTransitions = new Map<_Symbol, LRItem[]>();
        let terminalTransitions = new Map<_Symbol, LRItem[]>();
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

class LR0ItemSet extends LRItemSet {

    constructor(kernel: LR0Item[], id: number) {
        super(kernel, id);
    }

    override toString(): string {
        let s = "LR0ItemSet " + this.id.toString() + ": \n";
        if (!this.done) {
            s += "Closure not computed.";
        } else {
            this.closure.forEach((item) => { s += item.toString() + "\n"; });
        }
        s += "------------";
        return s;
    }

    override computeClosureByStep(all: Rule[]): ClosureExpandList {
        let stepRes: ClosureExpandList = [];
        if (this.done) {
            throw new E.ItemSetClosureDoneInfo();
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
            if (rightSym === rule.origin) {
                let newPtr = new LR0Item(rule, 0);
                // 如果[B -> ·r]不在闭包中，则将[B -> ·r]加入到闭包
                if (!this.have(newPtr)) {
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
}

class LR1ItemSet extends LRItemSet {
    constructor(kernel: LR1Item[], id: number) {
        super(kernel, id);
    }

    override toString(): string {
        let s = "LR1ItemSet " + this.id.toString() + ": \n";
        if (!this.done) {
            s += "Closure not computed.";
        } else {
            this.closure.forEach((item) => { s += item.toString() + "\n"; });
        }
        s += "------------";
        return s;
    }

    override computeClosureByStep(all: Rule[]): ClosureExpandList {
        let stepRes: ClosureExpandList = [];
        if (this.done) {
            throw new E.ItemSetClosureDoneInfo();
        }
        // 遍历闭包中的每一项[A → α · Bβ, a] ∈ I (a ∈ T ∪ {$})
        let item = this.closure[this.searchIndex] as LR1Item;
        let rightSym: _Symbol = item.rule.expansion[item.index];
        if (!rightSym) {
            this.accepting = true;
            if (item.rule.origin.name === SYMBOL_START_NAME) {
                this.end = true;
            }
        }

        // 寻找产生式B -> r
        for (let rule of all) {
            if (rightSym === rule.origin) {
                let nextSyms: _Symbol[] = item.rule.expansion.slice(item.index + 1);
                item.lookahead.forEach((la) => {
                    // 求FIRST(βa)
                    let terms = this.first([...nextSyms, la]);
                    // 遍历FIRST(βa)中的每个终结符号b，将[B -> ·γ, b]加入到闭包
                    terms.forEach((term) => {
                        let newPtr = new LR1Item(rule, 0, term);
                        if (!this.have(newPtr)) {
                            stepRes.push(newPtr);
                        }
                    });
                });
            }
        }
        this.searchIndex++;
        this.closure.push(...stepRes);
        if (this.searchIndex === this.closure.length) {
            this.done = true;
        }
        return stepRes;
    }

    private first(symbolString: _Symbol[]): Terminal[] {
        let result: Set<Terminal> = new Set();
        for (let i = 0; i < symbolString.length; ++i) {
            result = new Set([...result, ...PARSER_STORE.firstSet.get(symbolString[i])!]);
            if (symbolString[i].is_term || !PARSER_STORE.nullable.has(symbolString[i] as NonTerminal)) {
                break;
            }
            if (i === symbolString.length - 1) {
                result.add(SYMBOL_EPSILON);
            }
        }
        return Array.from(result);
    }

    kernelEqualLr0(otherKer: LR1Item[]): boolean {
        if (this.kernel.length !== otherKer.length) {
            return false;
        }
        for (let i = 0; i < otherKer.length; i++) {
            let f = false;
            for (let j = 0; j < this.kernel.length; j++) {
                if (otherKer[i].equalLR0(this.kernel[j] as LR1Item)) {
                    f = true;
                    break;
                }
            }
            if (!f) {
                return false;
            }
        }
        return true;
    }

    /**
     * 将形如[C -> ·cC, c]、[C -> ·cC, d]的LR(1)项合并为[C -> ·cC, c/d]。
     */
    merge() {
        // 合并时不需要考虑内核项。
        // 1. 如果内核项为[S' -> ·S, $]，自然没有可以与之合并的项。
        // 2. 其余的内核项形如[S -> C·C, a/b]。计算闭包新产生的项均为非内核项，点都在最左端，不会和内核项合并。
        let n: LR1Item[] = [];
        for (let i = this.kernel.length; i < this.closure.length; i++) {
            let find = false;
            for (let j = 0; j < n.length; j++) {
                if (n[j].rule === this.closure[i].rule && n[j].index === this.closure[i].index) {
                    find = true;
                    n[j].lookahead = n[j].lookahead.concat((this.closure[i] as LR1Item).lookahead);
                    break;
                }
            }
            if (!find) {
                n.push(this.closure[i] as LR1Item);
            }
        }
        this.closure = [...this.kernel, ...n];
    }
}

type ClosureExpandList = LRItem[];

type AutomatonState = LRItemSet;
/**
 * 1: 应该计算ptr指向的状态的CLOSURE
 * 2：应该计算ptr指向的状态可转移的状态
 */
type AutomatonOperation = 1 | 2 | 3;
interface AutomatonBfsStepResult {
    from: AutomatonState,
    next: AutomatonState
}
interface AutomatonStepResult {
    op: AutomatonOperation,
    value?: Array<ClosureExpandList> | AutomatonBfsStepResult
}
type Algorithm = "LR0" | "LR1" | "LALR1";
type AutomatonType = "LR0" | "LR1" | "LALR1";
class Automaton {
    /**
     * 自动机的状态集
     */
    states: AutomatonState[] = [];
    done: boolean = false;
    readonly type: AutomatonType;

    private statePtr: number = 0;
    private op: AutomatonOperation = 1;

    constructor(startRule: Rule, type: AutomatonType) {
        // let startState = new LR0ItemSet([new LR0Item(startRule)], 0);
        this.type = type;
        let startState = this.type === "LR0" ? new LR0ItemSet([new LR0Item(startRule, 0)], 0) :
            new LR1ItemSet([new LR1Item(startRule, 0, [SYMBOL_END])], 0);
        this.states.push(startState);
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
        return this.states[this.statePtr].computeClosure(PARSER_STORE.rules);
    }

    bfsByStep(): AutomatonBfsStepResult {
        if (this.statePtr >= this.states.length) {
            throw new E.AutomatonStatePtrOutOfRangeError();
        }
        let { nonTerminalTransitions, terminalTransitions } = this.states[this.statePtr].computeTransitions();
        let stateNum = this.states.length;
        let expand = (kernel: LRItem[], sym: _Symbol): void => {
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
                this.states.push(this.type === "LR0" ? new LR0ItemSet(kernel, target) :
                    new LR1ItemSet(kernel as LR1Item[], target));
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
            if (this.type === "LR0") {
                this.op = 2;
            } else {
                this.op = 3;
            }
            return { op: 1, value: this.currentStateClosure() };
        } else if (this.op === 2) {
            this.op = 1;
            return { op: 2, value: this.bfsByStep() };
        } else {
            this.op = 2;
            (this.states[this.statePtr] as LR1ItemSet).merge();
            return { op: 3 };
        }
    }
}

type ActionName = "Shift" | "Reduce" | "Goto" | "Accept";
type ActionAbbr = "s" | "r" | "g" | "acc";
class Action {
    name: ActionName;
    abbr: ActionAbbr;
    arg: number;
    protected constructor(name: ActionName, abbr: ActionAbbr, arg: number) {
        this.name = name;
        this.abbr = abbr;
        this.arg = arg;
    }
    toString() {
        return this.abbr +
            (this.name === "Accept" ? "" : this.arg.toString());
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
        super("Accept", "acc", -1);
    }
}
type ParseTableInner = Array<Map<_Symbol, Action[]>>;
class ParseTable {
    actionTable: ParseTableInner;
    gotoTable: ParseTableInner;
    conflict: boolean = false;
    private automaton: Automaton;

    constructor(automaton: Automaton) {
        this.automaton = automaton;
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
        PARSER_STORE.symbolMap.forEach((sym, name) => {
            sym.is_term ? actionHeader.push(name) : gotoHeader.push(name);
        });
        let header = [...actionHeader, ...gotoHeader];
        this.automaton.states.forEach((state, index) => {
            let row: string[] = [index.toString()];
            header.forEach((val) => {
                let sym = PARSER_STORE.symbolMap.get(val)!;
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
                        // LR0: [S′ → S·] ∈ Ii =⇒ action[i, $] ← acc
                        // LR1: [S′ → S·, $] ∈ Ii =⇒ action[i, $] ← acc
                        this.insert(this.actionTable, state.id, SYMBOL_END, new Accept());
                    } else {
                        if (this.automaton.type === "LR0") {
                            // [k : A → α·] ∈ Ii ∧ A ̸= S′ =⇒ ∀t ∈ T ∪ {$}. action[i, t] = rk
                            PARSER_STORE.symbolMap.forEach((sym) => {
                                this.insert(this.actionTable, state.id, sym, new Reduce(PARSER_STORE.ruleIndexMap.get(item.rule)!));
                            });
                        } else if (this.automaton.type === "LR1") {
                            // [k : A → α·, a] ∈ Ii ∧ A ̸= S′ =⇒ action[i, a] = rk
                            (item as LR1Item).lookahead.forEach((sym) => {
                                this.insert(this.actionTable, state.id, sym, new Reduce(PARSER_STORE.ruleIndexMap.get(item.rule)!));
                            });
                        } else {

                        }
                    }
                }
            });
        });
    }

    get(tableName: "ACTION" | "GOTO", stateId: number, symbol: _Symbol): Action | undefined {
        let table = tableName === "ACTION" ? this.actionTable : this.gotoTable;
        let actions = table[stateId].get(symbol);
        return actions === undefined ? actions : actions[0];
    }
}

const PARSER_STORE = {
    rules: [] as Rule[],
    startRule: undefined as unknown as Rule,
    ruleIndexMap: new Map<Rule, number>(),
    symbolMap: new Map<string, _Symbol>(),
    // symbolStart: undefined as unknown as _Symbol,
    /**
     * 注意：这里firstSet每个符号的FIRST集合中都没有包括ε。
     * 若想得知某个符号的FIRST集合是否包括ε，可通过nullable.has(symbol)的真值判断。
     */
    firstSet: new Map<_Symbol, Set<Terminal>>(),
    nullable: new Set<NonTerminal>(),
    stateStack: [] as number[],
    valueStack: [] as Tree[],
}

const SYMBOL_START_NAME = "start";
const SYMBOL_START = Terminal.deserialize({ name: SYMBOL_START_NAME, filter_out: false });
const SYMBOL_END_NAME = "$END";
const SYMBOL_END = Terminal.deserialize({ name: SYMBOL_END_NAME, filter_out: false });
const SYMBOL_EPSILON_NAME = "$EPSILON"
const SYMBOL_EPSILON = Terminal.deserialize({ name: SYMBOL_EPSILON_NAME, filter_out: false });

/**
 * 判断b是否为a的子集
 */
function subset(a: Set<any>, b: Set<any>): boolean {
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

class ControllableLRParser {

    /**
     * 本程序中token和symbol的区别：
     * symbol表示的是抽象的符号，即文法中的终结符与非终结符。
     * token表示的是具体的内容，即输入流中的每一个此法单元。
     */

    lark: Lark;
    text: string;
    readonly algo: Algorithm;
    automaton: Automaton;
    tokenList: Token[] = [];
    currentToken: Token;
    parseTable: ParseTable;
    private tokenPtr: number = -1;
    done: boolean = false;

    constructor(text: string, algo: Algorithm) {
        this.lark = get_parser();
        this.text = text;
        this.algo = algo;
        // 获取所有的符号(Symbol)和所有的产生式(Rule)
        PARSER_STORE.rules = this.lark.rules;
        const saveInSymbolMap = (symbol: _Symbol): _Symbol => {
            if (!PARSER_STORE.symbolMap.has(symbol.name)) {
                PARSER_STORE.symbolMap.set(symbol.name, symbol);
            }
            let ret = PARSER_STORE.symbolMap.get(symbol.name)!;
            return ret;
        }
        saveInSymbolMap(SYMBOL_START);
        saveInSymbolMap(SYMBOL_END);
        PARSER_STORE.rules.forEach((rule, index) => {
            if (rule.origin.name === SYMBOL_START_NAME) {
                PARSER_STORE.startRule = rule;
            }
            rule.origin = saveInSymbolMap(rule.origin);
            rule.expansion.forEach((sym: _Symbol, i: number, arr: _Symbol[]) => {
                arr[i] = saveInSymbolMap(sym);
            });
            PARSER_STORE.ruleIndexMap.set(rule, index);
        });
        if (!PARSER_STORE.startRule) {
            throw new E.StartSymbolNotFoundError();
        }
        this.automaton = new Automaton(PARSER_STORE.startRule, this.algo);
        this.parseTable = new ParseTable(this.automaton);
        if (this.algo !== "LR0") {
            this.computeFirstSet();
        }

        this.lex();
        PARSER_STORE.stateStack.push(0);
        this.currentToken = this.nextToken();
    }

    /**
     * 计算FIRST集合。
     * 算法参考链接：https://lara.epfl.ch/w/cc09:algorithm_for_first_and_follow_sets
     */
    private computeFirstSet() {
        let finish = true;

        PARSER_STORE.symbolMap.forEach((sym) => {
            PARSER_STORE.firstSet.set(sym, sym.is_term ? new Set([sym as Terminal]) : new Set());
        });
        do {
            finish = true;
            PARSER_STORE.rules.forEach((rule) => {
                if (rule.expansion.length === 0 ||
                    subset(PARSER_STORE.nullable, new Set([...rule.expansion]))) {
                    let before = PARSER_STORE.nullable.size;
                    PARSER_STORE.nullable.add(rule.origin);
                    PARSER_STORE.nullable.size === before ? undefined : finish = false;
                }
                for (let i = 0; i < rule.expansion.length; i++) {
                    if (i === 0 || subset(PARSER_STORE.nullable, new Set(rule.expansion.slice(0, i)))) {
                        let before = PARSER_STORE.firstSet.get(rule.origin)!.size;
                        PARSER_STORE.firstSet.set(rule.origin,
                            new Set([...PARSER_STORE.firstSet.get(rule.origin)!, ...PARSER_STORE.firstSet.get(rule.expansion[i])!]));
                        PARSER_STORE.firstSet.get(rule.origin)!.size === before ? undefined : finish = false;
                    }
                }
            });
        } while (!finish);
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

    initParse() {
        // PARSER_STORE.stateStack.push(0);
        // this.nextToken();
    }

    parseByStep() {
        let stateId = PARSER_STORE.stateStack[PARSER_STORE.stateStack.length - 1];
        let symOfCurrToken = PARSER_STORE.symbolMap.get(this.currentToken.type)!;
        let action = this.parseTable.get("ACTION", stateId, symOfCurrToken);
        if (action === undefined) {
            throw new E.ActionNotExistError();
        } else if (action.name === "Shift") {
            PARSER_STORE.stateStack.push(action.arg);
            PARSER_STORE.valueStack.push(new Tree(symOfCurrToken, this.currentToken.value));
            this.nextToken();
        } else if (action.name === "Reduce") {
            let rule = PARSER_STORE.rules[action.arg];
            let size = rule.expansion.length;
            // 这两个值可供以后用
            let statePops = PARSER_STORE.stateStack.splice(-size);
            let valuePops = PARSER_STORE.valueStack.splice(-size);
            let top = PARSER_STORE.stateStack[PARSER_STORE.stateStack.length - 1];
            let goto = this.parseTable.get("GOTO", top, rule.origin);
            if (goto === undefined) {
                throw new E.ActionNotExistError();
            }
            PARSER_STORE.stateStack.push(goto.arg);
            PARSER_STORE.valueStack.push(new Tree(rule.origin, valuePops));
        } else {
            this.done = true;
        }
        return {
            stateStack: PARSER_STORE.stateStack,
            valueStack: PARSER_STORE.valueStack
        };
    }

    private nextToken(): Token {
        this.tokenPtr++;
        if (this.tokenPtr >= this.tokenList.length) {
            throw new E.TokenPtrOutOfRangeError();
        }
        this.currentToken = this.tokenList[this.tokenPtr];
        return this.currentToken;
    }

    test() {
        do {
            let r = this.automaton.nextStep();
            console.log(r);
        } while (!this.automaton.done);
        console.log(this.automaton.toString());
        this.parseTable = new ParseTable(this.automaton);
        this.parseTable.compute();
        console.log(this.parseTable.toString());
    }
}

export { ControllableLRParser as ControllableLalrParser, LR0Item, LR0ItemSet }
