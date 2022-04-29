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
    <div class="parse-tree2">
        <svg :width="totalWidth" :height="totalHeight">
            <!-- path放在上面是为了不让路径盖住文字 -->
            <path v-for="treePath in treePathList" :key="treePath.id" :d="treePath.pathStr" class="tree-path"></path>
            <g v-for="treeNode in treeNodeList" :key="treeNode.id" class="tree-node-group">
                <circle :cx="treeNode.x" :cy="treeNode.y" :r="RADIUS" class="tree-node-circle">
                </circle>
                <text class="tree-node-text" :x="treeNode.x" :y="treeNode.y + TEXT_SHIFT_Y">{{ treeNode.symbol.name
                }}</text>
            </g>
        </svg>
    </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { GetParser, ParseStepResult, Action, Tree, _Symbol } from "@/parsers/lr";
import EventBus from "@/utils/eventbus";

const parser = GetParser();
const nextToken = ref(parser.currentToken);
const operations = ref<Array<Action>>([]);
const stateStack = ref<Array<[symbol, number]>>([[Symbol(), 0]]);

const VERTICAL_GAP = 60, HORIZONTAL_GAP = 60;
const RADIUS = 8;
const TEXT_SHIFT_Y = 20;
const MARGIN = 30, PRESERVE = 200;
const totalWidth = ref(PRESERVE);
const totalHeight = ref(PRESERVE);
class TreeData {
    id: symbol = Symbol();
    children: Array<TreeData>;
    symbol: _Symbol;
    value: string;
    x: number;
    y: number;
    path: TreePath | undefined;
    constructor(parseTree: Tree, x: number, y: number, children?: Array<TreeData>) {
        this.symbol = parseTree.symbol;
        this.value = parseTree.value;
        this.x = x;
        this.y = y;
        this.children = children ? children : [];
    }
    private shift(offsetY: number, depth: number): void {
        this.y += offsetY;
        this.shiftChildren(offsetY, depth);
        if (this.path !== undefined) {
            this.drawPath();
        }
    }
    shiftChildren(offsetY: number, depth: number = 0): void {
        if (this.children.length === 0) {
            totalHeight.value = Math.max(totalHeight.value, depth * HORIZONTAL_GAP + PRESERVE);
        }
        this.children.forEach(child => child.shift(offsetY, depth + 1));
    }
    drawPath() {
        if (this.children.length === 0) {
            return;
        }
        if (this.path === undefined) {
            this.path = new TreePath();
            treePathList.value.push(this.path);
        }
        const childrenXList = this.children.map(child => child.x);
        const childrenY = this.children[0].y;
        const forkY = Math.floor((this.y + childrenY) / 2);
        let pathStr = `M ${this.x} ${this.y + RADIUS} V ${forkY}`;
        for (let i = 0; i < childrenXList.length; i++) {
            pathStr += `M ${childrenXList[i]} ${forkY} V ${childrenY - RADIUS}`;
            if (i !== childrenXList.length - 1) {
                pathStr += `M ${childrenXList[i]} ${forkY} H ${childrenXList[i + 1]}`;
            }
        }
        this.path.pathStr = pathStr;
    }
}
class TreePath {
    id: symbol = Symbol();
    pathStr: string = "";
}

const treeNodeList = ref<Array<TreeData>>([]);
const treeList: Array<TreeData> = [];
const treePathList = ref<Array<TreePath>>([]);
let right = MARGIN - VERTICAL_GAP;

function addTree(parseTree: Tree) {
    let x = right + VERTICAL_GAP;
    right = x;
    totalWidth.value = right + PRESERVE;
    const treeData = new TreeData(parseTree, x, MARGIN);
    treeNodeList.value.push(treeData);
    treeList.push(treeData);
}

function mergeTree(root: Tree, numOfChildren: number) {
    const children = treeList.splice(-numOfChildren, numOfChildren);
    let x = 0;
    if (children.length > 0) {
        x = Math.floor((children[0].x + children[children.length - 1].x) / 2);
    } else {
        x = right + VERTICAL_GAP;
        right = x;
    }
    const treeData = new TreeData(root, x, MARGIN, children);
    treeNodeList.value.push(treeData);
    // 这里直接改treeData而没有从ref.value改也能生效，估计是因为push导致的渲染实际上是在nexttick执行的。
    treeData.shiftChildren(HORIZONTAL_GAP);
    treeList.push(treeData);

    treeData.drawPath();
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
        addTree(newTree);
    } else if (step.operations.length === 2) {
        // Reduce & Goto
        const opReduce = step.operations[0];
        const opGoto = step.operations[1];
        operations.value.splice(0);
        operations.value.push(opReduce.action, opGoto.action);
        stateStack.value.splice(-opReduce.stateStackDiff.length, opReduce.stateStackDiff.length);
        opGoto.stateStackDiff.forEach(value => stateStack.value.push([Symbol(), value]));
        const newTree = opGoto.valueStackDiff[0];
        mergeTree(newTree, opReduce.valueStackDiff.length);
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

.tree-node-group {
    animation: fade-in 0.5s;
}

@keyframes fade-in {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

.tree-node-circle {
    stroke: var(--color-klein-blue);
    stroke-width: 2;
    fill: none;
    transition: all 0.5s;
}

.tree-node-text {
    text-anchor: middle;
    font-size: 12px;
    font-weight: bold;
    stroke: yellow;
    stroke-width: 2;
    fill: black;
    paint-order: stroke fill;
    transition: all 0.5s;
}

.tree-path {
    stroke: red;
    stroke-width: 1;
    fill: none;
    transition: all 0.5s;
    animation: 0.8s line-move;
}

@keyframes line-move {
    from {
        stroke-dasharray: 0, 10;
        stroke-dashoffset: 50;
    }
    to {
        stroke-dasharray: 10, 0;
        stroke-dashoffset: 0;
    }
}
</style>