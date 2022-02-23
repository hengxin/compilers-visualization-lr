import { ControllableLalrParser } from "./parsers/lalr/lalr-parser.js";
function start() {
    const text = `a * (b * c)`;
    let parser = new ControllableLalrParser(text);
    let tokens = parser.lex();
    for (let i = 0; i < tokens.length; ++i) {
        console.log(tokens[i]);
    }
    parser.test();
}
start()