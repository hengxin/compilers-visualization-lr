<template>
    <table class="parse-table">
        <tr>
            <th rowspan="2"></th>
            <th :colspan="actionHeaderCnt">ACTION</th>
            <th :colspan="gotoHeaderCnt">GOTO</th>
        </tr>
        <tr>
            <th v-for="sym in header">{{ sym.name }}</th>
        </tr>
        <tr v-for="(row, index) in data">
            <td>{{ index }}</td>
            <td v-for="action in row">{{ action }}</td>
        </tr></table>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { GetParser } from "@/parsers/lr";
export default defineComponent({
    setup() {
        const data: Array<Array<string>> = [];
        const parser = GetParser();
        for (let i = 0; i < parser.parseTable.actionTable.length; i++) {
            let row: Array<string> = [];
            parser.parseTable.actionHeader.forEach((sym) => {
                let action = parser.parseTable.actionTable[i].get(sym);
                if (action === undefined) {
                    row.push("");
                } else {
                    row.push(action.toString());
                }
            });
            parser.parseTable.gotoHeader.forEach((sym) => {
                let action = parser.parseTable.gotoTable[i].get(sym);
                if (action === undefined) {
                    row.push("");
                } else {
                    row.push(action.toString());
                }
            });
            data.push(row);
        }
        const actionHeaderCnt = parser.parseTable.actionHeader.length;
        const gotoHeaderCnt = parser.parseTable.gotoHeader.length;
        const header = [...parser.parseTable.actionHeader, ...parser.parseTable.gotoHeader];
        return { actionHeaderCnt, gotoHeaderCnt, header, data }
    },
});
</script>
<style scoped>
.parse-table {
    font-size: 12px;
}
table {
    border-collapse: separate;
    border-spacing: 0;
    border-top: 2px solid black;
    border-left: 2px solid black;
}
th, td {
    border: 2px solid black;
    border-top: none;
    border-left: none;
    text-align: center;
    padding: 1px 2px;
}
</style>