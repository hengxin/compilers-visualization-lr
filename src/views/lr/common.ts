import { ControllableLRParser, LRItem, ParseAlgorithm, Rule, Token } from "@/parsers/lr";
import { Pyodide } from "@/utils/pyodide";
import EventBus from "@/utils/eventbus";
import loadLark from "@/utils/lark-loader";

// @ts-ignore
let pyodide: Pyodide = undefined;
// @ts-ignore
let parser: ControllableLRParser = undefined;
async function loadDependency(callback: (arg: string) => void) {
    try {
        pyodide = await loadLark(callback);
    } catch (e) {
        console.log(e);
    }
}

function initParser(algorithm: ParseAlgorithm, grammar: string, text: string) {
    const ruleList: Array<Rule> = [];
    const tokenList: Array<Token> = [];
    pyodide.globals.set("grammar", grammar);
    pyodide.globals.set("text", text);
    let code = "parser = Lark(grammar, parser=\"lalr\", lexer=\"basic\", keep_all_tokens=True)\n" +
        "ruleList = []\n" +
        "for rule in parser.rules:\n" +
        "    ruleList.append(json.dumps(rule.serialize()))\n" +
        "def serialize_token(token):\n" +
        "    d = {\"type\":token.type,\"value\":token.value, \"start_pos\": token.start_pos,\n" +
        "    \"line\":token.line, \"column\": token.column, \"end_line\": token.end_line,\n" +
        "    \"end_column\":token.end_column, \"end_pos\": token.end_pos, \"__type__\": \"Token\"}\n" +
        "    return json.dumps(d)\n" +
        "tokenGenerator = parser.lex(text)\n" +
        "tokenList = []\n" +
        "for token in tokenGenerator:\n" +
        "    tokenList.append(serialize_token(token))";
    pyodide.runPython(code);
    let ruleListProxy = pyodide.globals.get("ruleList");
    for (let i = 0; i < ruleListProxy.length; i++) {
        let rule = Rule.deserialize(JSON.parse(ruleListProxy.get(i)));
        ruleList.push(rule);
    }
    ruleListProxy.destroy();
    let tokenListProxy = pyodide.globals.get("tokenList");
    for (let i = 0; i < tokenListProxy.length; i++) {
        let token = Token.deserialize(JSON.parse(tokenListProxy.get(i)));
        tokenList.push(token);
    }
    tokenListProxy.destroy();
    code = "del parser\n" +
        "del ruleList\n" +
        "del tokenGenerator\n" +
        "del tokenList";
    pyodide.runPython(code);
    const _parser = new ControllableLRParser(algorithm, ruleList, tokenList);
    parser = _parser;
    EventBus.publish("lr", "AutomatonStart", parser.automaton.states[0]);
    return _parser;
}

function getParser(): ControllableLRParser {
    if (parser === undefined) {
        throw new Error("Parser not inited");
    }
    return parser;
}

let stateId = -1;
let closureStepsReverse: Array<Array<LRItem>> = []
let op = 0;
type Speed = 1 | 2 | 3;
function next(speed: Speed) {
    let res;
    switch (op) {
        case 0: // 求自动机当前状态的闭包
            if (closureStepsReverse.length === 0) {
                if (stateId !== parser.automaton.states[parser.automaton.statePtr].id) {
                    res = parser.automaton.currentStateClosure();
                    closureStepsReverse = res.closureSteps;
                    closureStepsReverse.reverse();
                    stateId = res.id;
                } else {
                    // if (parser.algo === "LR1" || parser.algo === "LR1_LALR1") {
                    //     op = 1;
                    // } else {
                    //     op = 2;
                    // }
                    // if (speed < 3) {
                    //     break;
                    // }
                }
            }
            if (speed > 1) {
                // 直接将闭包结果全提交
                EventBus.publish("lr", "State" + stateId + "Closure", closureStepsReverse.reverse());
                if (parser.algo === "LR1" || parser.algo === "LR1_LALR1") {
                    op = 1;
                } else {
                    op = 2;
                }
            } else {
                // speed === 1，一条一条提交闭包结果
                EventBus.publish("lr", "State" + stateId + "ClosureStep", closureStepsReverse.pop());
                if (closureStepsReverse.length === 0) {
                    if (parser.algo === "LR1" || parser.algo === "LR1_LALR1") {
                        op = 1;
                    } else {
                        op = 2;
                    }
                }
            }
            if (speed < 3) {
                break;
            }
        case 1: // 合并lookaheads
            if (parser.algo === "LR1" || parser.algo === "LR1_LALR1") {
                op = 2;
                res = parser.automaton.mergeLookaheads();
                // 应由State组件接收
                EventBus.publish("lr", "State" + res.id + "MergeLookaheads", res);
                if (speed < 3) {
                    break;
                }
            }
        case 2: // 闭包+mergeLookaheads完成
            op = 3;
            EventBus.publish("lr", "State" + stateId + "ClosureDone");
            break;
        case 3: // 状态BFS
            // TODO 返回值
            // res = parser.automaton.AppendStates();
            if (parser.automaton.done) {
                if (parser.algo === "LR0_LALR1") {
                    op = 4;
                } else if (parser.algo === "LR1_LALR1") {
                    op = 7;
                } else {
                    op = 8;
                }
            } else {
                op = 0;
            }
            // 应由包含State的容器组件接收
            EventBus.publish("lr", "AutomatonAppendStates", res);
            break;
        case 4: // LR0_LALR1 自发生成
            break;
        case 5: // LR0_LALR1 传播
            break;
        case 6: // LR0_LALR1 重新计算闭包
            break;
        case 7: // LR1_LALR1 合并相同核心的LR1项
            break;
        case 8: // 计算LR分析表
            res = parser.calcParseTable();
            EventBus.publish("lr", "ShowParseTable", res);
            break;
        case 9: // 
            break;
        case 10: // 
            break;
        case 11: // 
            break;
        case 12: // 
            break;
        default:
    }
}

export {
    pyodide, parser, loadDependency, initParser, next, getParser,
}