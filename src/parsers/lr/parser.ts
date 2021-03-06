import { ParserError, ParserInfo, PARSER_EXCEPTION_MSG } from "./exception";
import { Tree } from "./tree";
import {
    Token,
    Rule,
    _Symbol,
    Terminal,
    NonTerminal,
    SYMBOL_START, SYMBOL_END, SYMBOL_EPSILON, SYMBOL_SHARP,
    TERMINAL_NAMES_REVERSE,
} from "./grammar";

/**
 * LR(0) 项 (Item)：
 * 文法 G 的一个 LR(0) 项是 G 的某个产生式加上一个位于体部的点。
 * 例：[A → ·XYZ]
 * 
 * LR(1) 项 (Item)：
 * [A → α · β, a] (a ∈ T ∪ {$})，此处, a 是向前看符号, 数量为 1。
 */
class LRItem {
    rule: Rule;
    readonly index: number;
    lookahead: Set<_Symbol>;

    constructor(rule: Rule, index: number);
    constructor(rule: Rule, index: number, lookahead?: _Symbol);
    constructor(rule: Rule, index: number, lookahead: Iterable<_Symbol>);
    constructor(rule: Rule, index: number = 0, lookahead?: _Symbol | Iterable<_Symbol>) {
        if (index > rule.expansion.length) {
            throw new ParserError(PARSER_EXCEPTION_MSG.LR_ITEM_INDEX_OUT_OF_RANGE);
        }
        this.rule = rule;
        this.index = index;
        if (lookahead === undefined) {
            this.lookahead = new Set<_Symbol>();
        } else if (lookahead instanceof _Symbol) {
            this.lookahead = new Set<_Symbol>();
            this.lookahead.add(lookahead)
        } else {
            this.lookahead = new Set<_Symbol>([...lookahead]);
        }
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
        if (this.lookahead.size === 0) {
            return s + (this.end() ? "·" : "") + " ]";
        } else {
            s += this.end() ? "·, " : ", ";
            let flag = true;
            this.lookahead.forEach((la) => {
                if (flag) {
                    flag = false;
                } else {
                    s += "/";
                }
                s += la.name;
            });
            return s + " ]";
        }
    }

    equal(other: LRItem): boolean {
        if (other.lookahead.size !== this.lookahead.size) {
            return false;
        }
        return this.equalIncludes(other);
    }

    /**
     * 只要两个LR1项的产生式和点的位置相同，且此LR1项的向前看符号集合包含了other的所有向前看符号即为真。
     * （即不要求二者的向前看符号集合完全一致）
     */
    equalIncludes(other: LRItem): boolean {
        for (let la of other.lookahead) {
            if (!this.lookahead.has(la)) {
                return false;
            }
        }
        return other.rule === this.rule && other.index === this.index;
    }

    /**
     * 仅比较两个LR1项的LR0部分是否相同，即产生式和点的位置是否相同，忽略向前看符号。
     */
    equalLR0(other: LRItem): boolean {
        return other.rule === this.rule && other.index === this.index;
    }

    end(): boolean {
        return this.index === this.rule.expansion.length;
    }

    /**
     * 如果this.end()为false，则返回对应的Symbol。
     * 如果this.end()为true，则返回undefined。
     */
    current(): _Symbol | undefined {
        return this.rule.expansion[this.index];
    }

    advance(): LRItem {
        return new LRItem(this.rule, this.index + 1, this.lookahead);
    }

    /**
     * 向LR项添加向前看符号。
     * @returns {boolean} 返回值为真表示添加成功，返回值为假表示此向前看符号已经存在该LR项中。
     */
    appendLookahead(symbol: _Symbol): boolean;
    appendLookahead(symbol: Iterable<_Symbol>): boolean;
    appendLookahead(symbol: _Symbol | Iterable<_Symbol>): boolean {
        let _size = this.lookahead.size;
        if (symbol instanceof _Symbol) {
            this.lookahead.add(symbol);
        } else {
            this.lookahead = new Set([...this.lookahead, ...symbol]);
        }
        return !(this.lookahead.size === _size);
    }

    clearLookahead() {
        this.lookahead.clear();
    }

    clone(): LRItem {
        return new LRItem(this.rule, this.index, this.lookahead);
    }
}

type ClosureAlgorithm = "LR0" | "LR1";
type FirstResult = { symbolString: Array<_Symbol>, firstSet: Array<Terminal> }
type ClosureStepItem = { item: LRItem, existed: boolean };
type ClosureStep = {
    first?: Array<FirstResult>,
    step: Array<ClosureStepItem>,
}
type ClosureSteps = Array<ClosureStep>
/**
 * 项集
 * 是若干项构成的集合。句柄识别自动机的一个状态可以表示为一个项集。
 */
class LRItemSet {
    /**
     * 内核项：包括初始项S' -> ·S以及点不在最左端的所有项。
     * 非内核项：除了S' -> ·S之外的点在最左端的所有项。
     */
    kernel: LRItem[];
    closure: LRItem[];
    id: number = 0;
    /**
     * 闭包是否计算完成
     */
    closureDone: boolean = false;
    /**
     * 是否为接受状态
     */
    accepting: boolean = false;
    /**
     * 是否为结束状态
     */
    end: boolean = false;
    appended: boolean = false;
    private searchIndex: number = 0;

    constructor(kernel: LRItem[], id: number) {
        this.kernel = kernel;
        this.id = id;
        this.closure = [];
        this.kernel.forEach((item) => {
            this.closure.push(item);
            const rightSym = item.current();
            if (!rightSym) {
                this.accepting = true;
                if (item.rule.origin === SYMBOL_START) {
                    this.end = true;
                }
            }
        });
    }

    toString(): string {
        let s = "ItemSet " + this.id.toString() + ": \n";
        if (!this.closureDone) {
            s += "Closure not calculated.";
        } else {
            this.closure.forEach((item) => { s += item.toString() + "\n"; });
        }
        s += "------------";
        return s;
    }

    initClosure() {
        this.closure = [];
        this.closureDone = false;
        this.searchIndex = 0;
        this.kernel.forEach((item) => { this.closure.push(item); });
    }

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

    calcClosure(algo: ClosureAlgorithm): ClosureSteps {
        if (this.closureDone) {
            throw new ParserInfo(PARSER_EXCEPTION_MSG.LR_ITEM_SET_CLOSURE_HAVE_CALCULATED);
        }
        let closureSteps: ClosureSteps = [];
        while (!this.closureDone) {
            let stepRes: ClosureStep = { step: [] };
            // 遍历闭包中的每一项[A -> a·Bb]
            let item = this.closure[this.searchIndex];
            const rightSym = item.current();
            // **这段代码功能转移到构造函数**
            // 如果rightSym为undefined，说明某一个LR(0)项的index已经到了末尾，那么这个项集对应的状态为接受状态。
            // if (!rightSym) {
            //     this.accepting = true;
            //     if (item.rule.origin === SYMBOL_START) {
            //         this.end = true;
            //     }
            // }
            // 寻找产生式B -> r
            for (let rule of PARSER_STORE.rules) {
                if (rightSym === rule.origin) {
                    if (algo === "LR0") {
                        let newPtr = new LRItem(rule, 0);
                        // 如果[B -> ·r]不在闭包中，则将[B -> ·r]加入到闭包
                        if (!this.have(newPtr)) {
                            stepRes.step.push({ item: newPtr, existed: false });
                            this.closure.push(newPtr);
                        } else {
                            // 表示[B -> ·r]已经在闭包内
                            stepRes.step.push({ item: newPtr, existed: true });
                        }
                    } else if (algo === "LR1") {
                        let nextSyms: _Symbol[] = item.rule.expansion.slice(item.index + 1);
                        stepRes.first = [];
                        item.lookahead.forEach((la) => {
                            // 求FIRST(βa)
                            const symbolString = [...nextSyms, la]
                            let terms = first(symbolString);
                            // 遍历FIRST(βa)中的每个终结符号b，将[B -> ·γ, b]加入到闭包
                            terms.forEach((term) => {
                                let newPtr = new LRItem(rule, 0, term);
                                if (!this.have(newPtr)) {
                                    stepRes.first?.push({ symbolString, firstSet: terms });
                                    stepRes.step.push({ item: newPtr, existed: false });
                                    this.closure.push(newPtr);
                                } else {
                                    stepRes.first?.push({ symbolString, firstSet: terms });
                                    stepRes.step.push({ item: newPtr, existed: true });
                                }
                            });
                        });
                    }
                }
            }
            this.searchIndex++;
            if (this.searchIndex === this.closure.length) {
                this.closureDone = true;
            }
            closureSteps.push(stepRes);
        }
        return closureSteps;
    }

    /**
     * 判断一个LR项是否在闭包内
     */
    private have(item: LRItem): boolean {
        for (let i = 0; i < this.closure.length; i++) {
            if (this.closure[i].equalIncludes(item)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 比较两个项集核心的LR0部分是否一致。即两个项集的内核项，忽略向前看符号，比较是否一致。
     */
    lr0kernelEqual(other: LRItemSet): boolean {
        if (this.kernel.length !== other.kernel.length) {
            return false;
        }
        for (let i = 0; i < other.kernel.length; i++) {
            let f = false;
            for (let j = 0; j < this.kernel.length; j++) {
                if (other.kernel[i].equalLR0(this.kernel[j])) {
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
    mergeLookaheads() {
        // 合并时不需要考虑内核项。因为：
        // 1. 如果内核项为[S' -> ·S, $]，自然没有可以与之合并的项。
        // 2. 其余的内核项形如[S -> C·C, a/b]。计算闭包新产生的项均为非内核项，点都在最左端，不会和内核项合并。
        let n: LRItem[] = [];
        for (let i = this.kernel.length; i < this.closure.length; i++) {
            let find = false;
            for (let j = 0; j < n.length; j++) {
                if (n[j].rule === this.closure[i].rule && n[j].index === this.closure[i].index) {
                    find = true;
                    n[j].lookahead = new Set<_Symbol>([...n[j].lookahead, ...this.closure[i].lookahead]);
                    break;
                }
            }
            if (!find) {
                n.push(this.closure[i].clone());
            }
        }
        this.closure = [...this.kernel, ...n];
    }

    /**
     * 将两个LR1项集合并。会修改此LR1项集。
     * 
     * 注意：判断两个LR1项集的LR0核心是否一致不在本方法的职责内。
     * 且合并后transitions关系也需要额外更新。
     */
    mergeLr1ItemSet(other: LRItemSet) {
        other.closure.forEach((item) => {
            for (let i = 0; i < this.closure.length; i++) {
                if (this.closure[i].equalLR0(item)) {
                    this.closure[i].lookahead = new Set<_Symbol>([
                        ...this.closure[i].lookahead, ...item.lookahead]);
                }
            }
        });
    }

    /**
     * 获得LR项在本项集内核中的序号。如果LR项不在本项集中，则返回-1。
     */
    getItemIndex(item: LRItem): number {
        for (let i = 0; i < this.kernel.length; i++) {
            if (this.kernel[i].equal(item)) {
                return i;
            }
        }
        return -1;
    }
}

type AutomatonState = LRItemSet;
type ParseAlgorithm = "LR0" | "LR1" | "LR1_LALR1" | "LR0_LALR1";

interface StateClosureResult { state: LRItemSet, steps: ClosureSteps }
interface AppendStateResult { from: number, targets: Array<{ symbol: _Symbol, state: LRItemSet }> }
interface MergeLr1StatesResult {
    mergeMap: Map<number, number>,
    transitionChanges: Map<number, Array<{ symbol: _Symbol, from: number, to: number }>>,
}

class Automaton {
    /**
     * 自动机的状态集
     */
    states: AutomatonState[] = [];
    done: boolean = false;
    readonly type: ParseAlgorithm;
    /**
     * 状态转移关系表：
     * transitions[i].get(X)表示下标为i的项集Ii，通过符号X转移到了项集Ij。
     */
    transitions: Map<number, Map<_Symbol, number>> = new Map();
    transitionsRule: Map<number, Map<_Symbol, Rule>> = new Map();
    /**
     * 向前看符号的传播关系：
     * 项集Ii的第k个内核项，会影响若干项集Ij的第m个内核项。
     */
    effects: Array<Array<Array<[number, number]>>> = [];
    propagated: boolean = false;
    private spontaneouslyGenerated: boolean = false;

    constructor(type: ParseAlgorithm) {
        this.type = type;
        let startState = new LRItemSet(
            [new LRItem(PARSER_STORE.startRule!, 0,
                this.type === "LR0" || this.type === "LR0_LALR1" ? undefined : SYMBOL_END)], 0);
        this.states.push(startState);
    }

    toString(): string {
        let s = "";
        this.states.forEach((state) => {
            if (state === undefined) {
                return; // return箭头函数，即跳过一个foreach
            }
            s += state.toString() + "\n";
        });
        return s;
    }

    CalcStateClosure(stateId: number, algo: ParseAlgorithm): StateClosureResult {
        if (this.states[stateId] === undefined) {
            throw new ParserError(PARSER_EXCEPTION_MSG.AUTOMATON_STATES_NOT_FOUND);
        }
        let steps: ClosureSteps;
        if (algo === "LR0" || algo === "LR0_LALR1") {
            steps = this.states[stateId].calcClosure("LR0");
        } else {
            steps = this.states[stateId].calcClosure("LR1");
        }
        return { state: this.states[stateId], steps };
    }

    AppendStates(stateId: number): AppendStateResult {
        if (this.states[stateId] === undefined) {
            throw new ParserError(PARSER_EXCEPTION_MSG.AUTOMATON_STATES_NOT_FOUND);
        }
        let state = this.states[stateId];
        if (!state.closureDone) {
            let closureAvailable = false;
            // 如果确实计算不出非内核项，那不计算也就无所谓了
            for (let i = 0; i < state.kernel.length; i++) {
                let cur = state.kernel[i].current();
                if (cur === undefined || cur.isTerm) {
                    continue;
                }
                closureAvailable = true;
            }
            if (closureAvailable) {
                throw new ParserInfo(PARSER_EXCEPTION_MSG.AUTOMATON_STATE_CLOSURE_NEED_CALCULATE);
            } else {
                state.closureDone = true;
            }
        }
        if (state.appended) {
            throw new ParserInfo(PARSER_EXCEPTION_MSG.AUTOMATON_STATE_CLOSURE_HAVE_APPENDED);
        }
        state.appended = true;
        let transitionKernelMap = new Map<_Symbol, Array<LRItem>>();
        let transitionRuleMap = new Map<_Symbol, Rule>();
        state.closure.forEach((item) => {
            if (!item.end()) {
                let sym = item.current()!;
                if (!transitionKernelMap.has(sym)) {
                    transitionKernelMap.set(sym, []);
                }
                transitionKernelMap.get(sym)!.push(item.advance());

                // 记录状态转移操作是哪条产生式提供的，如果有多条，记录优先级最高的那条。
                let transRule = transitionRuleMap.get(sym);
                if (transRule === undefined) {
                    transitionRuleMap.set(sym, item.rule);
                } else {
                    if (item.rule.priority > transRule.priority ||
                        (item.rule.priority === transRule.priority && item.rule.order > transRule.order)) {
                        transitionRuleMap.set(sym, item.rule);
                    }
                }
            }
        });
        this.transitionsRule.set(stateId, transitionRuleMap);
        let stateNum = this.states.length;
        let trans = new Map<_Symbol, number>();
        let targetArr: Array<{ symbol: _Symbol, state: LRItemSet }> = [];
        transitionKernelMap.forEach((kernel: Array<LRItem>, sym: _Symbol): void => {
            let target = -1;
            // 从一个项集GOTO操作，检查GOTO(I,X)是否已经存在
            for (let i = 0; i < stateNum; i++) {
                if (this.states[i].kernelEqual(kernel)) {
                    target = i;
                    break;
                }
            }
            if (target === -1) {
                target = this.states.length;
                let newState = new LRItemSet(kernel, target);
                // 生成新项集的同时也直接算出是否需要计算闭包和GOTO操作
                let closureAvailable = false;
                let appendAvailable = false;
                for (let i = 0; i < newState.kernel.length; i++) {
                    let cur = newState.kernel[i].current();
                    if (cur !== undefined) {
                        appendAvailable = true;
                        if (!cur.isTerm) {
                            closureAvailable = true;
                        }
                    }
                }
                newState.closureDone = !closureAvailable;
                newState.appended = !appendAvailable;
                this.states.push(newState);
            }
            trans.set(sym, target);
            targetArr.push({ symbol: sym, state: this.states[target] });
        });
        this.transitions.set(stateId, trans);
        return { from: stateId, targets: targetArr };
    }

    MergeLookaheads(stateId: number) {
        if (this.states[stateId] === undefined) {
            throw new ParserError(PARSER_EXCEPTION_MSG.AUTOMATON_STATES_NOT_FOUND);
        }
        this.states[stateId].mergeLookaheads();
        return this.states[stateId];
    }

    mergeLr1(): MergeLr1StatesResult {
        if (this.type !== "LR1_LALR1") {
            throw new ParserError(PARSER_EXCEPTION_MSG.INVALID_OPERATION);
        }
        // mergeMap(a, b)表示id为a的状态合并到了id为b的状态
        let mergeMap = new Map<number, number>();
        for (let i = 0; i < this.states.length; i++) {
            // 被合并的state会被删除，因此需要判断是否为undefined。
            if (this.states[i] === undefined) {
                continue;
            }
            for (let j = i + 1; j < this.states.length; j++) {
                if (this.states[j] === undefined) {
                    continue;
                }
                if (this.states[i].lr0kernelEqual(this.states[j])) {
                    // 合并LR1项集，记录合并位置，并删除被合并的项集。
                    mergeMap.set(this.states[j].id, this.states[i].id);
                    this.states[i].mergeLr1ItemSet(this.states[j]);
                    this.transitions.delete(this.states[j].id);
                    delete this.states[j];
                }
            }
        }
        const transitionChanges: Map<number,
            Array<{ symbol: _Symbol, from: number, to: number }>> = new Map();
        // 更新合并后项集的transition
        this.states.forEach((state) => {
            // forEach不会导致state出现undefined，因为被delete的会直接跳过
            let trans = this.transitions.get(state.id);
            if (trans === undefined) {
                return // continue for-each loop
            }
            let entries = trans.entries();
            let changes = [];
            for (let entry of entries) {
                let newId = mergeMap.get(entry[1]);
                if (newId !== undefined) {
                    trans.set(entry[0], newId);
                    changes.push({ symbol: entry[0], from: entry[1], to: newId });
                }
            }
            if (changes.length !== 0) {
                transitionChanges.set(state.id, changes);
            }
        });
        return { mergeMap, transitionChanges };
    }

    /**
     * 发现传播的和自发生成的向前看符号。
     * 见《编译原理》算法4.62，图4-45。
     */
    propagatedAndSpontaneouslyGenerate() {
        if (this.type !== "LR0_LALR1") {
            throw new ParserError(PARSER_EXCEPTION_MSG.INVALID_OPERATION);
        }
        /** 等价于图4-47的INIT列。　*/
        let generates = new Map<number, Map<number, Set<_Symbol>>>();
        generates.set(0, new Map<number, Set<_Symbol>>().set(0, new Set([SYMBOL_END])));
        this.states.forEach((state) => {
            let stateEffect: Array<Array<[number, number]>> = [];
            // 为内核K的每个项[A -> α·β]，计算CLOSURE({[A -> α·β, #]})。其中#为一个文法中不存在的符号。
            state.kernel.forEach((item) => {
                if (item.end()) {
                    stateEffect.push([]);
                    return; // continue for-each loop
                }
                let itemEffect: Array<[number, number]> = [];
                let tmpItemSet = new LRItemSet([new LRItem(item.rule, item.index, SYMBOL_SHARP)], -1);
                tmpItemSet.calcClosure("LR1");
                tmpItemSet.closure.forEach((item) => {
                    if (item.end()) {
                        return; // continue for-each loop
                    }
                    // 正常的流程中这里不会进行向前看符号的合并，因此向前看符号一定只有一个。
                    let lookahead = Array.from(item.lookahead)[0];
                    let trans = this.transitions.get(state.id)!;
                    let target = trans.get(item.current()!);
                    if (target === undefined) {
                        throw new ParserError(PARSER_EXCEPTION_MSG.FATAL_ERROR);
                    }
                    let advancedItem = item.advance();
                    advancedItem.clearLookahead();
                    let targetItem = this.states[target].getItemIndex(advancedItem);
                    if (targetItem === -1) {
                        throw new ParserError(PARSER_EXCEPTION_MSG.FATAL_ERROR);
                    }
                    if (lookahead === SYMBOL_SHARP) {
                        // 向前看符号将会发生传播
                        itemEffect.push([target, targetItem]);
                    } else {
                        // 自发生成了向前看符号
                        if (!generates.has(target)) {
                            generates.set(target, new Map<number, Set<_Symbol>>());
                        }
                        let t = generates.get(target)!;
                        if (!t.has(targetItem)) {
                            t.set(targetItem, new Set<_Symbol>());
                        }
                        t.get(targetItem)!.add(lookahead);
                    }
                });
                stateEffect.push(itemEffect);
            });
            this.effects.push(stateEffect);
        });
        generates.forEach((_, stateId) => {
            _.forEach((m, itemIndex) => {
                this.states[stateId].kernel[itemIndex].appendLookahead(m);
            });
        });
        return generates;
    }

    /**
     * 对所有项集的内核项进行扫描，将向前看符号进行传播。
     */
    pass() {
        if (this.type !== "LR0_LALR1") {
            throw new ParserError(PARSER_EXCEPTION_MSG.INVALID_OPERATION);
        }
        if (this.propagated) {
            throw new ParserError(PARSER_EXCEPTION_MSG.LOOKAHEADS_HAVE_PROPAGATED);
        }
        if (!this.spontaneouslyGenerated) {
            throw new ParserError(PARSER_EXCEPTION_MSG.NEED_SPONTANEOUSLY_GENERATE);
        }
        let increased = false;
        this.states.forEach((state) => state.kernel.forEach((item, itemIndex) => {
            let effect = this.effects[state.id][itemIndex];
            effect.forEach((pair) => {
                let _ = this.states[pair[0]].kernel[pair[1]].appendLookahead(item.lookahead);
                increased = increased || _;
            });
        }));
        if (!increased) {
            this.propagated = true;
        }
        // return值待定
    }

    /**
     * 本方法仅针对通过LR0生成LALR1。在自发生成向前看符号并传播结束后，再重新计算闭包。
     * 
     * 不调用本方法，直接计算LR分析表，对于大多数情况来说是正确的。
     * 因为每个项集的内核项都已计算完毕，状态之间的转移也计算过。多数情况下确定了所有内核项的向前看符号即可计算出LR分析表。
     * 但是如果有某个产生式能推出空串（即[A -> ·]），则仅凭内核项不足以计算出正确的LR分析表。可见ParseTable.calc中的解释。
     */
    reCalc() {
        if (this.type !== "LR0_LALR1") {
            throw new ParserError(PARSER_EXCEPTION_MSG.INVALID_OPERATION);
        }
        this.states.forEach((state) => {
            state.initClosure();
            state.calcClosure("LR1");
            state.mergeLookaheads();
        });
    }
}

type ActionName = "Shift" | "Reduce" | "Goto" | "Accept";
type ActionAbbr = "s" | "r" | "g" | "acc";
class Action {
    name: ActionName;
    abbr: ActionAbbr;
    arg: number;
    rule: Rule;
    protected constructor(name: ActionName, abbr: ActionAbbr, arg: number, rule: Rule) {
        this.name = name;
        this.abbr = abbr;
        this.arg = arg;
        this.rule = rule;
    }
    toString() {
        return this.abbr +
            (this.name === "Accept" ? "" : this.arg.toString());
    }
}
class Shift extends Action {
    constructor(arg: number, rule: Rule) {
        super("Shift", "s", arg, rule);
    }
}
class Reduce extends Action {
    constructor(arg: number, rule: Rule) {
        super("Reduce", "r", arg, rule);
    }
}
class Goto extends Action {
    constructor(arg: number, rule: Rule) {
        super("Goto", "g", arg, rule);
    }
}
class Accept extends Action {
    constructor() {
        super("Accept", "acc", -1, PARSER_STORE.startRule!);
    }
}
type ParseTableInner = Map<number, Map<_Symbol, Array<Action>>>;
class ParseTable {
    actionTable: ParseTableInner = new Map();
    gotoTable: ParseTableInner = new Map();
    actionHeader: Array<_Symbol> = [];
    gotoHeader: Array<_Symbol> = [];
    conflict: boolean = false;
    done: boolean = false;
    private automaton: Automaton;

    constructor(automaton: Automaton) {
        this.automaton = automaton;
    }

    toString() {
        let rows: string[][] = [];
        let actionHeader: string[] = [], gotoHeader: string[] = [];
        PARSER_STORE.symbolMap.forEach((sym, name) => {
            if (sym === SYMBOL_START) {
                return // continue for-each loop
            }
            sym.isTerm ? actionHeader.push(name) : gotoHeader.push(name);
        });
        let header = [...actionHeader, ...gotoHeader];
        this.automaton.states.forEach((state, index) => {
            let row: string[] = [index.toString()];
            header.forEach((val) => {
                let sym = PARSER_STORE.symbolMap.get(val)!;
                let tmp: Action[] = sym.isTerm ? this.actionTable.get(state.id)!.get(sym)! : this.gotoTable.get(state.id)!.get(sym)!;
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

    /**
     * 填入LR分析表的同时处理二义性的问题。基本处理原则为：
     * 
     * 1.比较动作对应产生式的优先级，优先级高的产生式对应的动作优先。
     * 
     * 2.如果产生式的左侧相同（即书写文法定义时由同一个符号产生文法规则），书写顺序靠后的产生式对应的动作优先。
     * 
     * 3.其余情况无法比较优先级，移入/规约冲突优先选择移入动作，规约/规约冲突选择的动作不确定。
     */
    private insert(table: ParseTableInner, stateId: number, sym: _Symbol, action: Action) {
        let actions = table.get(stateId)!.get(sym);
        if (actions === undefined) {
            table.get(stateId)!.set(sym, [action]);
        } else {
            this.conflict = true;
            actions.push(action);
            actions.sort((a, b): number => {
                if (a instanceof Goto || b instanceof Goto) {
                    throw new ParserError(PARSER_EXCEPTION_MSG.FATAL_ERROR);
                }
                // 注意从大到小排序。无法比较优先级则返回相等
                if (a.rule.priority === b.rule.priority) {
                    if (a.rule.origin === b.rule.origin) {
                        if (b.rule.order !== a.rule.order) {
                            return b.rule.order - a.rule.order;
                        }
                    }
                    if (a instanceof Shift) {
                        return -1;
                    }
                    if (b instanceof Shift) {
                        return 1;
                    }
                    return 0;
                } else {
                    return b.rule.priority - a.rule.priority;
                }
            });
        }
    }

    calc() {
        if (this.done) {
            throw new ParserInfo(PARSER_EXCEPTION_MSG.PARSE_TABLE_HAVE_CALCULATED);
        }
        PARSER_STORE.symbolMap.forEach((sym) => {
            if (sym === SYMBOL_START) {
                return; // continue for-each loop
            }
            sym.isTerm ? this.actionHeader.push(sym) : this.gotoHeader.push(sym);
        });
        this.actionTable = new Map();
        this.gotoTable = new Map();
        this.automaton.states.forEach((state) => {
            this.actionTable.set(state.id, new Map());
            this.gotoTable.set(state.id, new Map());
            let stateId = state.id
            let stateTrans = this.automaton.transitions.get(stateId);
            stateTrans?.forEach((target, sym) => {
                let actionRule = this.automaton.transitionsRule.get(stateId)!.get(sym);
                if (actionRule === undefined) {
                    throw new ParserError(PARSER_EXCEPTION_MSG.FATAL_ERROR);
                }
                if (sym.isTerm) {
                    // GOTO(Ii, a) = Ij ∧ a ∈ T =⇒ ACTION[i, a] ← sj
                    this.insert(this.actionTable, stateId, sym, new Shift(target, actionRule));
                } else {
                    // GOTO(Ii, A) = Ij ∧ A ∈ N =⇒ GOTO[i, A] ← gj
                    this.insert(this.gotoTable, stateId, sym, new Goto(target, actionRule));
                }
            });
            /**
             * 规约条件是LR项的点已经到达产生式的最右侧。
             * 一般来说，只要检查内核项即可，因为除了[S' -> ·S]以外，内核项的点都不在最左侧。
             * 但是非内核项中容易存在误导。非内核项的点在最左侧，但是对于[A -> ·]来说（即产生空串），此非内核项的点既在最左侧又在最右侧。
             * 因此，如果该循环只遍历内核项，则可能导致错误。
             */
            state.closure.forEach((item) => {
                if (item.end()) {
                    if (item.rule.origin === SYMBOL_START) {
                        // LR0: [S′ → S·] ∈ Ii =⇒ action[i, $] ← acc
                        // LR1: [S′ → S·, $] ∈ Ii =⇒ action[i, $] ← acc
                        this.insert(this.actionTable, stateId, SYMBOL_END, new Accept());
                    } else {
                        if (this.automaton.type === "LR0") {
                            // [k : A → α·] ∈ Ii ∧ A ̸= S′ =⇒ ∀t ∈ T ∪ {$}. action[i, t] = rk
                            PARSER_STORE.symbolMap.forEach((sym) => {
                                this.insert(this.actionTable, stateId, sym,
                                    new Reduce(PARSER_STORE.ruleIndexMap.get(item.rule)!, item.rule));
                            });
                        } else {
                            // [k : A → α·, a] ∈ Ii ∧ A ̸= S′ =⇒ action[i, a] = rk
                            item.lookahead.forEach((sym) => {
                                this.insert(this.actionTable, stateId, sym,
                                    new Reduce(PARSER_STORE.ruleIndexMap.get(item.rule)!, item.rule));
                            });
                        }
                    }
                }
            });
        });
        this.done = true;
    }

    get(tableName: "ACTION" | "GOTO", stateId: number, symbol: _Symbol): Action | undefined {
        let table = tableName === "ACTION" ? this.actionTable : this.gotoTable;
        let actions = table.get(stateId)!.get(symbol);
        return actions === undefined ? actions : actions[0];
    }
}

const PARSER_STORE = {
    rules: [] as Rule[],
    startRule: undefined as Rule | undefined,
    ruleIndexMap: new Map<Rule, number>(),
    /**
     * 本程序中token和symbol的区别：
     * 
     * symbol表示的是抽象的符号，即文法中的终结符与非终结符。
     * token表示的是具体的内容，即输入流中的每一个词法单元。
     */
    symbolMap: new Map<string, _Symbol>(),
    tokens: [] as Token[],
    /**
     * 注意：这里firstSet每个符号的FIRST集合中都没有包括ε。
     * 若想得知某个符号的FIRST集合是否包括ε，可通过nullable.has(symbol)的真值判断。
     */
    firstSet: new Map<_Symbol, Set<Terminal>>(),
    nullable: new Set<NonTerminal>(),
    stateStack: [] as number[],
    valueStack: [] as Tree[],
    reset: function () {
        this.rules = [];
        this.startRule = undefined;
        this.ruleIndexMap = new Map();
        this.symbolMap = new Map();
        this.tokens = [];
        this.firstSet = new Map();
        this.nullable = new Set();
        this.stateStack = [];
        this.valueStack = [];
    }
}


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

function first(symbolString: _Symbol[]): Terminal[] {
    let result: Set<Terminal> = new Set();
    for (let i = 0; i < symbolString.length; ++i) {
        if (symbolString[i].isTerm) {
            result = new Set([...result, symbolString[i] as Terminal]);
            break;
        }
        result = new Set([...result, ...PARSER_STORE.firstSet.get(symbolString[i])!]);
        if (!PARSER_STORE.nullable.has(symbolString[i] as NonTerminal)) {
            break;
        }
        if (i === symbolString.length - 1) {
            result.add(SYMBOL_EPSILON);
        }
    }
    return Array.from(result);
}

interface ParseOperation {
    action: Action,
    stateStackDiff: Array<number>,
    valueStackDiff: Array<Tree>,
}
interface ParseStepResult extends ParseOperation {
    actionSource: {
        stateId: number,
        symbol: _Symbol,
    },
    currentStateId: number,
    next: Token | Tree,
}

class InteractiveLrParser {
    readonly algo: ParseAlgorithm;
    automaton: Automaton;
    current: Token | Tree;
    parseTable: ParseTable;
    private tokenPtr: number = -1;
    done: boolean = false;
    store = PARSER_STORE;

    constructor(algo: ParseAlgorithm, rules: Array<Rule>, tokens: Array<Token>, replaceTerminalName: boolean) {
        PARSER_STORE.reset();
        this.algo = algo;

        // 1. 是否需要替换标点等特殊字符
        // 此步是使用Lark的限制：形如+-*:[]{}等符号，如果定义文法时没有为这些终结符命名，
        // Lark会自动将他们命名为PLUS MINUS STAR...
        // 由于难以修改项目依赖的Lark源码，因此通过一个开关来决定是否需要手动再将这些被命名的终结符换回原来的符号。
        if (!replaceTerminalName) {
            rules.forEach((rule) => {
                rule.expansion.forEach((sym) => {
                    if (TERMINAL_NAMES_REVERSE[sym.name] !== undefined) {
                        sym.name = TERMINAL_NAMES_REVERSE[sym.name];
                    }
                });
            });
            tokens.forEach((token) => {
                if (TERMINAL_NAMES_REVERSE[token.type as string] !== undefined) {
                    token.type = TERMINAL_NAMES_REVERSE[token.type as string];
                }
            })
        }
        PARSER_STORE.rules = rules;
        PARSER_STORE.tokens = tokens;

        // 2. 将所有符号存入Map，并保证符号唯一。
        const saveInSymbolMap = (symbol: _Symbol): _Symbol => {
            if (!PARSER_STORE.symbolMap.has(symbol.name)) {
                PARSER_STORE.symbolMap.set(symbol.name, symbol);
            }
            let ret = PARSER_STORE.symbolMap.get(symbol.name)!;
            return ret;
        }
        saveInSymbolMap(SYMBOL_START);
        saveInSymbolMap(SYMBOL_END);
        // 从产生式中获取所有的符号(Symbol)
        PARSER_STORE.rules.forEach((rule, index) => {
            if (rule.origin.name === SYMBOL_START.name) {
                PARSER_STORE.startRule = rule;
            }
            rule.origin = saveInSymbolMap(rule.origin);
            rule.expansion.forEach((sym: _Symbol, i: number, arr: _Symbol[]) => {
                arr[i] = saveInSymbolMap(sym);
            });
            PARSER_STORE.ruleIndexMap.set(rule, index);
        });
        if (!PARSER_STORE.startRule) {
            throw new ParserError(PARSER_EXCEPTION_MSG.START_SYMBOL_NOT_FOUND);
        }

        // 3. 将token.symbol赋值。
        // 此步也是使用Lark带来的问题，Lark解析出的token.type类型为string，即对应终结符/非终结符的名称。
        // 而其没有token.symbol这一字段，只能手动对其进行再赋值。
        // 实际上此处用途很小，不能责怪Lark的设计，毕竟其适用场景与本项目不相同。
        PARSER_STORE.tokens.forEach((token) => {
            const sym = PARSER_STORE.symbolMap.get(token.type as string);
            if (sym === undefined) {
                throw new ParserError(PARSER_EXCEPTION_MSG.FATAL_ERROR);
            }
            token.symbol = sym;
        });
        const endToken = new Token(SYMBOL_END.name, SYMBOL_END.name, 0, 0, 0, 0, 0, 0);
        endToken.symbol = SYMBOL_END;
        PARSER_STORE.tokens.push(endToken);

        this.automaton = new Automaton(this.algo);
        this.parseTable = new ParseTable(this.automaton);
        if (this.algo !== "LR0") {
            this.calcFirstSet();
        }

        PARSER_STORE.stateStack.push(0);
        this.current = this.nextToken();
    }

    /**
     * 计算FIRST集合。
     * 算法参考链接：https://lara.epfl.ch/w/cc09:algorithm_for_first_and_follow_sets
     */
    private calcFirstSet() {
        let finish = true;

        PARSER_STORE.symbolMap.forEach((sym) => {
            PARSER_STORE.firstSet.set(sym, sym.isTerm ? new Set([sym as Terminal]) : new Set());
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

    getFirstSet() {
        return {
            firstSet: PARSER_STORE.firstSet,
            nullable: PARSER_STORE.nullable,
            SYMBOL_EPSILON,
        };
    }

    calcParseTable() {
        this.parseTable.calc();
        return this.parseTable;
    }
    parseByStep(): ParseStepResult {
        if (!this.parseTable.done) {
            throw new ParserInfo(PARSER_EXCEPTION_MSG.PARSE_TABLE_NEED_CALCULATE);
        }
        if (this.done) {
            throw new ParserInfo(PARSER_EXCEPTION_MSG.PARSER_DONE);
        }
        let stateId = PARSER_STORE.stateStack[PARSER_STORE.stateStack.length - 1];
        // Token类型和Tree类型都有symbol这一字段
        let symOfCurrent = this.current.symbol;
        let operation: ParseOperation | undefined = undefined;

        let action = this.parseTable.get(symOfCurrent.isTerm ? "ACTION" : "GOTO", stateId, symOfCurrent);
        if (action === undefined) {
            throw new ParserError(PARSER_EXCEPTION_MSG.UNEXPECTED_TOKEN, this.current.value);
        } else if (action.name === "Shift") {
            PARSER_STORE.stateStack.push(action.arg);
            PARSER_STORE.valueStack.push(new Tree(symOfCurrent, this.current.value));
            this.nextToken();
            operation = {
                action,
                stateStackDiff: [PARSER_STORE.stateStack[PARSER_STORE.stateStack.length - 1]],
                valueStackDiff: [PARSER_STORE.valueStack[PARSER_STORE.valueStack.length - 1]],
            };
        } else if (action.name === "Reduce") {
            let rule = PARSER_STORE.rules[action.arg];
            let size = rule.expansion.length;
            // 特别注意size为0的情况，因为存在产生空串的产生式，此时size为0。
            // 一般来说splice(-size)即可，但如果size为0，则会从数组头部开始splice导致数组被清空！
            // 因此使用splice(-size, size)，这样即使size为0，splice的第二个参数也保证了数组不会被清空。
            let statePops = PARSER_STORE.stateStack.splice(-size, size);
            let valuePops = PARSER_STORE.valueStack.splice(-size, size);
            operation = { action, stateStackDiff: statePops, valueStackDiff: valuePops };
            this.current = new Tree(rule.origin, valuePops);
        } else if (action.name === "Goto") {
            PARSER_STORE.stateStack.push(action.arg);
            PARSER_STORE.valueStack.push(this.current as Tree);
            this.current = PARSER_STORE.tokens[this.tokenPtr];
            operation = {
                action,
                stateStackDiff: [PARSER_STORE.stateStack[PARSER_STORE.stateStack.length - 1]],
                valueStackDiff: [PARSER_STORE.valueStack[PARSER_STORE.valueStack.length - 1]],
            };
        } else {
            this.done = true;
            operation = { action, stateStackDiff: [], valueStackDiff: [] };
        }

        return {
            ...operation,
            actionSource: { stateId, symbol: symOfCurrent },
            currentStateId: PARSER_STORE.stateStack[PARSER_STORE.stateStack.length - 1],
            next: this.current,
        };
    }

    private nextToken(): Token {
        this.tokenPtr++;
        if (this.tokenPtr >= PARSER_STORE.tokens.length) {
            throw new ParserError(PARSER_EXCEPTION_MSG.TOKEN_LIST_INDEX_OUT_OF_RANGE);
        }
        this.current = PARSER_STORE.tokens[this.tokenPtr];
        return this.current;
    }
}

export {
    InteractiveLrParser, LRItem, LRItemSet,
    Action, Shift, Reduce, Goto, Accept,
    type FirstResult,
    type ClosureStepItem, type ClosureStep, type ClosureSteps,
    type ParseAlgorithm, type AppendStateResult,
    type StateClosureResult,
    type MergeLr1StatesResult,
    type ParseStepResult,
    ParseTable,
    SYMBOL_END, SYMBOL_EPSILON,
};
