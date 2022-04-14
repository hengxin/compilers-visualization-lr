<template>
    <div class="automaton-control-panel">
        <div>当前操作状态：<span>I{{currentState}}</span></div>
        <GButton>求闭包</GButton>
        <GButton>状态转换</GButton>
        <div>
            <span>手动模式：</span>
            <GSwitch v-model="manual" @change="switchMode"></GSwitch>
        </div>
    </div>
    <div class="automaton-display-panel" ref="displayPanel">
        <div
            :style="{ position: 'relative', height: totalHeight + 'px', width: totalWidth + 'px' }"
        >
            <div
                v-for="(item, key) in stateItems"
                :key="key"
                :ref="(el) => { stateRefs.set(item[1].state.id, el as HTMLDivElement); }"
                :style="{ position: 'absolute', top: item[1].top + 'px', left: item[1].left + 'px' }"
                :class="item[1].hidden ? 'hidden' : ''"
                class="state-item-container"
                @mouseenter="handleStateMouseEnter(item[1])"
                @mouseleave="handleStateMouseLeave()"
            >
                <StateItem :state="item[1].state" @stateUpdate="stateUpdate"></StateItem>
            </div>
            <svg style="position: absolute;top: 0;width: 100%; height: 100%;">
                <g
                    v-for="(item, key) in lineBlocks"
                    :key="key"
                    :class="item[1].hidden ? 'hidden' : ''"
                    @mouseenter="handleLineMouseEnter(item[1])"
                    @mouseleave="handleLineMouseLeave()"
                >
                    <text
                        :class="[
                            item[1].symbol.isTerm ? 'terminal' : 'non-terminal',
                            (item[1].type === 'SameColumn' || item[1].type === 'Self') ? 'line-text-shift' : '',
                            'line-text'
                        ]"
                        :x="item[1].points[0][0]"
                        :y="item[1].points[0][1]"
                    >{{ item[1].symbol.name }}</text>
                    <polyline
                        :points="item[1].points.join(' ') + ' ' + (item[1].type === 'Self'
                    ?
                    ((item[1].points[item[1].points.length - 1][0] - GAP_ARROW) + ',' + (item[1].points[item[1].points.length - 1][1] + GAP_ARROW) + ' ' +
                        item[1].points[item[1].points.length - 1][0] + ',' + item[1].points[item[1].points.length - 1][1] + ' ' +
                        (item[1].points[item[1].points.length - 1][0] + GAP_ARROW) + ',' + (item[1].points[item[1].points.length - 1][1] + GAP_ARROW) + ' ')
                    :
                    ((item[1].points[item[1].points.length - 1][0] - GAP_ARROW) + ',' + (item[1].points[item[1].points.length - 1][1] - GAP_ARROW) + ' ' +
                        item[1].points[item[1].points.length - 1][0] + ',' + item[1].points[item[1].points.length - 1][1] + ' ' +
                        (item[1].points[item[1].points.length - 1][0] - GAP_ARROW) + ',' + (item[1].points[item[1].points.length - 1][1] + GAP_ARROW) + ' '))"
                        class="state-goto-line"
                    />
                </g>
            </svg>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, nextTick, onMounted, onUnmounted, ref } from "vue";
import EventBus from "@/utils/eventbus";
import StateItem from "./state-item.vue";
import { GButton, GSwitch } from "@/components";
import { LRItemSet, BfsStepResult, _Symbol } from "@/parsers/lr";
interface StateItemData {
    state: LRItemSet,
    // StateItem的位置
    top: number,
    left: number,
    column: number,
    linesIn: Array<number>,
    linesToRight: Array<number>,
    linesToLeft: Array<number>,
    linesToSameColumn: Array<number>,
    linesToSelf: Array<number>
    hidden: boolean,
}
interface LineBlockData {
    id: number,
    symbol: _Symbol,
    from: number,
    to: number,
    type: "Right" | "Left" | "Self" | "SameColumn",
    points: Array<[number, number]>,
    hidden: boolean,
}
interface ColumnData {
    stateIds: Array<number>,
    bottom: number,
    left: number,
    right: number,

    linesPassByRight: Array<number>,
    linesPassByLeft: Array<number>,
    linesPassByBottom: Array<number>,
}
const GAP_OUT = 16;
const GAP_IN = 8;
const GAP_INITIAL_LARGE = 16;
const GAP_INITIAL_SMALL = 8;
const GAP_LINE = 12;
const GAP_MARGIN = 48;
const GAP_STATE = 32;
const GAP_ARROW = 4;
const GAP_OFFSET = GAP_LINE / 2;
function generateStateItemData(state: LRItemSet, top: number, left: number, column: number): StateItemData {
    return {
        state, top, left, column,
        linesIn: [], linesToLeft: [], linesToRight: [], linesToSameColumn: [], linesToSelf: [],
        hidden: false,
    };
}
export default defineComponent({
    components: {
        StateItem,
        GButton,
        GSwitch,
    },
    setup() {
        // stateId -> HTMLDivElement
        const stateRefs: Map<number, HTMLDivElement> = new Map();
        const totalHeight = ref(0);
        const totalWidth = ref(0);
        const stateItems = ref<Map<number, StateItemData>>(new Map());
        const lineBlocks = ref<Map<number, LineBlockData>>(new Map());
        const columns: Array<ColumnData> = [];

        // state内部变化会影响该列下侧和右边列
        function stateUpdate(stateId: number) {
            let columnIdx = stateItems.value.get(stateId)!.column;
            let column = columns[columnIdx];
            let row = 0;
            for (; row < column.stateIds.length; row++) {
                if (column.stateIds[row] === stateId) {
                    break;
                }
            }
            nextTick(() => {
                let stateRef = stateRefs.get(stateId)!;
                // 求该state的右下角坐标
                let stateRight = stateRef.offsetLeft + stateRef.offsetWidth;
                let stateBottom = stateRef.offsetTop + stateRef.offsetHeight;
                // 影响该列下侧的state
                // row为变化的state的序号，从row+1开始影响位置
                for (row += 1; row < column.stateIds.length; row++) {
                    let affectedStateRef = stateRefs.get(column.stateIds[row])!;
                    let stateItemData = stateItems.value.get(column.stateIds[row])!
                    stateItemData.top = stateBottom + GAP_STATE;
                    stateBottom += affectedStateRef.offsetHeight + GAP_STATE;
                    nextTick(() => {
                        stateItemData.linesIn.forEach((lineId) => drawLine(lineId));
                    });
                }
                column.right = Math.max(column.right, stateRight);
                column.bottom = stateBottom;
                nextTick(() => {
                    column.linesPassByBottom.forEach((lineId) => {
                        drawLine(lineId);
                    });
                })
                // GAP_STATE为最下面一列可能存在的自环预留
                totalHeight.value = Math.max(totalHeight.value, stateBottom + GAP_MARGIN +
                    GAP_LINE * column.linesPassByBottom.length);
                totalWidth.value = Math.max(totalWidth.value, stateRight + GAP_MARGIN +
                    GAP_LINE * column.linesPassByRight.length);
                // 影响右侧一列（如果存在）
                if (columnIdx + 1 >= columns.length) {
                    return;
                }
                if (stateRight <= column.right) {
                    return;
                }
                columns[columnIdx + 1].stateIds.forEach((affectedId) => {
                    let stateItemData = stateItems.value.get(affectedId)!;
                    stateItemData.left = column.right + GAP_MARGIN * 2 +
                        GAP_LINE * column.linesPassByRight.length;
                    nextTick(() => {
                        stateItemData.linesIn.forEach((lineId) => drawLine(lineId));
                    });
                });
            });
        }

        function handleStart(state: LRItemSet) {
            stateItems.value.set(state.id, generateStateItemData(state, 0, 0, 0));
            columns.push({
                stateIds: [state.id],
                bottom: 0,
                left: 0,
                right: 0,
                linesPassByRight: [], linesPassByLeft: [], linesPassByBottom: [],
            });
        }
        function handleAppendStates(res: BfsStepResult) {
            let currentColumnIdx = stateItems.value.get(res.from)!.column;
            let currentColumn = columns[currentColumnIdx];
            let nextColumn: ColumnData = columns[currentColumnIdx + 1];
            if (nextColumn === undefined) {
                nextColumn = { stateIds: [], bottom: GAP_MARGIN, left: GAP_MARGIN, right: GAP_MARGIN, linesPassByRight: [], linesPassByLeft: [], linesPassByBottom: [] };
                columns.push(nextColumn);
            }
            let toLeft: Array<{ symbol: _Symbol, state: LRItemSet }> = [];
            let toRight: Array<{ symbol: _Symbol, state: LRItemSet }> = [];
            let toThisColumn: Array<{ symbol: _Symbol, state: LRItemSet }> = [];
            res.targets.forEach((target) => {
                if (stateItems.value.has(target.state.id)) {
                    // 指向已有的State
                    let targetColumnIdx = stateItems.value.get(target.state.id)!.column;
                    if (targetColumnIdx < currentColumnIdx) {
                        toLeft.push(target);
                    } else if (targetColumnIdx > currentColumnIdx) {
                        toRight.push(target);
                    } else {
                        toThisColumn.push(target);
                    }
                } else {
                    // 指向新的State
                    stateItems.value.set(target.state.id, generateStateItemData(target.state, 0, 0, columns.length - 1))
                    nextColumn.stateIds.push(target.state.id);
                    toRight.push(target);
                }
            });
            let gapOfColumns = GAP_MARGIN * 2 + GAP_LINE *
                (currentColumn.linesPassByRight.length + toLeft.length + toRight.length);
            console.log("Right: ", currentColumn.right, "GapOfColumns: ", gapOfColumns);
            // let top = 0;
            function setLocation(i: number, bottom: number, right: number) {
                if (i >= nextColumn.stateIds.length) {
                    totalHeight.value = Math.max(totalHeight.value, bottom);
                    totalWidth.value = Math.max(totalWidth.value, right);
                    nextColumn.right = Math.max(currentColumn.right, right);
                    nextColumn.bottom = bottom;
                    draw();
                    return;
                }
                let stateId = nextColumn.stateIds[i];
                let stateItemData = stateItems.value.get(stateId)!;
                stateItemData.left = currentColumn.right + gapOfColumns;
                stateItemData.top = bottom + GAP_STATE;
                // nextTick递归调用，才能获取真正的offsetTop和offsetHeight值
                nextTick(() => {
                    let stateRef = stateRefs.get(stateId)!;
                    setLocation(i + 1, stateRef.offsetTop + stateRef.offsetHeight,
                        Math.max(right, stateRef.offsetLeft + stateRef.offsetWidth));
                });
            }
            setLocation(0, -GAP_STATE, 0);

            // draw由setLocation全部执行完后中的nextTick调用
            function draw() {
                let ids: Array<number> = [];
                for (let i = 0; i < toRight.length; i++) {
                    let lineBlock: LineBlockData = {
                        id: lineBlocks.value.size,
                        symbol: toRight[i].symbol,
                        from: res.from, to: toRight[i].state.id,
                        type: "Right", points: [],
                        hidden: false,
                    };
                    // currentColumn.linesRight.push(lineBlock.id);
                    lineBlocks.value.set(lineBlock.id, lineBlock);
                    let from = stateItems.value.get(res.from)!;
                    let to = stateItems.value.get(lineBlock.to)!;
                    from.linesToRight.push(lineBlock.id);
                    to.linesIn.push(lineBlock.id);
                    ids.push(lineBlock.id);
                }
                currentColumn.linesPassByRight.push(...ids.reverse());
                // ids.forEach((id) => drawLine(id));
                nextColumn.stateIds.forEach((stateId) => {
                    let state = stateItems.value.get(stateId)!;
                    state.linesIn.forEach((lineId) => {
                        drawLine(lineId);
                    })
                })
                ////////////////
                for (let i = 0; i < toLeft.length; i++) {
                    let lineBlock: LineBlockData = {
                        id: lineBlocks.value.size,
                        symbol: toLeft[i].symbol,
                        from: res.from, to: toLeft[i].state.id,
                        type: "Left", points: [],
                        hidden: false,
                    };
                    lineBlocks.value.set(lineBlock.id, lineBlock);
                    let from = stateItems.value.get(lineBlock.from)!;
                    let to = stateItems.value.get(lineBlock.to)!;
                    from.linesToLeft.push(lineBlock.id);
                    to.linesIn.push(lineBlock.id);
                    currentColumn.linesPassByRight.push(lineBlock.id);
                    // currentColumn.linesPassByBottom.push(lineBlock.id);
                    for (let i = from.column; i >= to.column; i--) {
                        columns[i].linesPassByBottom.push(lineBlock.id);
                    }
                    columns[to.column].linesPassByLeft.push(lineBlock.id);
                    drawLine(lineBlock.id);
                }
                ////////////////
                ids = [];
                for (let i = 0; i < toThisColumn.length; i++) {
                    let lineBlock: LineBlockData = {
                        id: lineBlocks.value.size,
                        symbol: toThisColumn[i].symbol,
                        from: res.from, to: toThisColumn[i].state.id,
                        type: "SameColumn", points: [],
                        hidden: false,
                    }
                    if (lineBlock.from === lineBlock.to) {
                        lineBlock.type = "Self";
                    }
                    lineBlocks.value.set(lineBlock.id, lineBlock);
                    let from = stateItems.value.get(lineBlock.from)!;
                    let to = stateItems.value.get(lineBlock.to)!;
                    if (lineBlock.type === "Self") {
                        from.linesToSelf.push(lineBlock.id);
                        drawLine(lineBlock.id);
                    } else {
                        from.linesToSameColumn.push(lineBlock.id);
                        to.linesIn.push(lineBlock.id);
                        ids.push(lineBlock.id);
                    }
                }
                currentColumn.linesPassByLeft.push(...ids.reverse());
                ids.forEach((id) => drawLine(id));
            }
        }
        // 画线
        function drawLine(lineBlockId: number) {
            let lineBlock = lineBlocks.value.get(lineBlockId)!;
            let from = stateItems.value.get(lineBlock.from)!;
            let to = stateItems.value.get(lineBlock.to)!;
            let fromRef = stateRefs.get(lineBlock.from)!;
            let toRef = stateRefs.get(lineBlock.to)!;
            let points: Array<[number, number]> = [];
            if (lineBlock.type === "Right") {
                let startX = fromRef.offsetLeft + fromRef.offsetWidth;
                let startY = fromRef.offsetTop + GAP_INITIAL_LARGE + GAP_OUT * from.linesToRight.indexOf(lineBlockId);
                let endX = toRef.offsetLeft;
                let endY = toRef.offsetTop + GAP_INITIAL_SMALL + GAP_IN * to.linesIn.indexOf(lineBlockId);
                let right = columns[from.column].right + GAP_MARGIN + GAP_LINE * columns[from.column].linesPassByRight.indexOf(lineBlockId);
                totalWidth.value = Math.max(totalWidth.value, right + GAP_MARGIN);
                points.push([startX, startY]);
                points.push([right, startY]);
                points.push([right, endY]);
                points.push([endX, endY]);
            } else if (lineBlock.type === "Left") {
                let startX = fromRef.offsetLeft + fromRef.offsetWidth;
                let startY = fromRef.offsetTop + fromRef.offsetHeight - GAP_INITIAL_LARGE - GAP_OUT * from.linesToLeft.indexOf(lineBlockId);
                let endX = toRef.offsetLeft;
                let endY = toRef.offsetTop + GAP_INITIAL_SMALL + GAP_IN * to.linesIn.indexOf(lineBlockId);
                let right = columns[from.column].right + GAP_MARGIN + GAP_LINE * columns[from.column].linesPassByRight.indexOf(lineBlockId);
                let left = endX - GAP_MARGIN - GAP_OFFSET - GAP_LINE * columns[to.column].linesPassByLeft.indexOf(lineBlockId);
                let bottom = 0;
                for (let i = from.column; i >= to.column; i--) {
                    bottom = Math.max(bottom, columns[i].bottom + GAP_MARGIN + GAP_LINE * columns[i].linesPassByBottom.indexOf(lineBlockId));
                }
                totalWidth.value = Math.max(totalWidth.value, right + GAP_MARGIN);
                totalHeight.value = Math.max(totalHeight.value, bottom + GAP_MARGIN);
                points.push([startX, startY]);
                points.push([right, startY]);
                points.push([right, bottom]);
                points.push([left, bottom]);
                points.push([left, endY]);
                points.push([endX, endY]);
            } else if (lineBlock.type === "SameColumn") {
                let startX = fromRef.offsetLeft;
                let startY = fromRef.offsetTop + fromRef.offsetHeight - GAP_INITIAL_SMALL - GAP_OUT * (from.linesToSameColumn.indexOf(lineBlockId) + 1); // 多减一个GAP_OUT是为自环预留位
                let endX = startX;
                let endY = toRef.offsetTop + GAP_INITIAL_SMALL + GAP_IN * to.linesIn.indexOf(lineBlockId);
                let left = startX - GAP_MARGIN - GAP_OFFSET - GAP_LINE * columns[from.column].linesPassByLeft.indexOf(lineBlockId);
                points.push([startX, startY]);
                points.push([left, startY]);
                points.push([left, endY]);
                points.push([endX, endY]);
            } else { // lineBlock.type === "Self"
                let startX = fromRef.offsetLeft;
                let startY = fromRef.offsetTop + fromRef.offsetHeight - GAP_INITIAL_SMALL;
                let endX = fromRef.offsetLeft + GAP_INITIAL_LARGE;
                let endY = fromRef.offsetTop + fromRef.offsetHeight;
                let left = startX - GAP_MARGIN + GAP_OFFSET;
                let bottom = endY + GAP_STATE / 2;
                totalHeight.value = Math.max(totalHeight.value, bottom + GAP_MARGIN);
                points.push([startX, startY]);
                points.push([left, startY]);
                points.push([left, bottom]);
                points.push([endX, bottom]);
                points.push([endX, endY]);
            }
            lineBlock.points = points;
        }
        const unsubscribe = [
            EventBus.subscribe("lr", "AutomatonStart", handleStart),
            EventBus.subscribe("lr", "AutomatonAppendStates", handleAppendStates),
        ];
        onUnmounted(() => { unsubscribe.forEach(fn => fn()); });

        function handleStateMouseEnter(stateItem: StateItemData) {
            stateItems.value.forEach(item => item.hidden = true);
            lineBlocks.value.forEach(item => item.hidden = true);
            stateItem.hidden = false;
            stateItem.linesToLeft.forEach((line) => {
                let lineBlock = lineBlocks.value.get(line)!;
                lineBlock.hidden = false;
                let to = stateItems.value.get(lineBlock.to)!;
                to.hidden = false;
            });
            stateItem.linesToRight.forEach((line) => {
                let lineBlock = lineBlocks.value.get(line)!;
                lineBlock.hidden = false;
                let to = stateItems.value.get(lineBlock.to)!;
                to.hidden = false;
            });
            stateItem.linesToSameColumn.forEach((line) => {
                let lineBlock = lineBlocks.value.get(line)!;
                lineBlock.hidden = false;
                let to = stateItems.value.get(lineBlock.to)!;
                to.hidden = false;
            });
            stateItem.linesToSelf.forEach((line) => {
                let lineBlock = lineBlocks.value.get(line)!;
                lineBlock.hidden = false;
                let to = stateItems.value.get(lineBlock.to)!;
                to.hidden = false;
            });
        }
        function handleStateMouseLeave() {
            stateItems.value.forEach(item => item.hidden = false);
            lineBlocks.value.forEach(item => item.hidden = false);
        }
        function handleLineMouseEnter(lineBlock: LineBlockData) {
            stateItems.value.forEach((item, id) => {
                if (id === lineBlock.from || id === lineBlock.to) {
                    return;
                }
                item.hidden = true;
            });
            lineBlocks.value.forEach((item, id) => {
                if (id === lineBlock.id) {
                    return;
                }
                item.hidden = true;
            });
        }
        function handleLineMouseLeave() {
            stateItems.value.forEach(item => item.hidden = false);
            lineBlocks.value.forEach(item => item.hidden = false);
        }

        // 拖拽滚动功能
        const displayPanel = ref<HTMLDivElement>();
        let mousedown = false;
        let startX = 0, startY = 0;
        let scrollTop = 0, scrollLeft = 0;
        onMounted(() => {
            displayPanel.value!.addEventListener("mousedown", (ev) => {
                startX = ev.offsetX;
                startY = ev.offsetY;
                mousedown = true;
            });
            displayPanel.value!.addEventListener("mouseup", () => {
                mousedown = false;
            });
            displayPanel.value!.addEventListener("mousemove", (ev) => {
                if (mousedown) {
                    let offsetX = ev.offsetX - startX;
                    let offsetY = ev.offsetY - startY;
                    let limitX = displayPanel.value!.scrollWidth - displayPanel.value!.offsetWidth;
                    let limitY = displayPanel.value!.scrollHeight - displayPanel.value!.offsetHeight;
                    scrollTop = scrollTop - offsetY;
                    scrollLeft = scrollLeft - offsetX;
                    if (scrollTop >= limitY) {
                        scrollTop = limitY;
                    } else if (scrollTop <= 0) {
                        scrollTop = 0;
                    }
                    if (scrollLeft >= limitX) {
                        scrollLeft = limitX;
                    } else if (scrollLeft <= 0) {
                        scrollLeft = 0;
                    }
                    displayPanel.value!.scrollTop = scrollTop;
                    displayPanel.value!.scrollLeft = scrollLeft;
                    // console.log("SCROLL: ", scrollTop, scrollLeft)
                }
            });
        });

        const manual = ref(false);
        const currentState = ref(-1);
        function switchMode(value: boolean) {
        }

        return {
            stateItems, lineBlocks, displayPanel,
            stateUpdate, stateRefs,
            GAP_ARROW, totalHeight, totalWidth,
            handleStateMouseEnter, handleStateMouseLeave,
            handleLineMouseEnter, handleLineMouseLeave,
            manual, currentState, switchMode,
        };
    }
});
</script>

<style scoped>
.automaton-display-panel {
    overflow: auto;
    width: 100%;
    height: 600px;
    border: 4px black solid;
    user-select: none;
    position: relative;
    font-size: 12px;
    padding: 32px;
}
.state-item-container {
    animation: 0.5s fade-in;
    z-index: 100;
}
@keyframes fade-in {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}
svg {
    display: block;
}
.state-goto-line {
    stroke: var(--color-klein-blue);
    stroke-width: 2;
    stroke-linejoin: round;
    fill: none;
    animation: 0.5s line-move;
    z-index: 10;
}
@keyframes line-move {
    from {
        stroke-dasharray: 0, 100;
    }
    to {
        stroke-dasharray: 100, 0;
    }
}
.terminal {
    font-family: "Times New Roman";
}
.non-terminal {
    font-family: "Cambria Math";
}
.line-text {
    transform: translateY(-3px);
    font-weight: bold;
    z-index: 50;
}
.line-text-shift {
    /* transform: translateX(-100%); */
    text-anchor: end;
}
.hidden {
    opacity: 0.2;
}
</style>