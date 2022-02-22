import {
    ControllableLalrParser,
    LR0Item,
    LR0ItemSet
} from "./parsers/lalr/lalr-parser.js";
function start() {
    const text = `{
    "empty_object" : {},
    "empty_array"  : [],
    "booleans"     : { "YES" : true, "NO" : false },
    "numbers"      : [ 0, 1, -2, 3.3, 4.4e5, 6.6e-7 ],
    "strings"      : [ "This", [ "And" , "That", "And a \\"b" ] ],
    "nothing"      : null
}`;
    let parser = new ControllableLalrParser(text);
    let tokens = parser.lex();
    for (let i = 0; i < tokens.length; ++i) {
        console.log(tokens[i]);
    }

    let rule = parser.rules[0];
    let lr0Item = new LR0Item(rule);
    let ker = [lr0Item];
    let state = new LR0ItemSet(ker);
    state.computeClosure(parser.rules);
    
}
start()