<template>
    <div class="parse-message-container">
        <div class="parse-operations">
            <template v-if="operation">
                <span>{{ t("LR.ParseTree.Action") }}:&nbsp;</span>
                <span class="non-terminal">{{ operation.abbr }}</span>
                <span class="terminal" v-show="operation.name !== 'Accept'">{{ operation.arg }}</span>
                <RuleLine style="margin-left: 8px" v-if="operation.name === 'Reduce'" :rule="operation.rule"></RuleLine>
            </template>
        </div>
        <div class="parse-current">
            <template v-if="(nextToken instanceof Token)">
                <span>{{ t("LR.ParseTree.NextToken") }}:&nbsp;</span>
                <div class="parse-current-text terminal">
                    <span>{{ nextToken.type }}</span>
                    <span v-if="nextToken.type !== nextToken.value">({{ nextToken.value }})</span>
                </div>
            </template>
            <template v-else>
                <span>{{ t("LR.ParseTree.NextSymbol") }}:&nbsp;</span>
                <div class="parse-current-text non-terminal">
                    <span>{{ (nextToken as Tree).symbol.name }}</span>
                </div>
            </template>
        </div>
        <div class="zoom-panel">
        <span @click="adjustZoom(10)"><i class="bi bi-zoom-in"></i></span>
        <span @click="adjustZoom(-10)"><i class="bi bi-zoom-out"></i></span>
        <span @click="adjustZoom()"><i class="bi bi-arrow-clockwise"></i></span>
    </div>
    </div>
    <div class="parse-stack-container">
        <div class="parse-stack-title">{{ t('LR.ParseTree.StateStack') }}</div>
        <ParseStack ref="stateStackRef" style="margin-right: 8px;" mode="html" color1="#5976ba" color2="#b0c4de">
        </ParseStack>
        <div class="parse-stack-title">{{ t('LR.ParseTree.SymbolStack') }}</div>
        <ParseStack ref="valueStackRef" mode="html" color1="#68945c" color2="#6fbe2c"></ParseStack>
    </div>
    <div class="parse-tree" ref="parseTreeRef">
        <svg :width="totalWidth" :height="totalHeight" :style="{ transform: 'scale(' + zoom + '%)', transformOrigin: '0px 0px'}">
            <!-- path放在上面是为了不让路径盖住文字 -->
            <path v-for="treePath in treePathList" :key="treePath.id" :d="treePath.pathStr" class="tree-path"
                v-show="treePath.visible"></path>
            <g v-for="treeNode in treeNodeList" :key="treeNode.id" class="tree-node-group" v-show="treeNode.visible">
                <circle :cx="treeNode.x" :cy="treeNode.y" :r="RADIUS"
                    :class="['tree-node-circle', treeNode.expand ? '' : 'tree-node-solid']"
                    @click="treeNode.changeExpand()">
                </circle>
                <text :class="['tree-node-text', treeNode.symbol.isTerm ? 'terminal' : 'non-terminal']" :x="treeNode.x"
                    :y="treeNode.y + TEXT_SHIFT_Y">{{ treeNode.symbol.name }}</text>
            </g>
        </svg>
    </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { MessageSchema } from "@/i18n";
import { GetParser, ParseStepResult, Action, Tree, _Symbol, Token, SYMBOL_END } from "@/parsers/lr";
import EventBus from "@/utils/eventbus";

import ParseStack from "./parse-stack.vue";
import RuleLine from "../input-panel/rule-line.vue";

const { t } = useI18n<{ message: MessageSchema }>({ useScope: "global" });
const parser = GetParser();
const nextToken = ref(parser.current);
const operation = ref<Action>();
const stateStackRef = ref<InstanceType<typeof ParseStack>>();
const valueStackRef = ref<InstanceType<typeof ParseStack>>();

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
    expand: boolean = true;
    visible: boolean = true;
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
    private changeExpandShow(val: boolean) {
        this.visible = val;
        // show改为false就直接把所有子节点都改
        // 改为true的话要看当前节点是否展开，展开才改子节点。
        if (!val || this.expand) {
            if (this.path) {
                this.path.visible = val;
            }
            this.children.forEach(child => child.changeExpandShow(val));
        }
    }
    changeExpand() {
        if (this.children.length === 0) return;
        // const newValue = !this.expand;
        this.expand = !this.expand;
        if (this.path) {
            this.path.visible = this.expand;
        }
        this.children.forEach(child => child.changeExpandShow(this.expand));
    }
}
class TreePath {
    id: symbol = Symbol();
    pathStr: string = "";
    visible: boolean = true;
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
    if (step.action.name === "Shift") {
        // Shift
        operation.value = step.action;
        step.stateStackDiff.forEach(value => stateStackRef.value?.push({
            content: "<span class=\"non-terminal\">I</span><sub class=\"terminal\">" + value.toString() + "</sub>",
        }));
        step.valueStackDiff.forEach(value => valueStackRef.value?.push({
            title: value.symbol.name,
            content: "<span class=\""+ (value.symbol.isTerm ? "terminal" : "non-terminal") + "\">" + value.symbol.name + "</span>",
        }));
        const newTree = step.valueStackDiff[0];
        addTree(newTree);
    } else if (step.action.name === "Reduce") {
        // Reduce
        operation.value = step.action;
        stateStackRef.value?.pop(step.stateStackDiff.length);
        valueStackRef.value?.pop(step.valueStackDiff.length);
        mergeTree(step.next as Tree, step.valueStackDiff.length);
    } else if (step.action.name === "Goto") {
        // Goto
        operation.value = step.action;
        step.stateStackDiff.forEach(value => stateStackRef.value?.push({
            content: "<span class=\"non-terminal\">I</span><sub class=\"terminal\">" + value.toString() + "</sub>",
        }));
        step.valueStackDiff.forEach(value => valueStackRef.value?.push({
            title: value.symbol.name,
            content: "<span class=\""+ (value.symbol.isTerm ? "terminal" : "non-terminal") + "\">" + value.symbol.name + "</span>",
        }));
    } else {
        // TODO ACC
        operation.value = step.action;
    }
    nextToken.value = step.next;
}

onMounted(() => {
    stateStackRef.value?.push({ content: "<span class=\"non-terminal\">I</span><sub class=\"terminal\">0</sub>" });
    valueStackRef.value?.push({ title: SYMBOL_END.name, content: "<span class=\"terminal\">" + SYMBOL_END.name + "</span>" });
});

const unsubscribe = [
    EventBus.subscribe("lr", "ParseTreeStep", handleParseTreeStep),
];
onUnmounted(() => { unsubscribe.forEach(fn => fn()) });

// 拖拽滚动功能
const parseTreeRef = ref<HTMLDivElement>();
let mousedown = false;
let startX = 0, startY = 0;
let scrollTop = 0, scrollLeft = 0;
function handleMouseDown(ev: MouseEvent) {
    ev.preventDefault();
    startX = ev.pageX;
    startY = ev.pageY;
    scrollLeft = parseTreeRef.value!.scrollLeft;
    scrollTop = parseTreeRef.value!.scrollTop;
    mousedown = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
}
function handleMouseMove(ev: MouseEvent) {
    if (mousedown) {
        let offsetX = ev.pageX - startX;
        let offsetY = ev.pageY - startY;
        parseTreeRef.value!.scrollLeft = scrollLeft - offsetX;
        parseTreeRef.value!.scrollTop = scrollTop - offsetY;
    }
}
function handleMouseUp() {
    mousedown = false;
    scrollLeft = parseTreeRef.value!.scrollLeft;
    scrollTop = parseTreeRef.value!.scrollTop;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
}
onMounted(() => {
    parseTreeRef.value!.addEventListener("mousedown", handleMouseDown);
});

// 放大缩小功能
const zoom = ref(100);
function adjustZoom(value?: number) {
    if (value === undefined) {
        zoom.value = 100;
        return;
    }
    if (zoom.value <= 20 && value < 0) return;
    zoom.value += value;
}
</script>
<style scoped>
.parse-message-container {
    position: absolute;
    top: 0;
    left: 0;
    width: fit-content;
    margin: 8px 0 0 8px;
    padding: 4px;
    border: 2px solid rgb(33, 166, 117);
    border-radius: 4px;
    background-color: rgba(33, 166, 117, 0.2);
    z-index: 1;
}

.parse-operations {
    display: flex;
    flex-direction: row;
    align-items: center;
}

.parse-current {
    display: flex;
    align-items: center;
}

.parse-current-text {
    background-color: whitesmoke;
    padding: 0 4px
}

.zoom-panel {
    position: absolute;
    left: calc(100% + 8px);
    top: 0;
    font-size: 16px;
    width: fit-content;
}

.zoom-panel * {
    margin-right: 4px;
    cursor: pointer;
}

.parse-stack-container {
    height: calc(100% - 80px);
    position: absolute;
    left: 0;
    bottom: 0px;
    margin-bottom: 16px;
    padding-right: 8px;
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    z-index: 1;
}

.parse-stack-title {
    writing-mode: vertical-rl;
    margin: 0 4px 4px 4px;
    font-style: italic;
    width: 20px;
    line-height: 20px;
    font-size: 16px;
}

.parse-tree {
    /* margin: 60px 0 0 220px; */
    width: 100%;
    height: 100%;
    padding: 60px 0 0 220px;
    overflow: auto;
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
    stroke: #5976ba;
    stroke-width: 2;
    fill: white;
    transition: all 0.5s;
}

.tree-node-solid {
    fill: #b0c4de;
}

.tree-node-text {
    text-anchor: middle;
    font-size: 12px;
    font-weight: bold;
    stroke: white;
    stroke-width: 2;
    fill: black;
    paint-order: stroke fill;
    transition: all 0.5s;
    user-select: none;
}

.tree-path {
    stroke: #68945c;
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