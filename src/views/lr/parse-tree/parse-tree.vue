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
        <div class="chart" ref="chartRef" :style="{ width: chartWidth + 'px', height: chartHeight + 'px' }"></div>
    </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";
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

echarts.use([TooltipComponent, TreeChart, SVGRenderer]);
const chartRef = ref<HTMLDivElement>();
type ECOption = echarts.ComposeOption<TooltipComponentOption | TreeSeriesOption>;
const series: Array<TreeSeriesOption> = [];
const option: ECOption = {
    series,
}
let chart: echarts.ECharts | undefined = undefined;
onMounted(() => {
    chart = echarts.init(chartRef.value!);
    chart.setOption(option)
});

function generateTreeSeriesOption(data: TreeSeriesOption["data"], left: number, width?: number, height?: number): TreeSeriesOption {
    return {
        type: "tree",
        orient: "vertical",
        data,
        left,
        top: MARGIN,
        width: width === undefined ? 0 : width,
        height: height === undefined ? 0 : height,
        edgeShape: "polyline",
        initialTreeDepth: -1,
    };
}

// 仅用来计算树的高度
class TreeInfo {
    children: Array<TreeInfo>;
    expand: boolean = true;
    constructor(children?: Array<TreeInfo>) {
        this.children = children ? children : [];
    }
    getDepth(): number {
        let depth = 0;
        this.children.forEach((child) => {
            if (child.expand) {
                depth = Math.max(depth, child.getDepth() + 1);
            }
        });
        return depth;
    }
}
const treeInfoList: Array<TreeInfo> = [];

const VERTICAL_SEPARATION = 60;
const HORIZONTAL_SEPARATION = 60;
const MARGIN = 30;

const chartWidth = ref(MARGIN * 2);
const chartHeight = ref(MARGIN * 2);
async function updateChartSize(width: number, height: number) {
    chartWidth.value = width;
    chartHeight.value = height;
    console.log("UpdateChartSize", width, height);
    await nextTick();
    chart?.resize();
}

async function handleParseTreeStep(step: ParseStepResult) {
    console.log(step);
    if (step.operations.length === 1) {
        // Shift
        const op = step.operations[0];
        operations.value.splice(0);
        operations.value.push(op.action);
        // Symbol()是为了让key唯一
        op.stateStackDiff.forEach(value => stateStack.value.push([Symbol(), value]));

        const newTree = op.valueStackDiff[0];
        // 左侧距离
        let left = series.length * VERTICAL_SEPARATION + MARGIN;
        series.forEach(option => left += option.width as number);
        // 新移入的宽度高度都当作0，不需要求。
        await updateChartSize(left + MARGIN, chartHeight.value);
        const treeOption = generateTreeSeriesOption(
            [{ name: newTree.symbol.name, children: [] }], left);
        series.push(treeOption);
        treeInfoList.push(new TreeInfo());
        chart?.setOption(option, true);
    } else if (step.operations.length === 2) {
        // Reduce & Goto
        const opReduce = step.operations[0];
        const opGoto = step.operations[1];
        operations.value.splice(0);
        operations.value.push(opReduce.action, opGoto.action);
        stateStack.value.splice(-opReduce.stateStackDiff.length, opReduce.stateStackDiff.length);
        opGoto.stateStackDiff.forEach(value => stateStack.value.push([Symbol(), value]));

        const newTree = opGoto.valueStackDiff[0];
        const children = series.splice(-opReduce.valueStackDiff.length, opReduce.valueStackDiff.length);
        const childrenData = children.map(series => series.data![0]);
        // 左侧距离
        let left = series.length * VERTICAL_SEPARATION + MARGIN;
        series.forEach(option => left += option.width as number);
        // 宽度（注意空串的情况）
        let width = ((children.length > 0 ? children.length : 1) - 1) * VERTICAL_SEPARATION;
        children.forEach(child => width += child.width as number);
        // 高度
        const treeInfoChildren = treeInfoList.splice(-opReduce.valueStackDiff.length, opReduce.valueStackDiff.length);
        const newTreeInfo = new TreeInfo(treeInfoChildren)
        treeInfoList.push(newTreeInfo);
        const depth = newTreeInfo.getDepth();
        const height = depth * HORIZONTAL_SEPARATION;

        await updateChartSize(left + width + MARGIN, Math.max(chartHeight.value, height + MARGIN * 2));
        const treeOption = generateTreeSeriesOption([{ name: newTree.symbol.name, children: childrenData }], left, width, height);
        console.log(left, width, height);
        series.push(treeOption);
        chart?.setOption(option, true);
        // resize();
    } else {
        // TODO ACC
    }
    nextToken.value = step.nextToken;
}

const unsubscribe = [
    EventBus.subscribe("lr", "ParseTreeStep", handleParseTreeStep),
];
onUnmounted(() => { unsubscribe.forEach(fn => fn()) });
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