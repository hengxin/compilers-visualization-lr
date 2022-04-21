<template>
    <div class="panel-container">
        <div class="control-panel">
            <template v-if="!started">
                <GRadioButtonGroup v-model="algorithm" :options="algos"></GRadioButtonGroup>
                <GButton @click="parse()">Parse{{ algorithm }}</GButton>
            </template>
            <template v-else>
                <GButton @click="reset()">Reset</GButton>
            </template>
        </div>
        <div class="input-panel" v-if="!started">
            <div class="grammar-input panel-item">
                <GTextarea resize="none" v-model="grammar" :rows="15"
                    :placeholder="t('ControlInputPanel.InputGrammarPlaceholder')" style="font-family: 'Cascadia Mono';">
                </GTextarea>
            </div>
            <div class="text-input panel-item">
                <GTextarea resize="none" v-model="text" :rows="15"
                    :placeholder="t('ControlInputPanel.InputTextPlaceholder')" style="font-family: 'Cascadia Mono';">
                </GTextarea>
            </div>
        </div>
        <div class="token-rule-panel" v-if="started">
            <div class="rule-panel panel-item">
                <RuleLine class="rule-line" v-for="(rule, index) in ruleList" :rule="rule" :index="index"></RuleLine>
            </div>
            <div class="token-panel panel-item">
                <div class="token-line-container">
                    <TokenLine class="token-line" v-for="(tokenLine, key) in tokenLineList" :token-line="tokenLine"
                        :lineNo="key + 1"></TokenLine>
                </div>
            </div>
        </div>
        <div class="fold" v-if="started">
            <GArrow class="fold-arrow" direction="down"></GArrow>
        </div>
    </div>
</template>
<script lang="ts">
import { ref, defineComponent, PropType, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { useLrStore } from "@/stores";
import { GRadioButtonGroup, GButton, GTextarea, GArrow, GNotification } from "@/components";
import { InitParser, GetParser, ParseAlgorithm, Token, Rule } from "@/parsers/lr";
import RuleLine from "./rule-line.vue";
import TokenLine from "./token-line.vue";
import examples from "./examples";

export default defineComponent({
    components: {
        GRadioButtonGroup,
        GButton,
        GTextarea,
        GArrow,
        RuleLine,
        TokenLine,
    },
    setup() {
        const { t } = useI18n({ useScope: "global" });
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
        const algos: Array<ParseAlgorithm> = ["LR0", "LR1", "LR0_LALR1", "LR1_LALR1"];
        const algorithm = ref<ParseAlgorithm>("LR0");
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
                InitParser(algorithm.value, grammar.value, text.value, true);
                const parser = GetParser();
                started.value = true;
                ruleList.value = parser.store.rules;
                tokenList.value = parser.store.tokens;
                initTokenTagData();
                lrStore.showControlPanel = true;
                lrStore.showAutomaton = true;
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

        function reset() {
            grammar.value = "";
            text.value = "";
            ruleList.value = [];
            tokenList.value = [];
            started.value = false;
            lrStore.showControlPanel = false;
            lrStore.showAutomaton = false;
            lrStore.showParseTable = false;
        }
        return {
            t, parse, reset,
            grammar, text, algos, algorithm, ruleList, tokenLineList, started
        };
    }
});
</script>

<style scoped>
.panel-container {
    padding: 0 8px;
    border: 2px var(--color-klein-blue) solid;
    border-top: none;
}

.control-panel {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    top: 16px;
}

.input-panel,
.token-rule-panel {
    display: flex;
    flex-direction: row;
    width: 100%;
    margin: 8px 0;
}

.rule-panel,
.token-panel {
    border: 1px gainsboro solid;
    overflow: auto;
    max-height: 400px;
}

.token-line-container {
    float: left;
    min-width: 100%;
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

.fold-arrow {
    margin: 0 auto;
}
</style>