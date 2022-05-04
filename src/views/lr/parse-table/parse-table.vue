<template>
    <table class="parse-table">
        <tr>
            <th rowspan="2"></th>
            <th class="terminal" :colspan="actionHeaderCnt">ACTION</th>
            <th class="terminal" :colspan="gotoHeaderCnt">GOTO</th>
        </tr>
        <tr>
            <th :class="[sym.isTerm ? 'terminal' : 'non-terminal']" v-for="sym in header">{{ sym.name }}</th>
        </tr>
        <tr v-for="row in data">
            <td>{{ row[0] }}</td>
            <td v-for="action in row[1]" :class="[action.highlight ? 'grid-highlight' : '']">
                <span v-for="(a, index) in action.value"
                    :class="[index === 0 ? 'parse-action' : 'parse-action-unused']">
                    <span class="non-terminal">{{a.abbr}}</span>
                    <span class="terminal" v-if="a.name !== 'Accept'">{{a.arg}}</span>
                </span>
            </td>
        </tr>
    </table>
</template>
<script lang="ts">
import { defineComponent, onUnmounted, ref } from "vue";
import { Action, GetParser, _Symbol } from "@/parsers/lr";
import EventBus from "@/utils/eventbus";
type ActionGrid = { value: Array<Action>, highlight: boolean };
export default defineComponent({
    setup() {
        const data = ref<Array<[number, Array<ActionGrid>]>>([]);
        const dataMap = ref<Map<number, Map<_Symbol, ActionGrid>>>(new Map());
        let lastHighlight: { stateId: number, symbol: _Symbol } | undefined = undefined;
        const parser = GetParser();
        parser.parseTable.actionTable.forEach((_, stateId) => {
            let row: Array<ActionGrid> = [];
            const dataMapInner: Map<_Symbol, ActionGrid> = new Map();
            parser.parseTable.actionHeader.forEach((sym) => {
                let action = parser.parseTable.actionTable.get(stateId)!.get(sym);
                let grid: ActionGrid | undefined = undefined;
                if (action === undefined) {
                    grid = { value: [], highlight: false };
                } else {
                    grid = { value: action, highlight: false };
                }
                row.push(grid);
                dataMapInner.set(sym, grid);
            });
            parser.parseTable.gotoHeader.forEach((sym) => {
                let action = parser.parseTable.gotoTable.get(stateId)!.get(sym);
                let grid: ActionGrid | undefined = undefined;
                if (action === undefined) {
                    grid = { value: [], highlight: false };
                } else {
                    grid = { value: action, highlight: false };
                }
                row.push(grid);
                dataMapInner.set(sym, grid);
            });
            data.value.push([stateId, row]);
            dataMap.value.set(stateId, dataMapInner);
        });
        const actionHeaderCnt = parser.parseTable.actionHeader.length;
        const gotoHeaderCnt = parser.parseTable.gotoHeader.length;
        const header = [...parser.parseTable.actionHeader, ...parser.parseTable.gotoHeader];

        function setHighlight(actionSource: { stateId: number, symbol: _Symbol }) {
            if (lastHighlight) {
                dataMap.value.get(lastHighlight.stateId)!.get(lastHighlight.symbol)!.highlight = false;
            }
            dataMap.value.get(actionSource.stateId)!.get(actionSource.symbol)!.highlight = true;
            lastHighlight = actionSource;
        }

        const unsubscribe = [EventBus.subscribe("lr", "ParseTableHighlight", setHighlight)];
        onUnmounted(() => unsubscribe.forEach(fn => fn()));

        return { actionHeaderCnt, gotoHeaderCnt, header, data }
    },
});
</script>
<style scoped>
.parse-table {
    font-size: 12px;
    margin: 12px;
}

.grid-highlight {
    background-color: gold;
}

.parse-action {
    color: black;
    font-weight: bold;
}

.parse-action-unused {
    color: gray;
}

.parse-action-unused::before {
    content: ",";
}

table {
    border-collapse: separate;
    border-spacing: 0;
    border-top: 2px solid black;
    border-left: 2px solid black;
}

th,
td {
    border: 2px solid black;
    border-top: none;
    border-left: none;
    text-align: center;
    padding: 1px 2px;
}
</style>