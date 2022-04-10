<template>
    <div
        class="state-container"
        :class="[calculating ? 'state-highlight' : '', uncalculated ? 'state-uncalculated' : '']"
    >
        <div class="state-id">
            <span>I</span>
            <sub class="state-id-sub">{{ state.id }}</sub>
        </div>
        <div class="state-kernel">
            <LrItemComponent
                v-for="(lrItem, index) in kernel"
                :class="(calculating && index === currentItem) ? 'lr-item-calcualting' : ''"
                class="lr-item"
                :lr-item="lrItem"
            ></LrItemComponent>
        </div>
        <div class="state-closure" :key="updateKey">
            <LrItemComponent
                v-for="(lrItem, index) in closureExceptKernel"
                :class="(calculating && index === (currentItem - kernel.length)) ? 'lr-item-calcualting' : ''"
                class="lr-item closure-item"
                :lr-item="lrItem"
            ></LrItemComponent>
        </div>
    </div>
</template>
<script lang="ts">
import { defineComponent, PropType, ref, onUnmounted } from "vue";
import { LRItem, LRItemSet } from "@/parsers/lr";
import EventBus from "@/utils/eventbus";
import LrItemComponent from "./lr-item.vue";
export default defineComponent({
    props: {
        state: { type: Object as PropType<LRItemSet>, required: true },
    },
    components: {
        LrItemComponent,
    },
    setup(props, ctx) {
        const kernel = ref<Array<LRItem>>([]);
        const closureExceptKernel = ref<Array<LRItem>>([]);
        const uncalculated = ref(true);
        const currentItem = ref(-1);
        const calculating = ref(false);
        const done = ref(false);
        props.state.kernel.forEach((item) => {
            kernel.value.push(item);
        });
        function handleClosureStep(items: Array<LRItem>, update: boolean = true) {
            currentItem.value++;
            calculating.value = true;
            uncalculated.value = false;
            items.forEach((item) => {
                closureExceptKernel.value.push(item);
            });
            if (items.length !== 0 && update) {
                ctx.emit("stateUpdate", props.state.id);
            }
        }
        const updateKey = ref(0); // 仅用来强制刷新组件
        function handleMergeLookaheads(state: LRItemSet) {
            calculating.value = false;
            kernel.value = [...state.kernel];
            closureExceptKernel.value = [...state.closure];
            closureExceptKernel.value.splice(0, kernel.value.length);
            updateKey.value++;
        }
        function handleClosure(itemSteps: Array<Array<LRItem>>) {
            itemSteps.forEach((items) => {
                handleClosureStep(items, false);
            });
            ctx.emit("stateUpdate", props.state.id);
        }
        function handleClosureDone() {
            calculating.value = false;
            done.value = true;
        }
        const unsubscribe = [
            EventBus.subscribe("lr", "State" + props.state.id + "ClosureStep", handleClosureStep),
            EventBus.subscribe("lr", "State" + props.state.id + "MergeLookaheads", handleMergeLookaheads),
            EventBus.subscribe("lr", "State" + props.state.id + "Closure", handleClosure),
            EventBus.subscribe("lr", "State" + props.state.id + "ClosureDone", handleClosureDone),
        ]
        onUnmounted(() => { unsubscribe.forEach(fn => fn()); });
        return { kernel, closureExceptKernel, currentItem, calculating, done, uncalculated, updateKey };
    }
});


</script>
<style scoped>
.state-container {
    border: 3px var(--color-klein-blue) solid;
    width: fit-content;
    /* background-color: rgba(255, 255, 255, 0.8); */
}
.state-highlight {
    border-color: gold;
}
.state-uncalculated {
    border-style: dashed;
}
.state-id {
    font-weight: bold;
    font-style: italic;
    text-align: center;
    width: 100%;
    font-family: "Times New Roman";
    background-color: rgba(255, 255, 255, 0.85);
}
.state-id-sub {
    font-style: normal;
}
.state-kernel {
    background-color: rgba(255, 255, 255, 0.85);
}
.state-closure {
    background-color: rgba(211, 211, 211, 0.85);
}
.lr-item {
    position: relative;
}
.closure-item {
    animation: 0.5s slide-in;
}
.lr-item-calcualting::before {
    content: "→";
    position: absolute;
    left: -20px;
}

@keyframes slide-in {
    from {
        opacity: 0;
        transform: translateX(50%);
    }
    to {
        transform: translateX(0);
    }
}
</style>