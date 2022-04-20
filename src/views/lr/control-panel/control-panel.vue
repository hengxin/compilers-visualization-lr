<template>
    <div class="control-panel">
        <template v-if="automatonStatus === AutomatonStatus.Calculate">
        <!-- 自动机控制面板 -->
            <div>当前操作状态：<span>I{{ currentStateId }}</span></div>
            <GButton v-show="showCalcClosureButton" @click="CalcClosure()">计算闭包</GButton>
            <GButton v-show="showAppendStatesButton" @click="AppendStates()">状态转换</GButton>
            <span>手动模式：</span>
            <GSwitch :model-value="manual" @change="SwitchMode" :disabled="manual"></GSwitch>
        </template>
        <template v-if="automatonStatus === AutomatonStatus.Merge">
            <GButton @click="MergeLr1States()">合并相同核心的LR1项</GButton>
        </template>
        <template v-if="automatonStatus === AutomatonStatus.Done">
            <GButton v-show="showCalcParseTableButton" @click="CalcParseTable()">计算语法分析表</GButton>
        </template>
    </div>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import { GButton, GSwitch } from "@/components";
import { useLrStore } from "@/stores";
import { GetParser } from "@/parsers/lr";
import EventBus from "@/utils/eventbus";

const lrStore = useLrStore();

// 手动模式
const manual = computed(() => lrStore.manual);
function SwitchMode() {
    lrStore.manual = !lrStore.manual;
}

const parser = GetParser();
const currentStateId = computed(() => lrStore.currentStateId);
const algorithm = computed(() => lrStore.algorithm);

enum AutomatonStatus {
    Calculate, Merge, Done
}
const automatonStatus = ref(AutomatonStatus.Calculate);
const showCalcClosureButton = computed(() => 
    manual.value || (!lrStore.stateFlags[currentStateId.value].closureDone && automatonStatus.value === AutomatonStatus.Calculate));
const showAppendStatesButton = computed(() => {
    const flags = lrStore.stateFlags[currentStateId.value];
    return manual.value || (flags.closureDone && !flags.appended && automatonStatus.value === AutomatonStatus.Calculate);
});
// const showMergeLr1StatesButton = computed(() => algorithm.value === "LR1_LALR1" && (manual.value || automatonStatus.value === AutomatonStatus.Merge));
const showCalcParseTableButton = computed(() => !manual.value && automatonStatus.value === AutomatonStatus.Done);

function CalcClosure() {
    const state = parser.automaton.CalcStateClosure(currentStateId.value, algorithm.value);
    if (algorithm.value === "LR1" || algorithm.value === "LR1_LALR1") {
        parser.automaton.MergeLookaheads(currentStateId.value);
    }
    lrStore.stateFlags[currentStateId.value].closureDone = true;
    EventBus.publish("lr", "State" + currentStateId.value + "Closure", state);
}

function AppendStates() {
    const res = parser.automaton.AppendStates(currentStateId.value);
    EventBus.publish("lr", "AutomatonAppendStates", res);
    if (!manual.value) {
        lrStore.stateFlags[currentStateId.value].active = false;
        const finded: boolean = FindNextState();
        if (finded) {
            lrStore.stateFlags[currentStateId.value].active = true;
        }
        else {
            if (algorithm.value === "LR0" || algorithm.value === "LR1") {
                automatonStatus.value = AutomatonStatus.Done;
            } else {
                automatonStatus.value = AutomatonStatus.Merge;
            }
        }
    }
}

// 仅在自动模式下使用
function FindNextState(): boolean {
    let stateId = currentStateId.value + 1;
    while (true) {
        if (stateId >= parser.automaton.states.length) {
            return false;
        }
        let state = parser.automaton.states[stateId];
        if (state === undefined) {
            ++stateId;
            continue;
        }
        if (!(state.closureDone && state.appended)) {
            break;
        }
        stateId++;
    }
    lrStore.currentStateId = stateId;
    return true;
}

function MergeLr1States() {
    const res = parser.automaton.mergeLr1();
    EventBus.publish("lr", "AutomatonMergeLr1States", res);
    automatonStatus.value = AutomatonStatus.Done;
}

function CalcParseTable() {
    parser.parseTable.calc();
    lrStore.showParseTable = true;
}

</script>
<style scoped>
.control-panel {
    display: flex;
    flex-direction: row;
    position: sticky;
    top: 10px;
    align-items: center;
    background-color: white;
    border: 2px var(--color-klein-blue) solid;
    padding: 8px;
    z-index: 10;
}
</style>