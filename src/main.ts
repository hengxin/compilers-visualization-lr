import { ParserException } from "./parsers/lalr/lalr-parser-exception.js";
import { ControllableLalrParser } from "./parsers/lalr/lalr-parser.js";
function start() {
    try {
        const text = `ccdcd`;
        let parser = new ControllableLalrParser(text, "LR1");
        let tokens = parser.lex();
        for (let i = 0; i < tokens.length; ++i) {
            console.log(tokens[i]);
        }
        parser.test();

    } catch (e) {
        if (e instanceof ParserException) {
            console.log(e.message);
        } else {
            console.log(e);
        }
    }
}
start()