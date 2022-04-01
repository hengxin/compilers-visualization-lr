<template>
    <div class="automaton-panel" ref="automatonPanel">
        <StateItem
            v-for="data in stateItemDataList"
            :state="data.state"
            :style="{ position: 'absolute', top: data.top + 'px', left: data.left + 'px' }"
        ></StateItem>
    </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref } from "vue";
import EventBus from "@/utils/eventbus";
import StateItem from "./state-item.vue";
import { LRItemSet, BfsStepResult } from "@/parsers/lr";
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
}
interface ColumnData {
    stateIds: Array<number>,
    extraBottom: number,
    extraLeft: number,
    extraRight: number,
}
const GAP_HORIZONTAL_START = 16;
const GAP_HORIZONTAL_END = 4;
const GAP_HORIZONTAL_INITIAL = 16;
const GAP_VERTICAL = 4;
const GAP_MARGIN = 32;
function generateStateItemData(state: LRItemSet, top: number, left: number, column: number, row: number,
    edgeInTop?: number, edgeOutTop?: number, edgeOutBottom?: number): StateItemData {
    return {
        state, top, left, column, row,
        edgeInTop: edgeInTop ? edgeInTop : 0,
        edgeOutTop: edgeOutTop ? edgeOutTop : 0,
        edgeOutBottom: edgeOutBottom ? edgeOutBottom : 0
    };
}
export default defineComponent({
    components: {
        StateItem,
    },
    setup() {
        const stateItemDataList = ref<Array<StateItemData>>([]);
        const columns: Array<ColumnData> = [];
        // stateId -> columnIndex
        const stateIdToColumnMap: Map<number, number> = new Map();
        const stateIdToIndexMap: Map<number, number> = new Map();

        function handleStart(state: LRItemSet) {
            stateItemDataList.value.push(generateStateItemData(state, 16, 16, 0, 0));
            stateIdToIndexMap.set(state.id, 0);
            stateIdToColumnMap.set(state.id, 0);
            columns.push({
                stateIds: [state.id],
                extraBottom: GAP_MARGIN,
                extraLeft: GAP_MARGIN,
                extraRight: GAP_MARGIN,
            });
        }
        function handleAppendStates(res: BfsStepResult) {
            let row = 0;
            res.targets.forEach((target) => {
                if (!stateItemDataList.value.some((data) => data.state.id === target.state.id)) {
                    row++;
                }
            });
            let gap = GAP_MARGIN * 2 + GAP_VERTICAL * (row - 1);
            let i = 0;
            res.targets.forEach((target) => {
                if (!stateItemDataList.value.some((data) => data.state.id === target.state.id)) {
                    stateItemDataList.value.push(generateStateItemData(target.state, i* 100, gap + 200, columns.length, row));
                    i++;
                }
            });

            // 画线

        }
        const unsubscribe = [
            EventBus.subscribe("lr", "AutomatonStart", handleStart),
            EventBus.subscribe("lr", "AutomatonAppendStates", handleAppendStates),
        ];
        onUnmounted(() => { unsubscribe.forEach(fn => fn()); });

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
                    console.log("SCROLL: ", scrollTop, scrollLeft)
                }
            });
        });

        return { stateItemDataList, automatonPanel };
    }
});
</script>

<style scoped>
.automaton-panel {
    overflow: auto;
    width: 600px;
    height: 600px;
    border: 4px black solid;
    user-select: none;
    position: relative;
}
</style>