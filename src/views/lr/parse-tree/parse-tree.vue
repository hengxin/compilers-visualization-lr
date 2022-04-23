<template>
    <div class="parse-message-container">
        <div class="parse-operations">
            <div v-for="op in operations">
                <span>{{ op.abbr }}{{ op.arg }}</span>
                <span v-if="op.name === 'Reduce'">{{ op.rule.toString() }}</span>
            </div>
        </div>
        <div class="parse-current-token">
            <div>NextToken:&nbsp;{{ nextToken.type }}({{ nextToken.value }})</div>
        </div>
    </div>
    <div class="parse-stack-container">
        <div class="stack">
            <div class="stack-block" v-for="item in stateStack" :key="item[0]">
                <span>I<sub>{{ item[1] }}</sub></span>
            </div>
            <div class="stack-block-empty"></div>
        </div>
    </div>
    <div class="parse-tree-container">
        <div class="chart" ref="chartRef"></div>
    </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import * as echarts from "echarts/core";
import { TooltipComponent, TooltipComponentOption } from "echarts/components";
import { TreeChart, TreeSeriesOption } from "echarts/charts";
import { SVGRenderer } from "echarts/renderers";
import { GetParser, ParseStepResult, Action } from "@/parsers/lr";
import EventBus from "@/utils/eventbus";

const parser = GetParser();
const nextToken = ref(parser.currentToken);
const operations = ref<Array<Action>>([]);
const stateStack = ref<Array<[symbol, number]>>([[Symbol(), 0]]);

function handleParseTreeStep(step: ParseStepResult) {
    console.log(step);
    if (step.operations.length === 1) {
        // Shift
        const op = step.operations[0];
        operations.value.splice(0);
        operations.value.push(op.action);
        op.stateStackDiff.forEach((value) => {
            stateStack.value.push([Symbol(), value]);
        });
    } else if (step.operations.length === 2) {
        // Reduce & Goto
        const opReduce = step.operations[0];
        const opGoto = step.operations[1];
        operations.value.splice(0);
        operations.value.push(opReduce.action, opGoto.action);
        stateStack.value.splice(-opReduce.stateStackDiff.length, opReduce.stateStackDiff.length);
        opGoto.stateStackDiff.forEach((value) => {
            stateStack.value.push([Symbol(), value]);
        });
    } else {
        // TODO ACC
    }
    nextToken.value = step.nextToken;
}
const unsubscribe = [
    EventBus.subscribe("lr", "ParseTreeStep", handleParseTreeStep),
];
onUnmounted(() => { unsubscribe.forEach(fn => fn()) });



echarts.use([TooltipComponent, TreeChart, SVGRenderer]);
type ECOption = echarts.ComposeOption<TooltipComponentOption | TreeSeriesOption>

const chartRef = ref<HTMLDivElement>();
const option: ECOption = {
    series: []
}
let chart: echarts.ECharts | undefined = undefined;
onMounted(() => {
    chart = echarts.init(chartRef.value!);
    chart.setOption(option)
});
function change() {
    option.series = [];
    chart?.setOption(option, true);
}
</script>
<style scoped>
.parse-message-container {
    display: flex;
    flex-direction: row;
    width: fit-content;
}

.parse-operations {
    width: 200px;
    height: 50px;
    border: 2px var(--color-klein-blue) solid;
}

.parse-current-token {
    height: 50px;
    border: 2px var(--color-klein-blue) solid;
    border-left: none;
    display: flex;
    align-items: center;
    justify-content: center;
}

.parse-stack-container {
    width: 100%;
    overflow: auto;
}

.stack {
    border: 2px var(--color-klein-blue) solid;
    border-right: none;
    width: fit-content;
    display: flex;
    flex-direction: row;
}

.stack-block,
.stack-block-empty {
    margin: 2px 2px 2px 0;
    padding: 4px;
}

.stack-block:first-child {
    margin-left: 2px;
}

.stack-block {
    border: 2px var(--color-klein-blue) solid;
    animation: slide-in ease 0.4s;
}

@keyframes slide-in {
    0% {
        opacity: 0;
        transform: translateX(100%);
    }

    100% {
        opacity: 100;
        transform: translateX(0);
    }
}

.chart {
    width: 500px;
    height: 500px;
}
</style>