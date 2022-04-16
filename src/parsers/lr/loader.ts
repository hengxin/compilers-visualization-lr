import { GetPyodide, LoadPyodide } from "@/utils/pyodide";
import { ControllableLRParser, ParseAlgorithm, Rule, Token } from "@/parsers/lr";

async function LoadDependency(callback: (s: string) => void) {
    const pyodide = await LoadPyodide(callback)
    if (pyodide === undefined) {
        throw new Error();
    }
    callback("Installing Lark...");
    await pyodide.runPythonAsync("await micropip.install('lark')");
    await pyodide.runPythonAsync("from lark import Lark");
    await pyodide.runPythonAsync("import json");
    callback("Finish loading Lark.");
}

let parser: ControllableLRParser | undefined = undefined;

function InitParser(algorithm: ParseAlgorithm, grammar: string, text: string) {
    const pyodide = GetPyodide();
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
    return _parser;
}

function GetParser(): ControllableLRParser {
    if (parser === undefined) {
        throw new Error("Parser not inited");
    }
    return parser;
}

export {
    LoadDependency,
    InitParser,
    GetParser,
};