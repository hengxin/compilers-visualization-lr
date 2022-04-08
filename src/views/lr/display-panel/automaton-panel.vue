<template>
    <div class="automaton-panel" ref="automatonPanel">
        <div
            :style="{ position: 'relative', height: totalHeight + '1000px', width: totalWidth + '1000px' }"
        >
            <button @click="test">ddd</button>
            <div
                v-for="(item, key) in stateItems"
                :key="key"
                :ref="(el) => { stateRefs.set(item[1].state.id, el as HTMLDivElement); }"
                :style="{ position: 'absolute', top: item[1].top + 'px', left: item[1].left + 'px' }"
                :class="item[1].hidden ? 'hidden' : ''"
                class="state-item-container"
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
import { LRItemSet, BfsStepResult, _Symbol } from "@/parsers/lr";
interface StateItemData {
    state: LRItemSet,
    // StateItem的位置
    top: number,
    left: number,
    column: number,
    row: number,

    edgeInTop: number, // 从左边的入边至顶部的距离
    edgeOutTop: number, // 从右上的出边至顶部的距离
    edgeOutBottom: number, // 从右下的出边至底部的距离
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
    // 线在canvas内的拐点，线条走向不同拐点个数不同。注意：坐标为canvas内部坐标。
    // 可能也不需要存points？存不存都要重新算？
    type: "Right" | "Left" | "Self" | "SameColumn",
    points: Array<[number, number]>,
    // columnData: ColumnData,

    hidden: boolean,
}
interface ColumnData {
    stateIds: Array<number>,
    bottom: number,
    left: number,
    right: number,

    linesPassByRight: Array<number>,
    linesPassByLeft: Array<number>,
    // linesToThisColumn: Array<number>,
    linesPassByBottom: Array<number>,
    // linesToSelf: Array<number>,
}
const GAP_OUT = 16;
const GAP_IN = 8;
const GAP_INITIAL = 16;
const GAP_LINE = 12;
const GAP_MARGIN = 48;
const GAP_STATE = 32;
const GAP_ARROW = 4;
const GAP_OFFSET = GAP_LINE / 2;
function generateStateItemData(state: LRItemSet, top: number, left: number, column: number, row: number,
    edgeInTop?: number, edgeOutTop?: number, edgeOutBottom?: number): StateItemData {
    return {
        state, top, left, column, row,
        edgeInTop: edgeInTop ? edgeInTop : 0,
        edgeOutTop: edgeOutTop ? edgeOutTop : 0,
        edgeOutBottom: edgeOutBottom ? edgeOutBottom : 0,
        linesIn: [], linesToLeft: [], linesToRight: [], linesToSameColumn: [], linesToSelf: [],
        hidden: false,
    };
}
export default defineComponent({
    components: {
        StateItem,
    },
    setup() {
        // stateId -> HTMLDivElement
        const stateRefs: Map<number, HTMLDivElement> = new Map();
        const totalHeight = ref(0);
        const totalWidth = ref(0);
        function test() {
            console.log(stateRefs);
        }

        const stateItems = ref<Map<number, StateItemData>>(new Map());
        const lineBlocks = ref<Map<number, LineBlockData>>(new Map());
        // const lineCanvasRefs: Map<number, HTMLCanvasElement> = new Map();
        const columns: Array<ColumnData> = [];
        // stateId -> columnIndex
        const stateIdToColumnMap: Map<number, number> = new Map();

        // state内部变化会影响该列下侧和右边列
        function stateUpdate(stateId: number) {
            let columnIdx = stateIdToColumnMap.get(stateId)!;
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
            stateItems.value.set(state.id, generateStateItemData(state, 0, 0, 0, 0));
            stateIdToColumnMap.set(state.id, 0);
            columns.push({
                stateIds: [state.id],
                bottom: 0,
                left: 0,
                right: 0,
                linesPassByRight: [], linesPassByLeft: [], linesPassByBottom: [],
            });
        }
        function handleAppendStates(res: BfsStepResult) {
            let currentColumnIdx = stateIdToColumnMap.get(res.from)!
            let currentColumn = columns[currentColumnIdx];
            let nextColumn: ColumnData = columns[currentColumnIdx + 1];
            if (nextColumn === undefined) {
                nextColumn = { stateIds: [], bottom: GAP_MARGIN, left: GAP_MARGIN, right: GAP_MARGIN, linesPassByRight: [], linesPassByLeft: [], linesPassByBottom: [] };
                columns.push(nextColumn);
            }
            let toLeft: Array<{ symbol: _Symbol, state: LRItemSet }> = [];
            let toRight: Array<{ symbol: _Symbol, state: LRItemSet }> = [];
            let toThisColumn: Array<{ symbol: _Symbol, state: LRItemSet }> = [];
            let row = 0;
            res.targets.forEach((target) => {
                if (stateItems.value.has(target.state.id)) {
                    // 指向已有的State
                    let targetColumnIdx = stateIdToColumnMap.get(target.state.id)!;
                    if (targetColumnIdx < currentColumnIdx) {
                        toLeft.push(target);
                    } else if (targetColumnIdx > currentColumnIdx) {
                        toRight.push(target);
                    } else {
                        toThisColumn.push(target);
                    }
                } else {
                    // 指向新的State
                    row++;
                    stateItems.value.set(target.state.id, generateStateItemData(target.state, 0, 0, columns.length - 1, row))
                    stateIdToColumnMap.set(target.state.id, columns.length - 1);
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
                let startY = fromRef.offsetTop + GAP_INITIAL + GAP_OUT * from.linesToRight.indexOf(lineBlockId);
                let endX = toRef.offsetLeft;
                let endY = toRef.offsetTop + GAP_INITIAL + GAP_IN * to.linesIn.indexOf(lineBlockId);
                let right = columns[from.column].right + GAP_MARGIN + GAP_LINE * columns[from.column].linesPassByRight.indexOf(lineBlockId);
                console.log("LINEPASSBYRIGHT: ", columns[from.column].linesPassByRight.indexOf(lineBlockId))
                points.push([startX, startY]);
                points.push([right, startY]);
                points.push([right, endY]);
                points.push([endX, endY]);
            } else if (lineBlock.type === "Left") {
                let startX = fromRef.offsetLeft + fromRef.offsetWidth;
                let startY = fromRef.offsetTop + fromRef.offsetHeight - GAP_INITIAL - GAP_OUT * from.linesToLeft.indexOf(lineBlockId);
                let endX = toRef.offsetLeft;
                let endY = toRef.offsetTop + GAP_INITIAL + GAP_IN * to.linesIn.indexOf(lineBlockId);
                let right = columns[from.column].right + GAP_MARGIN + GAP_LINE * columns[from.column].linesPassByRight.indexOf(lineBlockId);
                let left = endX - GAP_MARGIN - GAP_OFFSET - GAP_LINE * columns[to.column].linesPassByLeft.indexOf(lineBlockId);
                let bottom = 0;
                for (let i = from.column; i >= to.column; i--) {
                    bottom = Math.max(bottom, columns[i].bottom + GAP_MARGIN + GAP_LINE * columns[i].linesPassByBottom.indexOf(lineBlockId));
                }
                points.push([startX, startY]);
                points.push([right, startY]);
                points.push([right, bottom]);
                points.push([left, bottom]);
                points.push([left, endY]);
                points.push([endX, endY]);
            } else if (lineBlock.type === "SameColumn") {
                let startX = fromRef.offsetLeft;
                let startY = fromRef.offsetTop + fromRef.offsetHeight - GAP_INITIAL - GAP_OUT * (from.linesToSameColumn.indexOf(lineBlockId) + 1); // 多减一个GAP_OUT是为自环预留位
                let endX = startX;
                let endY = toRef.offsetTop + GAP_INITIAL + GAP_IN * to.linesIn.indexOf(lineBlockId);
                let left = startX - GAP_MARGIN - GAP_OFFSET - GAP_LINE * columns[from.column].linesPassByLeft.indexOf(lineBlockId);
                points.push([startX, startY]);
                points.push([left, startY]);
                points.push([left, endY]);
                points.push([endX, endY]);
            } else { // lineBlock.type === "Self"
                let startX = fromRef.offsetLeft;
                let startY = fromRef.offsetTop + fromRef.offsetHeight - GAP_INITIAL;
                let endX = fromRef.offsetLeft + GAP_INITIAL;
                let endY = fromRef.offsetTop + fromRef.offsetHeight;
                points.push([startX, startY]);
                points.push([startX - GAP_MARGIN + GAP_OFFSET, startY]);
                points.push([startX - GAP_MARGIN + GAP_OFFSET, endY + GAP_STATE / 2]);
                points.push([endX, endY + GAP_STATE / 2]);
                points.push([endX, endY]);
            }
            console.log(points);
            lineBlock.points = points;
        }
        const unsubscribe = [
            EventBus.subscribe("lr", "AutomatonStart", handleStart),
            EventBus.subscribe("lr", "AutomatonAppendStates", handleAppendStates),
        ];
        onUnmounted(() => { unsubscribe.forEach(fn => fn()); });

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
            stateItems.value.forEach((item) => {
                item.hidden = false;
            });
            lineBlocks.value.forEach((item) => {
                item.hidden = false;
            });
        }

        // 拖拽滚动功能
        const automatonPanel = ref<HTMLDivElement>();
        let mousedown = false;
        let startX = 0, startY = 0;
        let scrollTop = 0, scrollLeft = 0;
        onMounted(() => {
            automatonPanel.value!.addEventListener("mousedown", (ev) => {
                startX = ev.offsetX;
                startY = ev.offsetY;
                mousedown = true;
            });
            automatonPanel.value!.addEventListener("mouseup", () => {
                mousedown = false;
            });
            automatonPanel.value!.addEventListener("mousemove", (ev) => {
                if (mousedown) {
                    let offsetX = ev.offsetX - startX;
                    let offsetY = ev.offsetY - startY;
                    let limitX = automatonPanel.value!.scrollWidth - automatonPanel.value!.offsetWidth;
                    let limitY = automatonPanel.value!.scrollHeight - automatonPanel.value!.offsetHeight;
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
                    automatonPanel.value!.scrollTop = scrollTop;
                    automatonPanel.value!.scrollLeft = scrollLeft;
                    // console.log("SCROLL: ", scrollTop, scrollLeft)
                }
            });
        });

        return {
            stateItems, lineBlocks, automatonPanel,
            stateUpdate, test, stateRefs,
            GAP_ARROW, totalHeight, totalWidth,
            handleLineMouseEnter, handleLineMouseLeave,
        };
    }
});
</script>

<style scoped>
.automaton-panel {
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
}
.line-text-shift {
    /* transform: translateX(-100%); */
    text-anchor: end;
}
.hidden {
    opacity: 0.3;
}
</style>