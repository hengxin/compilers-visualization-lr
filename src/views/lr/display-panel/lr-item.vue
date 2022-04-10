<template>
    <div class="lr-item">
        <span class="lr-item-symbol non-terminal">{{ lrItem.rule.origin.name }}</span>
        <span class="lr-item-arrow">→</span>
        <span class="lr-item-dot" v-if="lrItem.index === 0">·</span>
        <template v-for="(sym, index) in lrItem.rule.expansion">
            <span
                :class="['lr-item-symbol', sym.isTerm ? 'terminal' : 'non-terminal']"
            >{{ sym.name }}</span>
            <span class="lr-item-dot" v-if="(index + 1) === lrItem.index">·</span>
        </template>
        <template v-if="lrItem.lookahead.size > 0">
            <span class="lr-item-comma">,</span>
            <span class="lr-item-lookahead terminal" v-for="(la) in lrItem.lookahead">{{ la.name }}</span>
        </template>
    </div>
</template>
<script lang="ts">
import { defineComponent, PropType } from "vue";
import { LRItem } from "@/parsers/lr";

export default defineComponent({
    props: { lrItem: { type: Object as PropType<LRItem>, required: true } },
    setup() {}
});
</script>
<style scoped>
.lr-item-symbol,
.lr-item-dot {
    margin: 0 2px;
}

.lr-item-arrow {
    margin: 0 4px;
}
.terminal {
    font-family: "Times New Roman";
}
.non-terminal,
.lr-item-arrow,
.lr-item-dot,
.lr-item-comma,
.lr-item-lookahead-sep {
    font-family: "Cambria Math";
}
.lr-item-comma {
    margin: 0 4px 0 0;
}
.lr-item-lookahead:last-child {
    margin-right: 2px;
}
.lr-item-lookahead::after {
    content: "/";
}
.lr-item-lookahead:last-child::after {
    content: "";
}
</style>