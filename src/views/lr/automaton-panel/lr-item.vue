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
            <template v-for="(la, index) in lrItem.lookahead">
                <span class="lr-item-symbol terminal">{{la.name}}</span>
                <span class="lr-item-lookahead-sep" v-if="index !== lrItem.lookahead.size - 1">/</span>
            </template>
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
/* 字体与样式 */
.lr-item-symbol,
.lr-item-dot {
    font-weight: bold;
}

.terminal {
    font-family: "Times New Roman";
}

.non-terminal,
.lr-item-arrow,
.lr-item-dot,
.lr-item-comma {
    font-family: "Cambria Math";
}

.lr-item-arrow,
.lr-item-comma,
.lr-item-lookahead-sep {
    color: red;
}

/* 位置与边距 */
.lr-item-symbol,
.lr-item-dot,
.lr-item-comma {
    margin: 0 2px;
}

.lr-item-arrow {
    margin: 0 4px;
}

.lr-item-symbol {
    border: 1px gray solid;
}
</style>