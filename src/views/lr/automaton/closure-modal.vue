<template>
    <GModal v-model:visible="showClosureModal" @close="reset()">
        <div class="rule-list">
            <RuleLine v-for="(item, index) in ruleList" :rule="item.rule" :index="index"></RuleLine>
        </div>
        <div class="item-list">
            <LrItemComponent
                v-for="(c, index) in closure"
                :lr-item="c.item"
                :class="[
                    index === idx ? 'lr-item-highlight-green' : '',
                    c.highlight ? 'lr-item-highlight-gold' : '',
                ]"></LrItemComponent>
        </div>
        <GButton @click="closureStep()">step</GButton>
    </GModal>
</template>
<script lang="ts">
import { defineComponent, onUnmounted, ref } from "vue";
import { ClosureStep, GetParser, LRItem, Rule, StateClosureResult } from "@/parsers/lr";
import { GButton, GModal } from "@/components";
import RuleLine from "../input-panel/rule-line.vue";
import LrItemComponent from "./lr-item.vue";
import EventBus from "@/utils/eventbus";

enum StepState {
    Calculate, Next, Done,
}

export default defineComponent({
    components: {
        GButton,
        GModal,
        LrItemComponent,
        RuleLine,
    },
    setup() {
        const showClosureModal = ref(false);
        const parser = GetParser();
        const ruleList = ref<Array<{ rule: Rule, highlight: boolean }>>([]);
        ruleList.value = parser.store.rules.map((rule) => ({ rule, highlight: false }));
        const closure = ref<Array<{ item: LRItem, highlight: boolean }>>([]);

        let steps: Array<Array<ClosureStep>> = [];
        const idx = ref(0);
        // 接收事件总线指令，开始进行单步计算。
        function handleClosureStep(res: StateClosureResult) {
            showClosureModal.value = true;
            closure.value = res.state.kernel.map((item) => ({ item, highlight: false }));
            steps = res.steps;
        }
        const unsubscribe = [
            EventBus.subscribe("lr", "ClosureStep", handleClosureStep),
        ];
        onUnmounted(() => unsubscribe.forEach(fn => fn()));

        let stepState = ref<StepState>(StepState.Calculate);
        function closureStep() {
            if (stepState.value === StepState.Calculate) {
                calculateStep();
            } else if (stepState.value === StepState.Next) {
                nextStep();
            } else {
                reset();
            }
        }
        function calculateStep() {
            if (steps[idx.value].length === 0) {
                nextStep();
                return;
            }
            steps[idx.value].forEach((step) => {
                if (step.existed) {
                    closure.value.forEach((c) => {
                        if (c.item.equalIncludes(step.item)) {
                            c.highlight = true;
                        }
                    });
                } else {
                    closure.value.push({ item: step.item, highlight: true });
                }
            });
            stepState.value = StepState.Next;
        }
        function nextStep() {
            closure.value.forEach(c => c.highlight = false);
            idx.value++;
            if (idx.value >= steps.length) {
                stepState.value = StepState.Done;
            } else {
                stepState.value = StepState.Calculate;
            }
        }

        function reset() {
            idx.value = 0;
            closure.value = [];
            steps = [];
            showClosureModal.value = false;
        }

        return {
            showClosureModal,
            ruleList,
            closure,
            idx,
            closureStep,
            reset,
        }
    }
});
</script>
<style scoped>
.lr-item-highlight-green {
    background-color: #d3ede3;
}

.lr-item-highlight-gold {
    background-color: #fff143;
}
</style>