<template>
    <div class="first-set-table">
        <template v-for="firstSetPair in firstSet">
            <div class="first-set-row-l non-terminal">{{ firstSetPair[0].name }}</div>
            <div class="first-set-row-r terminal">
                <span class="first-set-symbol" v-for="sym in firstSetPair[1]">{{ sym.name }}</span>
            </div>
        </template>
    </div>
</template>
<script lang="ts">
import { defineComponent, PropType } from "vue";
import { _Symbol } from "@/parsers/lr";
export default defineComponent({
    props: {
        firstSet: { type: Object as PropType<Map<_Symbol, Array<_Symbol>>>, required: true }
    },
    setup() {
    }
})
</script>
<style scoped>
/* 固定第一列表头的样式写的很不优雅，但水平有限凑合用吧 */
.first-set-table {
    display: grid;
    grid-template-columns: auto auto;
    overflow: auto;
    border: 1px solid darkgray;
    border-bottom: none;
}

.first-set-row-l {
    position: sticky;
    left: 0;
    border-right: 1px solid darkgray;
    border-bottom: 1px solid darkgray;
    padding: 4px;
    background-color: aliceblue;
}

.first-set-row-r {
    border-bottom: 1px solid darkgray;
    padding: 4px;
}

.first-set-symbol {
    border: 1px solid darkgray;
    margin-left: 4px;
}

.first-set-symbol:last-child {
    margin-right: 0;
}
</style>