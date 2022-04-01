<template>
    <div class="rule-line">
        <span class="rule-index">({{ index }})</span>
        <div class="rule-item">
            <span class="rule-symbol rule-symbol-nonterminal">{{ rule!.origin.name }}</span>
            <span class="rule-symbol">→</span>
            <span
                class="rule-symbol"
                :class="sym.isTerm ? '' : 'rule-symbol-nonterminal'"
                v-for="sym in rule?.expansion"
            >{{ sym.name }}</span>
        </div>
    </div>
</template>
<script lang="ts">
import { defineComponent, PropType } from "vue";
import { Rule } from "@/parsers/lr";
const props = {
    rule: { type: Object as PropType<Rule>, required: true },
    index: { type: Number, required: true },
}
export default defineComponent({
    props,
    setup(props, ctx) { }
});
</script>
<style scoped>
.rule-line {
    display: flex;
    flex-direction: row;
    font-size: 12px;
}
.rule-index {
    color: var(--color-klein-blue);
    flex-shrink: 0;
    margin: 0 8px;
}
.rule-symbol {
    margin-right: 4px;
    background-color: whitesmoke;
    font-weight: bold;
    padding: 0 4px;
    font-family: "Times New Roman";
}
.rule-symbol:last-child {
    margin-right: 0;
}
.rule-symbol-nonterminal {
    font-style: italic;
    font-family: "Cambria Math";
}
</style>