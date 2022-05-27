<template>
    <GModal v-model:visible="showClosureModal" @close="reset()"
        :title="t('LR.ClosureModal.Title')"
        width="calc(100% - 256px)">
        <div class="info-container">
            <div class="rule-list">
                <div class="panel-title">{{ t('LR.ClosureModal.Rule') }}</div>
                <RuleLine v-for="(item, index) in ruleList" :rule="item.rule" :index="index"
                    style="margin-bottom: 4px;"></RuleLine>
            </div>
            <div class="first-set-panel" v-if="algorithm !== 'LR0'">
                <div style="width:100%">
                    <div class="panel-title">{{ t('LR.ClosureModal.FirstSet') }}</div>
                    <FirstSetTable :first-set="firstSet" style="max-width: 100%;"></FirstSetTable>
                </div>
                <div v-if="firstResults[idx]">
                    <div v-for="f in firstResults[idx]" style="white-space: nowrap">
                        <span>First(</span>
                        <span v-for="s in f.symbolString"
                            :class="['first-result-item', s.isTerm ? 'terminal' : 'non-terminal']">{{ s.name }}</span>
                        <span>) = {</span>
                        <span v-for="s in f.firstSet" class="terminal first-result-item">{{ s.name }}</span>
                        <span>}</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="item-list">
            <div class="panel-title">{{ t('LR.ClosureModal.Closure') }}</div>
            <div
                v-for="(c, index) in closure"
                style="position: relative;">
                <LrItemComponent
                    :lr-item="c.item"
                    :class="[
                        'lr-item',
                        index === idx ? (c.highlight ? 'lr-item-highlight-stripes' : 'lr-item-highlight-gold')
                            : (c.highlight ? 'lr-item-highlight-green' : ''),
                    ]"></LrItemComponent>
                <span v-show="index === idx" class="lr-item-arrow">→</span>
            </div>
        </div>
        <template #footer>
            <GButton @click="reset()">{{ t('LR.ClosureModal.Close') }}</GButton>
        </template>
    </GModal>
</template>
<script lang="ts">
import { computed, defineComponent, onUnmounted, PropType, ref } from "vue";
import { useI18n } from "vue-i18n";
import { MessageSchema } from "@/i18n";
import { useLrStore } from "@/stores";
import { ClosureSteps, FirstResult, GetParser, LRItem, Rule, StateClosureResult, _Symbol } from "@/parsers/lr";
import { GButton, GModal } from "@/components";
import EventBus from "@/utils/eventbus";
import RuleLine from "../input-panel/rule-line.vue";
import LrItemComponent from "./lr-item.vue";
import FirstSetTable from "./first-set-table.vue";

enum StepState {
    Calculate, Next, Done,
}

export default defineComponent({
    components: {
        FirstSetTable,
        GButton,
        GModal,
        LrItemComponent,
        RuleLine,
    },
    props: {
        firstSet: { type: Object as PropType<Map<_Symbol, Array<_Symbol>>>, required: true },
    },
    setup() {
        const { t } = useI18n<{ message: MessageSchema }>({ useScope: "global" });
        const lrStore = useLrStore();
        const showClosureModal = computed(() => lrStore.showClosureModal);
        const parser = GetParser();
        const ruleList = ref<Array<{ rule: Rule, highlight: boolean }>>([]);
        ruleList.value = parser.store.rules.map((rule) => ({ rule, highlight: false }));
        const closure = ref<Array<{ item: LRItem, highlight: boolean }>>([]);
        // 这里声明closureRaw，是因为calculateStep中equalIncludes比较rule用的等号，
        // 而从closure.value获得的item是Proxy，equalIncludes总为false。
        let closureRaw: Array<LRItem> = [];
        const firstResults = ref<Array<Array<FirstResult> | undefined>>([]);

        let steps: ClosureSteps = [];
        const idx = ref(-1);
        // 接收事件总线指令，开始进行单步计算。
        function handleInitClosureStep(res: StateClosureResult) {
            lrStore.showClosureModal = true;
            closure.value = res.state.kernel.map((item) => {
                closureRaw.push(item);
                return { item, highlight: false };
            });
            steps = res.steps;
            steps.forEach(step => firstResults.value.push(step.first))
            nextStep();
        }

        let stepState = ref<StepState>(StepState.Calculate);
        function handleClosureStep() {
            if (stepState.value === StepState.Calculate) {
                calculateStep();
            } else if (stepState.value === StepState.Next) {
                nextStep();
            } else {
                reset();
            }
        }
        const unsubscribe = [
            EventBus.subscribe("lr", "InitClosureStep", handleInitClosureStep),
            EventBus.subscribe("lr", "ClosureStep", handleClosureStep),
        ];
        onUnmounted(() => unsubscribe.forEach(fn => fn()));

        function calculateStep() {
            if (steps[idx.value].step.length === 0) {
                nextStep();
                return;
            }
            steps[idx.value].step.forEach((stepItem) => {
                if (stepItem.existed) {
                    closureRaw.forEach((item, index) => {
                        console.log(item.equalIncludes(stepItem.item))
                        if (item.equalIncludes(stepItem.item)) {
                            closure.value[index].highlight = true;
                        }
                    });
                } else {
                    closure.value.push({ item: stepItem.item, highlight: true });
                    closureRaw.push(stepItem.item);
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
                if (steps[idx.value].step.length === 0) {
                    stepState.value = StepState.Next;
                }
            }
        }

        function reset() {
            idx.value = -1;
            closure.value = [];
            closureRaw = [];
            firstResults.value = [];
            steps = [];
            lrStore.showClosureModal = false;
            stepState.value = StepState.Calculate;
        }

        return {
            t,
            algorithm: lrStore.algorithm,
            showClosureModal,
            ruleList,
            closure,
            idx,
            firstResults,
            StepState,
            stepState,
            handleClosureStep,
            reset,
        }
    }
});
</script>
<style scoped>
* {
    font-size: 16px;
}

.info-container {
    display: flex;
    flex-direction: row;
    margin-bottom: 16px;
    justify-content: space-between;
}

.info-container > div {
    width: calc(50% - 24px);
    flex-shrink: 0;
    overflow-x: auto;
}

.first-set-panel {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: space-between;
}

.panel-title {
    margin: 4px 0;
    font-weight: bold;
}

.first-result-item {
    margin: 0 2px;
}

.lr-item {
    position: relative;
    animation: 0.5s slide-in;
    margin-bottom: 4px;
}

.lr-item-arrow {
    font-weight: bold;
    position: absolute;
    left: 0;
    top: 0;
    transform: translateX(-100%);
}

.lr-item-highlight-green {
    background-color: #d3ede3;
}

.lr-item-highlight-gold {
    background-color: #fff143;
}

.lr-item-highlight-stripes {
    background: linear-gradient(-45deg, #fff143 25%, #d3ede3 0, #d3ede3 50%, #fff143 0, #fff143 75%, #d3ede3 0);
    background-size: 30px 30px;
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