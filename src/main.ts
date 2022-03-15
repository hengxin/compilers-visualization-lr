import { ParserError } from "./parsers/lr/parser-exception.js";
import { ControllableLRParser, ParserType } from "./parsers/lr/parser.js";
function start(type: ParserType) {
    try {
        const text = `ID;`;
        let parser = new ControllableLRParser(text, type);
        while (!parser.automaton.done) {
            let value = parser.automaton.currentStateClosure();
            console.log(value.toString());
            if (type === "LR1" || type === "LR1_LALR1") {
                parser.automaton.mergeLookaheads();
            }
            parser.automaton.bfsByStep();
        }
        // console.group("自动机");
        console.log(parser.automaton.toString());
        // console.groupEnd();

        if (type === "LR0_LALR1") {
            parser.automaton.propagatedAndSpontaneouslyGenerate();
            console.log("自发生成后")
            console.log(parser.automaton.toString());
            while (!parser.automaton.propagated) {
                parser.automaton.pass();
                console.log("传播")
                console.log(parser.automaton.toString());
            }
            parser.automaton.reCalc();
            console.log("重新计算闭包");
            console.log(parser.automaton.toString());
        }
        if (type === "LR1_LALR1") {
            parser.automaton.mergeLr1();
            console.log("合并后");
            console.log(parser.automaton.toString());
        }

        parser.calcParseTable();
        console.log("LR分析表");
        console.log(parser.parseTable.toString());
        let step;
        while (!parser.done) {
            step = parser.parseByStep();
            console.log(step);
        }
        // @ts-ignore
        let s = step.valueStack[0].toString();
        console.log(s);
    } catch (e) {
        if (e instanceof ParserError) {
            console.log(e.message);
        } else {
            console.log(e);
        }
    }
}
start("LR0_LALR1");