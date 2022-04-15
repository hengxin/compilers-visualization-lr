<template>
    <div class="control-panel">
        <!-- 自动机控制面板 -->
            <div>当前操作状态：<span>I{{ currentStateId }}</span></div>
            <GButton v-show="manual || showCalcClosureButton" @click="CalcClosure()">计算闭包</GButton>
            <GButton v-show="manual || showAppendStatesButton" @click="AppendStates()">状态转换</GButton>
            <span>手动模式：</span>
            <GSwitch :model-value="manual" @change="SwitchMode" :disabled="manual"></GSwitch>
        <template>
        </template>
    </div>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import { GButton, GSwitch } from "@/components";
import { useLrStore } from "@/stores";
import { getParser } from "../common";
import EventBus from "@/utils/eventbus";

const lrStore = useLrStore();

// 手动模式
const manual = computed(() => lrStore.manual);
function SwitchMode() {
    lrStore.manual = !lrStore.manual;
}

const parser = getParser();
const currentStateId = computed(() => lrStore.currentStateId);
const algorithm = computed(() => lrStore.algorithm);

const showCalcClosureButton = computed(() => !lrStore.stateFlags[currentStateId.value].closureDone);
const showAppendStatesButton = computed(() => {
    const flags = lrStore.stateFlags[currentStateId.value];
    return flags.closureDone && !flags.appended;
});

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
        lrStore.currentStateId = currentStateId.value + 1;
        lrStore.stateFlags[currentStateId.value].active = true;
    }
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
    z-index: 1000;
}
</style>