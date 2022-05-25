<template>
    <div
        class="state-container"
        :class="[
            active ? 'state-active' : '',
            done ? 'state-done' : '',
            stateItemData.highlight === 'normal' ? '' : 'state-highlight-' + stateItemData.highlight,
        ]"
        ref="stateContainerRef"
    >
        <div class="state-id">
            <span class="non-terminal">I</span>
            <sub class="terminal">{{ state.id }}</sub>
            <template v-if="mergeFromList.length !== 0">
                <span>&nbsp;(</span>
                <template v-for="(id, index) in mergeFromList">
                    <span class="non-terminal">I</span>
                    <sub class="terminal">{{id}}</sub>
                    <span v-if="index !== mergeFromList.length - 1">,</span>
                </template>
                <span>)</span>
            </template>
        </div>
        <div class="state-kernel" :key="updateStateKey">
            <LrItemComponent
                v-for="(lrItem, index) in kernel"
                :class="(!done && index === currentItem) ? 'lr-item-calcualting' : ''"
                class="lr-item"
                :lr-item="lrItem"
            ></LrItemComponent>
        </div>
        <div class="state-closure" :key="updateClosureKey + updateStateKey">
            <LrItemComponent
                v-for="(lrItem, index) in closureExceptKernel"
                :class="(!done && index === (currentItem - kernel.length)) ? 'lr-item-calcualting' : ''"
                class="lr-item"
                :lr-item="lrItem"
            ></LrItemComponent>
        </div>
        <div class="state-accept" v-if="state.end">
            <svg class="accept-svg" width="10" height="15">
                <polyline class="accept-arrow" points="5,0 5,12 0,7 5,12 10,7"></polyline>
            </svg>
            <div class="terminal" style="line-height: 12px;">accept</div>
        </div>
    </div>
</template>
<script lang="ts">
import { computed, defineComponent, PropType, ref, onUnmounted, nextTick } from "vue";
import { useLrStore } from "@/stores";
import { LRItem, LRItemSet } from "@/parsers/lr";
import EventBus from "@/utils/eventbus";
import { StateItemData } from "./automaton";
import LrItemComponent from "./lr-item.vue";
export default defineComponent({
    props: {
        state: { type: Object as PropType<LRItemSet>, required: true },
        stateItemData: { type: Object as PropType<StateItemData>, required: true },
    },
    emits: ["updateState"],
    components: {
        LrItemComponent,
    },
    setup(props, ctx) {
        const lrStore = useLrStore();
        lrStore.stateFlags[props.state.id].closureDone = props.state.closureDone;
        lrStore.stateFlags[props.state.id].appended = props.state.appended;
        const stateContainerRef = ref<HTMLDivElement>();
        const kernel = ref<Array<LRItem>>([]);
        const closureExceptKernel = ref<Array<LRItem>>([]);
        const active = computed(() => lrStore.stateFlags[props.state.id].active);
        const done = computed(() => lrStore.stateFlags[props.state.id].appended);
        const currentItem = ref(-1);
        props.state.kernel.forEach((item) => {
            kernel.value.push(item);
        });

        const updateClosureKey = ref(0); // 仅用来强制刷新组件
        function handleMergeLookaheads(state: LRItemSet) {
            // calculating.value = false;
            kernel.value = [...state.kernel];
            closureExceptKernel.value = [...state.closure];
            closureExceptKernel.value.splice(0, kernel.value.length);
            updateClosureKey.value++;
        }
        function handleClosure(state: LRItemSet) {
            kernel.value = [...state.kernel];
            closureExceptKernel.value = [...state.closure];
            closureExceptKernel.value.splice(0, kernel.value.length);
            nextTick(() => {
                ctx.emit("updateState", props.state.id, true);
            });
        }
        const updateStateKey = ref(0);
        const mergeFromList = ref<Array<number>>([]);
        async function handleMergeLr1(from: number) {
            mergeFromList.value.push(from);
            updateStateKey.value++;
            stateContainerRef.value?.classList.add("state-merged");
            await nextTick();
            ctx.emit("updateState", props.state.id, false);
        }
        const unsubscribe = [
            EventBus.subscribe("lr", "State" + props.state.id + "MergeLookaheads", handleMergeLookaheads),
            EventBus.subscribe("lr", "State" + props.state.id + "Closure", handleClosure),
            EventBus.subscribe("lr", "State" + props.state.id + "MergeLr1", handleMergeLr1),
        ]
        onUnmounted(() => { unsubscribe.forEach(fn => fn()); });
        return {
            stateContainerRef,
            kernel, closureExceptKernel, currentItem,
            active, done,
            updateClosureKey, updateStateKey,
            mergeFromList,
        };
    }
});


</script>
<style scoped>
.state-container {
    position: relative;
    border: 3px dashed rgb(89, 118, 186);
    width: fit-content;
}

.state-highlight-gold {
    border-color: #fff143;
}

.state-highlight-green {
    border-color: rgb(33, 166, 117);
}

.state-highlight-brown {
    border-color: rgb(202, 105, 36);
}

.state-merged {
    animation: 2s twinkle;
}
.state-active {
    border-color: #fff143;
}
.state-done {
    border-style: solid;
}
.state-id {
    text-align: center;
    width: 100%;
    font-family: "Times New Roman";
    background-color: rgba(255, 255, 255, 0.85);
}

.state-kernel {
    background-color: rgba(255, 255, 255, 0.85);
}
.state-closure {
    background-color: rgba(211, 211, 211, 0.85);
}
.lr-item {
    position: relative;
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

@keyframes twinkle {
    0% {
        border-color: rgb(89, 118, 186);
    }
    25% {
        border-color: #fff143;
    }
    50% {
        border-color: rgb(89, 118, 186);
    }
    75% {
        border-color: #fff143;
    }
    100% {
        border-color: rgb(89, 118, 186);
    }
}

.state-accept {
    position: absolute;
    top: calc(100% + 2px);
    left: 50%;
    transform: translateX(-50%);
}

.accept-arrow {
    stroke: rgb(33, 166, 117);;
    stroke-width: 2px;
    stroke-linejoin: round;
    fill: none;
}

.accept-svg {
    display: block;
    margin: 0 auto;
}
</style>