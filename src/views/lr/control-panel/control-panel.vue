<template>
    <div class="control-panel">
        <div>当前操作状态：<span>I{{ currentStateId }}</span></div>
        <GButton>计算闭包</GButton>
        <GButton>状态转换</GButton>
        <span>手动模式：</span>
        <GSwitch v-model="manual" @change="SwitchMode"></GSwitch>
    </div>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import { GButton, GSwitch } from "@/components";
import { useLrStore } from "@/stores";
import { getParser } from "../common";
import EventBus from "@/utils/eventbus";

// 手动模式
const manual = ref(false);
function SwitchMode() {
}

const lrStore = useLrStore();
const parser = getParser();
const currentStateId = computed(() => lrStore.currentStateId);
const algorithm = computed(() => lrStore.algorithm);
function Closure() {
    const state = parser.automaton.StateClosure(currentStateId.value, algorithm.value);
    if (algorithm.value === "LR1" || algorithm.value === "LR1_LALR1") {
        parser.automaton.MergeLookaheads(currentStateId.value);
    }
    EventBus.publish("lr", "State" + currentStateId.value + "Closure", state);
}
function AppendStates() {
    const res = parser.automaton.AppendStates(currentStateId.value);
    EventBus.publish("lr", "AutomatonAppendStates", res);
    if (!manual.value) {
        lrStore.SetCurrentStateId(currentStateId.value + 1);
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
}
</style>