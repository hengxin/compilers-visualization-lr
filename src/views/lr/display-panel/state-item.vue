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
        function handleMergeLookaheads(state: LRItemSet) {
            calculating.value = false;
            console.log(state.kernel)
            console.log(state.closure)
            kernel.value = [...state.kernel];
            console.log([...state.closure])
            console.log(kernel.value.length);
            closureExceptKernel.value = [...state.closure];
            closureExceptKernel.value.splice(0, kernel.value.length)
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
        return { kernel, closureExceptKernel, currentItem, calculating, done, uncalculated };
    }
});


</script>
<style scoped>
.state-container {
    border: 3px var(--color-klein-blue) solid;
    width: fit-content;
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