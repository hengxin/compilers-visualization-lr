<template>
    <div class="panel-container">
        <div class="control-panel">
            <template v-if="!started">
                <GRadioButtonGroup v-model="algorithm" :options="algos"></GRadioButtonGroup>
                <GSwitch v-model="replaceTerminalName" 
                    :active-text="t('LR.InputPanel.AlternateCharacter')"
                    :inactive-text="t('LR.InputPanel.KeepCharacter')"></GSwitch>
                <GButton @click="parse()" type="success">{{t('LR.InputPanel.ParseButton')}}</GButton>
            </template>
        </div>
        <div class="input-panel" v-if="!started">
            <div class="grammar-input panel-item">
                <GTextarea class="input-textarea" resize="none" v-model="grammar"
                    :placeholder="t('ControlInputPanel.InputGrammarPlaceholder')">
                </GTextarea>
            </div>
            <div class="text-input panel-item">
                <GTextarea class="input-textarea" resize="none" v-model="text"
                    :placeholder="t('ControlInputPanel.InputTextPlaceholder')">
                </GTextarea>
            </div>
        </div>
        <div class="token-rule-panel" v-if="started">
            <div class="rule-panel panel-item">
                <RuleLine class="rule-line" v-for="(rule, index) in ruleList" :rule="rule" :index="index"></RuleLine>
            </div>
            <div class="token-panel panel-item">
                <div class="token-line-wrap-check">
                    <input type="checkbox" v-model="tokenLineWrap">
                    <label>{{t('LR.InputPanel.WordWrap')}}</label>
                </div>
                <div class="token-line-container" :class="[tokenLineWrap ? 'token-line-container-wrap' : '']">
                    <TokenLine class="token-line" v-for="(tokenLine, key) in tokenLineList" :token-line="tokenLine"
                        :lineNo="key + 1" :wrap="tokenLineWrap"></TokenLine>
                </div>
            </div>
        </div>
    </div>
</template>
<script lang="ts">
import { ref, defineComponent, watch, onUnmounted, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { useLrStore } from "@/stores";
import { MessageSchema } from "@/i18n";
import { GRadioButtonGroup, GButton, GTextarea, GArrow, GNotification, GSwitch } from "@/components";
import { InitParser, GetParser, ParseAlgorithm, Token, Rule } from "@/parsers/lr";
import RuleLine from "./rule-line.vue";
import TokenLine from "./token-line.vue";
import examples from "./examples";
import EventBus from "@/utils/eventbus";

export default defineComponent({
    components: {
        GRadioButtonGroup,
        GButton,
        GTextarea,
        GArrow,
        GSwitch,
        RuleLine,
        TokenLine,
    },
    setup() {
        const { t } = useI18n<{ message: MessageSchema }>({ useScope: "global" });
        const router = useRouter();
        const route = useRoute();
        const lrStore = useLrStore();
        const grammar = ref(examples.json);
        const text = ref(`{
    "aaa": [1,2,3,4,5,6,7,8,9],
    "bbb": {
        "fff": null
    }
}`);
        const algos: Array<ParseAlgorithm> = ["LR0", "LR1", "LR1_LALR1"];
        const algorithm = ref<ParseAlgorithm>("LR0");
        const replaceTerminalName = ref(false);
        const ruleList = ref<Array<Rule>>([]);
        const tokenList = ref<Array<Token>>([]);
        const started = ref(false);
        watch(algorithm, (value) => {
            lrStore.algorithm = value;
            router.replace({
                query: { a: lrStore.algorithm },
            });
        });
        if (algos.includes(route.query.a as ParseAlgorithm)) {
            algorithm.value = route.query.a as ParseAlgorithm;
        }
        function parse() {
            try {
                InitParser(algorithm.value, grammar.value, text.value, replaceTerminalName.value);
                const parser = GetParser();
                started.value = true;
                ruleList.value = parser.store.rules;
                tokenList.value = parser.store.tokens;
                initTokenTagData();
                lrStore.showControlPanel = true;
                lrStore.showAutomaton = true;
                nextTick(() => {
                    document.getElementById("automaton")?.scrollIntoView({ behavior: "smooth" });
                });
            } catch (e) {
                GNotification({
                    title: t("ControlInputPanel.InitParserError"),
                    content: (e as Error).message,
                    type: "error",
                });
            }
        }

        const tokenLineList = ref<Array<Array<Token>>>([]);

        function initTokenTagData() {
            let lineNo = 1;
            let line: Array<Token> = [];
            tokenList.value.forEach((token) => {
                if (token.line > lineNo) {
                    tokenLineList.value.push(line);
                    line = [];
                    lineNo++;
                }
                line.push(token);
            });
            if (line.length > 0) {
                tokenLineList.value.push(line);
            }
        }

        const tokenLineWrap = ref(false);
        function changeTokenLineWrap() {
            tokenLineWrap.value = !tokenLineWrap.value;
        }

        function handleReset() {
            grammar.value = "";
            text.value = "";
            ruleList.value = [];
            tokenList.value = [];
            started.value = false;
            lrStore.showControlPanel = false;
            lrStore.showAutomaton = false;
            lrStore.showParseTable = false;
            lrStore.showParseTree = false;
        }

        const unsubscribe = [EventBus.subscribe("lr", "Reset", handleReset)];
        onUnmounted(() => unsubscribe.forEach(fn => fn()));

        return {
            t, parse,
            replaceTerminalName,
            grammar, text, algos, algorithm, ruleList, tokenLineList, started,
            tokenLineWrap, changeTokenLineWrap,
        };
    }
});
</script>

<style scoped>
.panel-container {
    padding: 8px;
    border-top: none;
    display: flex;
    flex-direction: column;
    height: 100%;
}

.control-panel {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    top: 16px;
}

.input-panel {
    margin-top: 8px;
}

.input-panel,
.token-rule-panel {
    flex-grow: 1;
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100%;
}

.input-textarea {
    height: 100%;
    /* 等宽字体 */
    font-family: 'Cascadia Mono', 'Courier New', Courier, monospace;
}

.rule-panel,
.token-panel {
    border: 1px gainsboro solid;
    overflow: auto;
}

.token-line-wrap-check {
    display: flex;
    align-items: center;
}

.token-line-container {
    float: left;
    min-width: 100%;
}

.token-line-container-wrap {
    width: 100%;
}

.panel-item {
    flex: 1 1 0;
    margin-right: 10px;
    min-width: 0;
}

.panel-item:last-child {
    margin-right: 0;
}

.rule-line,
.token-line {
    margin-bottom: 4px;
}

.token-line:last-child {
    margin-bottom: 0;
}
</style>