import { ParserError } from "./parsers/lr/parser-exception.js";
import { ControllableLalrParser } from "./parsers/lr/parser.js";
function start() {
    try {
        const text = `ccdcd`;
        let parser = new ControllableLalrParser(text, "LR1");
        // let tokens = parser.lex();
        // for (let i = 0; i < tokens.length; ++i) {
        //     console.log(tokens[i]);
        // }
        while (!parser.automaton.done) {
            // parser.automatonStep();
            let value: any;
            value = parser.automaton.currentStateClosure();
            console.log(value.toString());
            if ("LR1") { // todo
                parser.automaton.mergeLookaheads();
            }
            parser.automaton.bfsByStep();
        }
        parser.automaton.transToLalr1();
        parser.calcParseTable();
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
start()