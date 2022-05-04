<template>
    <div class="rule-line">
        <span class="rule-index" v-if="index !== undefined">({{ index }})</span>
        <div class="rule-item">
            <span class="rule-symbol non-terminal">{{ rule!.origin.name }}</span>
            <span class="rule-symbol rule-arrow">→</span>
            <span
                class="rule-symbol"
                :class="sym.isTerm ? 'terminal' : 'non-terminal'"
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
    index: { type: Number },
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
    padding: 0 4px;
}
.rule-symbol:last-child {
    margin-right: 0;
}

.rule-arrow {
    font-family: "Times New Roman";
}
</style>