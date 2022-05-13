<template>
    <div class="automaton-display-panel" ref="displayPanel">
        <div
            :style="{ position: 'relative', height: totalHeight + 'px', width: totalWidth + 'px',
            transform: 'scale(' + zoom + '%)', transformOrigin: '0px 0px' }"
        >
            <div
                v-for="item in stateItems"
                :key="item[0]"
                :ref="(el) => { stateRefs.set(item[1].state.id, el as HTMLDivElement); }"
                :style="{ position: 'absolute', top: item[1].top + 'px', left: item[1].left + 'px' }"
                :class="[item[1].hidden ? 'hidden' : '', item[1].merged ? 'merged' : '']"
                class="state-item-container"
                @mouseenter="handleStateMouseEnter(item[1])"
                @mouseleave="handleStateMouseLeave(item[1])"
                @click="handleStateClick(item[1])"
            >
                <StateItem :state="item[1].state" :state-item-data="item[1]" @updateState="updateState"></StateItem>
            </div>
            <svg style="position: absolute;top: 0;width: 100%; height: 100%;">
                <g
                    v-for="item in lineBlocks"
                    :key="item[0]"
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
                        :class="[
                            'state-goto-line',
                            item[1].highlight === 'normal' ? '' : 'state-goto-line-highlight-' + item[1].highlight
                        ]"
                    />
                </g>
            </svg>
        </div>
    </div>
    <div class="first-set-panel" v-if="algorithm !== 'LR0'">
        <div class="first-set-header">
            <span>{{ t('LR.Automaton.FirstSet') }}</span>
            <span class="first-set-table-btn" @click="changeShowFirstSetTable">{{showFirstSetTable ? "&gt;" : "&lt;"}}</span>
        </div>
        <div class="first-set-table" v-show="showFirstSetTable">
            <template v-for="firstSetPair in firstSetWithNullable">
                <div class="first-set-row-l non-terminal">{{ firstSetPair[0].name }}</div>
                <div class="first-set-row-r terminal">
                    <span class="first-set-symbol" v-for="sym in firstSetPair[1]">{{ sym.name }}</span>
                </div>
            </template>
        </div>
    </div>
    <div class="zoom-panel">
        <span @click="adjustZoom(10)"><i class="bi bi-zoom-in"></i></span>
        <span @click="adjustZoom(-10)"><i class="bi bi-zoom-out"></i></span>
        <span @click="adjustZoom()"><i class="bi bi-arrow-clockwise"></i></span>
    </div>
    <GLoading v-if="automatonLoading" :text="t('LR.Automaton.Calculating')"></GLoading>
</template>

<script lang="ts">
import { computed, defineComponent, nextTick, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useLrStore } from "@/stores";
import { MessageSchema } from "@/i18n";
import { GLoading } from "@/components";
import { GetParser, LRItemSet, AppendStateResult, _Symbol, MergeLr1StatesResult, ParseStepResult } from "@/parsers/lr";
import EventBus from "@/utils/eventbus";
import { StateItemData, LineBlockType, LineBlockData, ColumnData } from "./automaton";
import StateItem from "./state-item.vue";

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
        hidden: false, merged: false, highlight: "normal",
    };
}
function GenerateColumnData(stateIds? :Array<number>): ColumnData {
    return {
        stateIds: stateIds === undefined ? [] : stateIds,
        left: 0, height: GAP_MARGIN, width: GAP_MARGIN,
        linesPassByRight: [], linesPassByLeft: [], linesPassByBottom: []
    };
}
let lineBlockIdGenerator = -1;
function generateLineBlockData(symbol: _Symbol, from: number, to: number, type: LineBlockType): LineBlockData {
    ++lineBlockIdGenerator;
    return {
        id: lineBlockIdGenerator,
        symbol, from, to, type,
        points: [[0,0]], hidden: false, highlight: "normal",
    };
}
export default defineComponent({
    components: {
        StateItem,
        GLoading,
    },
    setup() {
        const { t } = useI18n<{ message: MessageSchema }>({ useScope: "global" });
        const lrStore = useLrStore();
        const parser = GetParser();
        const automatonLoading = computed(() => lrStore.automatonLoading);

        // stateId -> HTMLDivElement
        const stateRefs: Map<number, HTMLDivElement> = new Map();
        const totalHeight = ref(0);
        const totalWidth = ref(0);
        const stateItems = ref<Map<number, StateItemData>>(new Map());
        const lineBlocks = ref<Map<number, LineBlockData>>(new Map());
        const columns: Array<ColumnData> = [];
        function initStateFlag(stateId: number) {
            lrStore.stateFlags[stateId] = {
                active: false,
                closureDone: false,
                appended: false,
            };
        }
        function start() {
            const state = parser.automaton.states[0];
            stateItems.value.set(state.id, generateStateItemData(state, 0, 0, 0));
            columns.push(GenerateColumnData([state.id]));
            nextTick(() => {
                const stateRef = stateRefs.get(0)!;
                columns[0].width = stateRef.offsetWidth;
                columns[0].height = stateRef.offsetHeight;
            });
        }
        start();

        // state内部变化会影响该列下侧和右边列
        async function updateState(stateId: number, shift: boolean) {
            let columnIdx = stateItems.value.get(stateId)!.column;
            let column = columns[columnIdx];
            let row = 0;
            for (; row < column.stateIds.length; row++) {
                if (column.stateIds[row] === stateId) {
                    break;
                }
            }
            let stateRef = stateRefs.get(stateId)!;
            let stateBottom = stateRef.offsetTop + stateRef.offsetHeight
            for (row += 1; row < column.stateIds.length; row++) {
                let affectedStateRef = stateRefs.get(column.stateIds[row])!;
                let stateItemData = stateItems.value.get(column.stateIds[row])!;
                stateItemData.top = stateBottom + GAP_STATE;
                stateBottom += GAP_STATE + affectedStateRef.offsetHeight;
            }

            column.width = Math.max(column.width, stateRef.offsetWidth);
            column.height = stateBottom;
            totalHeight.value = Math.max(totalHeight.value, column.height + GAP_MARGIN +
                GAP_LINE * column.linesPassByBottom.length);
            totalWidth.value = Math.max(totalWidth.value, column.left + column.width + GAP_MARGIN +
                GAP_LINE * column.linesPassByRight.length);
            if (shift) {
                await ShiftColumns(columnIdx + 1);
            }
        }

        async function handleAppendStates(res: AppendStateResult) {
            lrStore.stateFlags[res.from].appended = true;
            let currentColumnIdx = stateItems.value.get(res.from)!.column;
            let currentColumn = columns[currentColumnIdx];
            let nextColumnIdx = currentColumnIdx + 1;
            let nextColumn: ColumnData = columns[nextColumnIdx];
            if (nextColumn === undefined) {
                nextColumn = GenerateColumnData();
                columns.push(nextColumn);
            }
            let toLeft: Array<{ symbol: _Symbol, state: LRItemSet }> = [];
            let toRight: Array<{ symbol: _Symbol, state: LRItemSet }> = [];
            let toThisColumn: Array<{ symbol: _Symbol, state: LRItemSet }> = [];
            let toSelf: Array<{ symbol: _Symbol, state: LRItemSet }> = [];

            let minTargetColumnIdx = nextColumnIdx;
            res.targets.forEach((target) => {
                if (stateItems.value.has(target.state.id)) {
                    // 指向已有的State
                    let targetColumnIdx = stateItems.value.get(target.state.id)!.column;
                    minTargetColumnIdx = Math.min(minTargetColumnIdx, targetColumnIdx);
                    if (targetColumnIdx < currentColumnIdx) {
                        toLeft.push(target);
                    } else if (targetColumnIdx > currentColumnIdx) {
                        toRight.push(target);
                    } else {
                        if (target.state.id === res.from) {
                            toSelf.push(target)
                        } else {
                            toThisColumn.push(target);
                        }
                    }
                } else {
                    // 指向新的State
                    initStateFlag(target.state.id);
                    stateItems.value.set(target.state.id, generateStateItemData(target.state, 0, 0, nextColumnIdx));
                    nextColumn.stateIds.push(target.state.id);
                    toRight.push(target);
                }
            });

            // 1. 生成线条的数据，但是先不绘制线条。
            // 1.1 指向右侧列的线条（TODO，向右但是不是紧按着的列怎么弄？似乎和向左的线条类似）
            let tempIds: Array<number> = [];
            for (let i = 0; i < toRight.length; i++) {
                let lineBlock = generateLineBlockData(toRight[i].symbol, res.from, toRight[i].state.id, "Right");
                lineBlocks.value.set(lineBlock.id, lineBlock);
                stateItems.value.get(lineBlock.from)!.linesToRight.push(lineBlock.id);
                stateItems.value.get(lineBlock.to)!.linesIn.push(lineBlock.id);
                tempIds.push(lineBlock.id);
            }
            currentColumn.linesPassByRight.push(...tempIds.reverse());
            // 1.2 指向左侧列的线条
            for (let i = 0; i < toLeft.length; i++) {
                let lineBlock = generateLineBlockData(toLeft[i].symbol, res.from, toLeft[i].state.id, "Left");
                lineBlocks.value.set(lineBlock.id, lineBlock);
                let from = stateItems.value.get(lineBlock.from)!;
                let to = stateItems.value.get(lineBlock.to)!;
                from.linesToLeft.push(lineBlock.id);
                to.linesIn.push(lineBlock.id);
                currentColumn.linesPassByRight.push(lineBlock.id);
                for (let i = from.column; i >= to.column; i--) {
                    columns[i].linesPassByBottom.push(lineBlock.id);
                }
                columns[to.column].linesPassByLeft.push(lineBlock.id);
            }
            // 1.3 指向本列的线条
            tempIds = [];
            for (let i = 0; i < toThisColumn.length; i++) {
                let lineBlock = generateLineBlockData(toThisColumn[i].symbol, res.from, toThisColumn[i].state.id, "SameColumn");
                lineBlocks.value.set(lineBlock.id, lineBlock);
                stateItems.value.get(lineBlock.from)!.linesToSameColumn.push(lineBlock.id);
                stateItems.value.get(lineBlock.to)!.linesIn.push(lineBlock.id);
                tempIds.push(lineBlock.id);
            }
            currentColumn.linesPassByLeft.push(...tempIds.reverse());
            // 1.4 指向自己
            if (toSelf.length !== 0) {
                let lineBlock = generateLineBlockData(toSelf[0].symbol, res.from, res.from, "Self");
                lineBlocks.value.set(lineBlock.id, lineBlock);
                stateItems.value.get(lineBlock.from)!.linesToSelf.push(lineBlock.id);
            }

            // 2. 放置新添加的State的位置
            let gapOfColumns = GAP_MARGIN * 2 + GAP_LINE *
                Math.max(currentColumn.linesPassByRight.length, nextColumn.linesPassByLeft.length);
            let bottom = -GAP_STATE;
            nextColumn.left = currentColumn.left + currentColumn.width + gapOfColumns;
            for (let i = 0; i < nextColumn.stateIds.length; i++) {
                let stateId = nextColumn.stateIds[i];
                let stateItemData = stateItems.value.get(stateId)!;
                stateItemData.left = nextColumn.left;
                stateItemData.top = bottom + GAP_STATE;
                await nextTick();
                let stateRef = stateRefs.get(stateId)!;
                bottom = stateRef.offsetTop + stateRef.offsetHeight;
                nextColumn.width = Math.max(nextColumn.width, stateRef.offsetWidth);
            }
            totalHeight.value = Math.max(totalHeight.value, bottom);
            totalWidth.value = Math.max(totalWidth.value, nextColumn.left + nextColumn.width);
            nextColumn.height = bottom;
            // 3. 从受影响的最初一列到最后一列，右移并重绘
            await ShiftColumns(minTargetColumnIdx);
        }

        async function ShiftColumns(fromColumnIdx: number) {
            for (let i = fromColumnIdx; i < columns.length; i++) {
                // 这里可以断言minTargetColumnIdx一定不会小于1，因为下标为0的列仅包含一个初始state，不会有其它state指向它。
                let gapOfColumns = GAP_MARGIN * 2 + GAP_LINE *
                    Math.max(columns[i - 1].linesPassByRight.length, columns[i].linesPassByLeft.length);
                let newLeft = columns[i - 1].left + columns[i - 1].width + gapOfColumns;
                let shift = newLeft - columns[i].left;
                if (shift === 0) {
                    continue;
                }
                columns[i].left += shift;
                columns[i].stateIds.forEach((stateId) => {
                    stateItems.value.get(stateId)!.left = newLeft;
                });
            }
            await nextTick();
            const lastColumn = columns[columns.length - 1];
            totalWidth.value = Math.max(totalWidth.value,
                lastColumn.left + lastColumn.width + GAP_MARGIN + GAP_LINE * lastColumn.linesPassByRight.length);

            // 重新画线
            const promises: Array<any> = [];
            lineBlocks.value.forEach((_, id) => promises.push(drawLine(id)));
            return Promise.all(promises);
        }

        // 画线
        async function drawLine(lineBlockId: number) {
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
                let right = columns[from.column].left + columns[from.column].width + GAP_MARGIN + GAP_LINE * columns[from.column].linesPassByRight.indexOf(lineBlockId);
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
                let right = columns[from.column].left + columns[from.column].width + GAP_MARGIN + GAP_LINE * columns[from.column].linesPassByRight.indexOf(lineBlockId);
                let left = endX - GAP_MARGIN - GAP_OFFSET - GAP_LINE * columns[to.column].linesPassByLeft.indexOf(lineBlockId);
                let bottom = 0;
                for (let i = from.column; i >= to.column; i--) {
                    bottom = Math.max(bottom, columns[i].height + GAP_MARGIN + GAP_LINE * columns[i].linesPassByBottom.indexOf(lineBlockId));
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
            return nextTick();
        }

        function deleteLine(lineBlockId: number) {
            const lineBlock = lineBlocks.value.get(lineBlockId)!;
            const from = stateItems.value.get(lineBlock.from)!;
            const to = stateItems.value.get(lineBlock.to)!;
            const fromColumn = columns[from.column];
            const toColumn = columns[to.column];
            if (lineBlock.type === "Left") {
                fromColumn.linesPassByRight.splice(fromColumn.linesPassByRight.indexOf(lineBlockId), 1);
                toColumn.linesPassByLeft.splice(toColumn.linesPassByLeft.indexOf(lineBlockId), 1);
                for (let i = to.column; i <= from.column; i++) {
                    const c = columns[i];
                    c.linesPassByBottom.splice(c.linesPassByBottom.indexOf(lineBlockId), 1);
                }
                from.linesToLeft.splice(from.linesToLeft.indexOf(lineBlockId), 1);
                to.linesIn.splice(to.linesIn.indexOf(lineBlockId), 1);
            } else if (lineBlock.type === "Right") {
                fromColumn.linesPassByRight.splice(fromColumn.linesPassByRight.indexOf(lineBlockId), 1);
                from.linesToRight.splice(from.linesToRight.indexOf(lineBlockId), 1);
                to.linesIn.splice(to.linesIn.indexOf(lineBlockId), 1);
            } else if (lineBlock.type === "SameColumn") {
                fromColumn.linesPassByLeft.splice(fromColumn.linesPassByLeft.indexOf(lineBlockId), 1);
                from.linesToSameColumn.splice(from.linesToSameColumn.indexOf(lineBlockId), 1);
                to.linesIn.splice(to.linesIn.indexOf(lineBlockId), 1);
            } else {
                from.linesToSelf.splice(from.linesToSelf.indexOf(lineBlockId), 1);
            }
            lineBlocks.value.delete(lineBlockId);
        }

        async function handleMergeLr1States(res: MergeLr1StatesResult) {
            res.mergeMap.forEach((target, from) => {
                // from被合并到target
                const fromItem =  stateItems.value.get(from)!;
                const deleteFunc = function(lineArr: Array<number>) {
                    while (lineArr.length > 0) {
                        deleteLine(lineArr[lineArr.length - 1]);
                    }
                }
                // 大坑！不能在forEach循环里面进行删除操作！会导致跳过！
                deleteFunc(fromItem.linesIn);
                deleteFunc(fromItem.linesToLeft);
                deleteFunc(fromItem.linesToRight);
                deleteFunc(fromItem.linesToSameColumn);
                deleteFunc(fromItem.linesToSelf);
                fromItem.merged = true;
            });
            res.transitionChanges.forEach((changeList, stateId) => {
                changeList.forEach((change) => {
                    let from = stateItems.value.get(stateId)!;
                    let to = stateItems.value.get(change.to)!;
                    const lineBlock = generateLineBlockData(change.symbol, stateId, change.to,
                        from.column === to.column ? "SameColumn" : (from.column < to.column ? "Right" : "Left")
                    );
                    lineBlocks.value.set(lineBlock.id, lineBlock);
                    if (lineBlock.type === "Left") {
                        from.linesToLeft.push(lineBlock.id);
                        to.linesIn.push(lineBlock.id);
                        columns[from.column].linesPassByRight.push(lineBlock.id);
                        columns[to.column].linesPassByLeft.push(lineBlock.id);
                        for (let i = to.column; i <= from.column; i++) {
                            columns[i].linesPassByBottom.push(lineBlock.id);
                        }
                    } else if (lineBlock.type === "Right") {
                        from.linesToRight.push(lineBlock.id);
                        to.linesIn.push(lineBlock.id);
                        columns[from.column].linesPassByRight.push(lineBlock.id);
                    } else {
                        from.linesToSameColumn.push(lineBlock.id);
                        to.linesIn.push(lineBlock.id);
                        columns[from.column].linesPassByLeft.push(lineBlock.id);
                    }
                    // 这里不drawLine也无所谓，最终ShiftColumns时都会重画所有线
                });
            });
            const promises: Array<any> = [];
            res.mergeMap.forEach((target, from) => {
                promises.push(EventBus.publish("lr", "State" + target + "MergeLr1", from));
            });
            await Promise.all(promises);
            await ShiftColumns(1);
        }

        const colorfulStates: Array<number> = [];
        const colorfulLines: Array<number> = [];
        function handleStatesPath(data: ParseStepResult) {
            colorfulStates.forEach((stateId) => {
                const stateItem = stateItems.value.get(stateId)!;
                stateItem.highlight = "normal";
            });
            colorfulLines.forEach((lineId) => {
                const lineBlock = lineBlocks.value.get(lineId)!;
                lineBlock.highlight = "normal";
            });
            colorfulStates.splice(0);
            colorfulLines.splice(0);

            if (data.action.name === "Shift" || data.action.name === "Goto") {
                const fromStateItem = stateItems.value.get(data.actionSource.stateId)!;
                fromStateItem.highlight = "green";
                const currStateItem = stateItems.value.get(data.currentStateId)!;
                currStateItem.highlight = "gold";
                colorfulStates.push(data.actionSource.stateId, data.currentStateId);
                for (let i = 0; i < currStateItem.linesIn.length; i++) {
                    const lineBlock = lineBlocks.value.get(currStateItem.linesIn[i])!;
                    if (lineBlock.from === data.actionSource.stateId) {
                        lineBlock.highlight = "green";
                        colorfulLines.push(currStateItem.linesIn[i]);
                        break;
                    }
                }
            } else if (data.action.name === "Reduce") {
                const currStateItem = stateItems.value.get(data.currentStateId)!;
                currStateItem.highlight = "gold";
                colorfulStates.push(data.currentStateId);
                for (let i = data.stateStackDiff.length - 1; i >= 0; i--) {
                    const sid = data.stateStackDiff[i];
                    const stateItem = stateItems.value.get(sid)!;
                    if (i > 0) {
                        for (let j = 0; j < stateItem.linesIn.length; j++) {
                            const lineBlock = lineBlocks.value.get(stateItem.linesIn[j])!;
                            if (lineBlock.from === data.stateStackDiff[i - 1]) {
                                lineBlock.highlight = "brown";
                                colorfulLines.push(stateItem.linesIn[j]);
                                break;
                            }
                        }
                    } else {
                        for (let j = 0; j < stateItem.linesIn.length; j++) {
                            const lineblock = lineBlocks.value.get(stateItem.linesIn[j])!;
                            if (lineblock.from === data.currentStateId) {
                                lineblock.highlight = "brown";
                                colorfulLines.push(stateItem.linesIn[j]);
                            }
                        }
                    }
                    stateItem.highlight = "brown";
                    colorfulStates.push(sid);
                }
            } else {
                const currStateItem = stateItems.value.get(data.currentStateId)!;
                currStateItem.highlight = "gold";
                colorfulStates.push(data.currentStateId);
            }
        }

        const unsubscribe = [
            EventBus.subscribe("lr", "AutomatonAppendStates", handleAppendStates),
            EventBus.subscribe("lr", "AutomatonMergeLr1States", handleMergeLr1States),
            EventBus.subscribe("lr", "AutomatonStatesPath", handleStatesPath),
        ];
        onUnmounted(() => { unsubscribe.forEach(fn => fn()); });

        function handleStateMouseEnter(stateItem: StateItemData) {
            if (stateItem.merged) {
                return;
            }
            stateItems.value.forEach(item => item.hidden = true);
            lineBlocks.value.forEach(item => item.hidden = true);
            stateItem.hidden = false;
            const showStateFunc = function(lines: Array<number>) {
                lines.forEach((line) => {
                    let lineBlock = lineBlocks.value.get(line)!;
                    lineBlock.hidden = false;
                    let to = stateItems.value.get(lineBlock.to)!;
                    to.hidden = false;
                });
            }
            showStateFunc(stateItem.linesToLeft);
            showStateFunc(stateItem.linesToRight);
            showStateFunc(stateItem.linesToSameColumn);
            showStateFunc(stateItem.linesToSelf);
        }
        function handleStateMouseLeave(stateItem: StateItemData) {
            if (stateItem.merged) {
                return;
            }
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
        function handleStateClick(stateItem: StateItemData): void {
            if (!lrStore.manual || stateItem.merged) {
                return;
            }
            Object.entries(lrStore.stateFlags).forEach(entry => {
                if (Number.parseInt(entry[0]) === stateItem.state.id) {
                    entry[1].active = true;
                } else {
                    entry[1].active = false;
                }
            });
            lrStore.currentStateId = stateItem.state.id;
        }

        // 拖拽滚动功能
        const displayPanel = ref<HTMLDivElement>();
        let mousedown = false;
        let startX = 0, startY = 0;
        let scrollTop = 0, scrollLeft = 0;
        function handleMouseDown(ev: MouseEvent) {
            startX = ev.pageX;
            startY = ev.pageY;
            scrollLeft = displayPanel.value!.scrollLeft;
            scrollTop = displayPanel.value!.scrollTop;
            mousedown = true;
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
        }
        function handleMouseMove(ev: MouseEvent) {
            if (mousedown) {
                let offsetX = ev.pageX - startX;
                let offsetY = ev.pageY - startY;
                displayPanel.value!.scrollLeft = scrollLeft - offsetX;
                displayPanel.value!.scrollTop = scrollTop - offsetY;
            }
        }
        function handleMouseUp() {
            mousedown = false;
            scrollLeft = displayPanel.value!.scrollLeft;
            scrollTop = displayPanel.value!.scrollTop;
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        }
        onMounted(() => {
            displayPanel.value!.addEventListener("mousedown", handleMouseDown);
        });

        const showFirstSetTable = ref(true);
        function changeShowFirstSetTable() {
            showFirstSetTable.value = !showFirstSetTable.value;
        }
        const firstSetWithNullable: Map<_Symbol, Array<_Symbol>> = new Map();
        function initFirstSet() {
            const {firstSet, nullable, SYMBOL_EPSILON: epsilon} = parser.getFirstSet();
            firstSet.forEach((set, sym) => {
                if (sym.isTerm) return; // continue for-each loop
                const firstArr = Array.from(set);
                if (nullable.has(sym)) {
                    firstArr.push(epsilon);
                }
                firstSetWithNullable.set(sym, firstArr);
            });
        }
        if (lrStore.algorithm !== "LR0") {
            initFirstSet();
        }

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

        return {
            t,
            automatonLoading,
            stateItems, lineBlocks, displayPanel,
            updateState, stateRefs,
            GAP_ARROW, totalHeight, totalWidth,
            handleStateMouseEnter, handleStateMouseLeave,
            handleLineMouseEnter, handleLineMouseLeave,
            handleStateClick,
            algorithm: lrStore.algorithm,
            showFirstSetTable,
            changeShowFirstSetTable,
            firstSetWithNullable,
            zoom, adjustZoom
        };
    }
});
</script>

<style scoped>
.automaton-display-panel {
    overflow: auto;
    width: 100%;
    height: 100%;
    user-select: none;
    position: relative;
    font-size: 12px;
    padding: 32px 50% 300px 32px;
}
.state-item-container {
    animation: 0.5s fade-in;
    z-index: 3;
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
    stroke: rgb(89, 118, 186);
    stroke-width: 2;
    stroke-linejoin: round;
    fill: none;
    animation: 0.5s line-move;
    z-index: 1;
}
@keyframes line-move {
    from {
        stroke-dasharray: 0, 100;
    }
    to {
        stroke-dasharray: 100, 0;
    }
}

.state-goto-line-highlight-green {
    stroke: rgb(33, 166, 117);
}

.state-goto-line-highlight-brown {
    stroke: rgb(202, 105, 36);
}

.line-text {
    transform: translateY(-3px);
    font-weight: bold;
    z-index: 2;
}
.line-text-shift {
    text-anchor: end;
}
.hidden {
    opacity: 0.3;
}

.merged {
    opacity: 0.3;
}

.first-set-panel {
    position: absolute;
    top: 30px;
    right: 30px;
    max-width: 400px;
    font-weight: bold;    
    border: 2px solid black;
    padding: 10px;
    background-color: aliceblue;
    z-index: 5;
}

.first-set-header {
    width: fit-content;
}

.first-set-table-btn {
    cursor: pointer;
    margin-left: 4px;
    color: red;
}

/* 固定第一列表头的样式写的很不优雅，但水平有限凑合用吧 */
.first-set-table {
    display: grid;
    grid-template-columns: auto auto;
    max-width: 300px;
    max-height: 200px;
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

.zoom-panel {
    position: absolute;
    top: 10px;
    left: 10px;
    font-size: 16px;
}

.zoom-panel * {
    margin-right: 4px;
    cursor: pointer;
}

.automaton-loading-mask {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(255, 255, 255, 0.8);
    z-index: 30;
}

.loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}

.loading-svg {
    width: 44px;
    height: 44px;
    animation: loading-rotate 2s linear infinite;
}

.loading-circle {
    stroke: var(--color-klein-blue);
    stroke-width: 2;
    fill: none;
    animation: loading-dash 1.5s ease-in-out infinite;
}

@keyframes loading-rotate {
    0% {
        transform: rotate(0);
    }

    100% {
        transform: rotate(360deg);
    }
}

@keyframes loading-dash {
    0% {
        stroke-dasharray: 1, 200;
        stroke-dashoffset: 0;
    }

    50% {
        stroke-dasharray: 90, 150;
        stroke-dashoffset: -40px;
    }

    100% {
        stroke-dasharray: 90, 150;
        stroke-dashoffset: -120px;
    }
}
</style>