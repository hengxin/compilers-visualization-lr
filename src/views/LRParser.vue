<template>
    <div v-if="larkLoaded">
        <textarea placeholder="文法" v-model="grammar"></textarea>
        <textarea placeholder="代码" v-model="text"></textarea>
        <button @click="initParser">CLICK</button>
        <div>{{ ruleList }}</div>
        <div>{{ tokenList }}</div>
    </div>
    <div v-else>
        {{ t("lr.loadingDependecy") }}
        <br />
        <span>{{ loadingMsg }}</span>
    </div>
</template>
<script lang="ts">
import { ref, defineComponent } from "vue";
import { useI18n } from "vue-i18n";
import { Rule, Token, ControllableLRParser } from "@/parsers/lr";
import loadLark from "@/utils/lark-loader";
import { Pyodide } from "@/utils/pyodide";

export default defineComponent({
    setup() {
        const { t, locale } = useI18n({ useScope: "global" });
        const larkLoaded = ref(false);
        const loadingMsg = ref("");
        // @ts-ignore
        let pyodide: Pyodide;
        // 加载依赖
        async function loadDependency() {
            function updateLoadingMsg(msg: string) {
                loadingMsg.value = msg;
            }
            try {
                pyodide = await loadLark(updateLoadingMsg);
                larkLoaded.value = true;
            } catch (e) {
                console.log(e);
            }
        }
        loadDependency();

        // 创建语法分析器
        const grammar = ref(`start: e
e: e "+" t
 | t
t: t "*" f
 |f
f: "(" e ")"
 | ID

ID: LETTER (LETTER|DIGIT)*
LETTER: "_" | "a".."z" | "A".."Z"
DIGIT: "0".."9"

%import common.WS
%ignore WS`);
        const text = ref("id * id");
        const ruleList = ref<Rule[]>([]);
        const tokenList = ref<Token[]>([]);
        let parser: ControllableLRParser;
        function initParser() {
            ruleList.value.splice(0, ruleList.value.length);
            tokenList.value.splice(0, tokenList.value.length);
            pyodide.globals.set("grammar", grammar.value);
            pyodide.globals.set("text", text.value);
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
                ruleList.value.push(rule);
            }
            ruleListProxy.destroy();
            let tokenListProxy = pyodide.globals.get("tokenList");
            for (let i = 0; i < tokenListProxy.length; i++) {
                let token = Token.deserialize(JSON.parse(tokenListProxy.get(i)));
                tokenList.value.push(token);
            }
            tokenListProxy.destroy();
            code = "del parser\n" +
                "del ruleList\n" +
                "del tokenGenerator\n" +
                "del tokenList";
            pyodide.runPython(code);

            parser = new ControllableLRParser("LR0", ruleList.value, tokenList.value);
        }

        return {
            t,
            initParser,
            larkLoaded,
            loadingMsg,
            ruleList, tokenList,
            grammar,
            text,

        }
    }
});

</script>
<style scoped>
</style>