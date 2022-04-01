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
        <div class="state-closure">
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
import { defineComponent, PropType, ref, h, onUnmounted } from "vue";
import { LRItem, LRItemSet } from "@/parsers/lr";
import EventBus from "@/utils/eventbus";
import LrItemComponent from "./lr-item.vue";
export default defineComponent({
    props: {
        state: { type: Object as PropType<LRItemSet>, required: true },
        // state: { type: Object, required: true },
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
        function handleClosureStep(items: Array<LRItem>) {
            currentItem.value++;
            calculating.value = true;
            uncalculated.value = false;
            items.forEach((item) => {
                closureExceptKernel.value.push(item);
            });
        }
        function handleMergeLookaheads(state: LRItemSet) {
            calculating.value = false;
            kernel.value = [...state.kernel];
            closureExceptKernel.value = [...state.closure].splice(0, kernel.value.length);
        }
        function handleClosure(itemSteps: Array<Array<LRItem>>) {
            itemSteps.forEach((items) => {
                handleClosureStep(items);
            });
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
        return { kernel, closureExceptKernel, currentItem, calculating, done, uncalculated };
    }
});


</script>
<style scoped>
.state-container {
    border: 2px var(--color-klein-blue) solid;
    width: fit-content;
    font-size: 12px;
}
.state-highlight {
    border-color: gold;
}
.state-uncalculated {
    opacity: 0.5;
    border-color: lightgray;
}
.state-id {
    font-weight: bold;
    font-style: italic;
    margin: 0 auto;
    width: fit-content;
    font-family: "Times New Roman";
}
.state-id-sub {
    font-style: normal;
}
.state-kernel {
    /* height: 100px; */
}
.state-closure {
    background-color: lightgray;
}
.lr-item {
    position: relative;
}
.closure-item {
    animation: 0.2s slidein;
}
.lr-item-calcualting::before {
    content: "→";
    position: absolute;
    left: -20px;
}

@keyframes slidein {
    from {
        opacity: 0;
        transform: translateX(50%);
    }
    to {
        transform: translateX(0);
    }
}
</style>