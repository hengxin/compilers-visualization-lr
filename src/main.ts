import { ParserException } from "./parsers/lr/parser-exception.js";
import { ControllableLalrParser } from "./parsers/lr/parser.js";
function start() {
    try {
        const text = `id*id`;
        let parser = new ControllableLalrParser(text, "LR0");
        // let tokens = parser.lex();
        // for (let i = 0; i < tokens.length; ++i) {
        //     console.log(tokens[i]);
        // }
        parser.test();
        parser.initParse();
        while (!parser.done) {
            let step = parser.parseByStep();
            console.log(step);
        }

    } catch (e) {
        if (e instanceof ParserException) {
            console.log(e.message);
        } else {
            console.log(e);
        }
    }
}
start()