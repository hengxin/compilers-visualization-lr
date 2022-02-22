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
// import StepInfo from "./step-info";

// type _Symbol = 

/**
 * LR(0) 项 (Item)
 * 文法 G 的一个 LR(0) 项是 G 的某个产生式加上一个位于体部的点。
 * 例：[A → ·XYZ]
 */
class LR0Item {
    rule: Rule;
    index: number;

    constructor(rule: Rule, index: number = 0) {
        this.rule = rule;
        this.index = index;
    }

    equal(other: LR0Item): boolean {
        return other.rule === this.rule && other.index === this.index;
    }

    end(): boolean {
        return this.index = this.rule.expansion.length;
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
    #searchIndex: number;
    done: boolean;

    constructor(kernel: LR0Item[]) {
        this.kernel = kernel;
        this.closure = [];
        this.kernel.forEach((item) => { this.closure.push(item); });
        this.#searchIndex = 0;
        this.done = false;
    }

    /**
     * 通过比较kernel是否相同判断项集是否相同
     */
    equal(other: LR0ItemSet): boolean {
        if (this.kernel.length !== other.kernel.length) {
            return false;
        }
        other.kernel.forEach((item) => {
            if (!this.#inKernel(item)) {
                return false;
            }
        });
        return true;
    }

    #inKernel(i: LR0Item): boolean {
        this.kernel.forEach((item) => {
            if (item.equal(i)) {
                return true;
            }
        });
        return false;
    }

    /**
     * 判断一个LR0项是否在闭包内
     */
    have(i: LR0Item): boolean {
        this.closure.forEach((item) => {
            if (item.equal(i)) {
                return true;
            }
        });
        return false;
    }

    computeClosureByStep(all: Rule[]): ClosureExpandList {
        let stepRes: ClosureExpandList = [];
        if (this.done) {
            return stepRes;
        }
        // 遍历闭包中的每一项[A -> a·Bb]
        let item = this.closure[this.#searchIndex];
        let rightSym: _Symbol = item.rule.expansion[item.index];
        // 寻找产生式B -> r
        for (let rule of all) {
            if (rightSym.eq(rule.origin)) {
                let newPtr = new LR0Item(rule, 0);
                // 如果[B -> ·r]不在闭包中，则将[B -> ·r]加入到闭包
                if (!this.have(newPtr)) {
                    // this.closure.push(newPtr);
                    stepRes.push(newPtr);
                }
            }
        }
        ++this.#searchIndex;
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
}

type ClosureExpandList = LR0Item[];

class Automaton {
    /**
     * 自动机的状态集
     */
    states: LR0ItemSet[];
    // relations:
}

class ControllableLalrParser {
    lark: Lark;
    text: string;
    parser: _Parser;
    state: ParserState;
    tokenList: Token[];
    terminals: TerminalDef[];
    terminals_dict: Map<string, TerminalDef>;
    rules: Rule[];
    #currentToken: Token;

    // lr0States: 

    constructor(text: string) {
        this.lark = get_parser();
        this.text = text;
        // this.parser = this.lark.parse_interactive(text);
        this.parser = null;
        this.state = null;
        this.tokenList = null;
        this.terminals = this.lark.terminals;
        this.terminals_dict = new Map(Object.entries(this.lark._terminals_dict));
        this.rules = this.lark.rules;
        this.#currentToken = null;
        this.#init();
    }

    #init() {
        // let _lexer, _start, state_stack = null, value_stack = null;

        // // 给下面三个class添加成员方法
        // Lark.prototype.parse_manual = function (text = null, start = null) {
        //     // this.parser: ParsingFrontend
        //     return this.parser.parse_manual(text, start);
        // }
        // ParsingFrontend.prototype.parse_manual = function (text = null, start = null) {
        //     let chosen_start = this._verify_start(start);
        //     if (this.parser_conf.parser_type !== "lalr") {
        //         throw new ConfigurationError(
        //             "parse_manual() currently only works with parser='lalr' "
        //         );
        //     }
        //     let stream = this.skip_lexer ? text : new LexerThread(this.lexer, text);
        //     // this.parser: LALR_Parser
        //     return this.parser.parse_manual(stream, chosen_start);
        // }
        // LALR_Parser.prototype.parse_manual = function (lexer, start) {
        //     // this.parser: _Parser
        //     _lexer = lexer;
        //     _start = start;
        //     return this.parser;
        // }

        // // _Parser
        // this.parser = this.lark.parse_manual(this.text);
        // let parse_conf = new ParseConf(this.parser.parse_table, this.parser.callbacks, _start);
        // state_stack = [parse_conf.start_state];
        // value_stack = [];
        // let parser_state = new ParserState(parse_conf, _lexer, state_stack, value_stack);
        // this.state = parser_state;
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
