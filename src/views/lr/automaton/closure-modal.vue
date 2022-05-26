<template>
    <GModal v-model:visible="showClosureModal" @close="reset()">
        <div v-if="algorithm !== 'LR0'" class="first-set-panel">
            <div class="panel-title">{{ t('LR.ClosureModal.FirstSet') }}</div>
            <FirstSetTable :first-set="firstSet" style="max-width: 100%;"></FirstSetTable>
        </div>
        <div v-if="firstResults[idx]">
            <div v-for="f in firstResults[idx]">
                <span>First(</span>
                <span v-for="s in f.symbolString"
                    :class="['first-result-item', s.isTerm ? 'terminal' : 'non-terminal']">{{ s.name }}</span>
                <span>) = {</span>
                <span v-for="s in f.firstSet" class="terminal first-result-item">{{ s.name }}</span>
                <span>}</span>
            </div>
        </div>
        <div class="rule-list">
            <div class="panel-title">{{ t('LR.ClosureModal.Rule') }}</div>
            <RuleLine v-for="(item, index) in ruleList" :rule="item.rule" :index="index"></RuleLine>
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
        <template #header>
            <GButton @click="closureStep()">{{
                stepState === StepState.Calculate ? t("LR.ClosureModal.Calculate") :
                 (stepState === StepState.Next ? t("LR.ClosureModal.Next") : t("LR.ClosureModal.Done"))
            }}</GButton>
        </template>
    </GModal>
</template>
<script lang="ts">
import { defineComponent, onUnmounted, PropType, ref } from "vue";
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
        const store = useLrStore();
        const showClosureModal = ref(false);
        const parser = GetParser();
        const ruleList = ref<Array<{ rule: Rule, highlight: boolean }>>([]);
        ruleList.value = parser.store.rules.map((rule) => ({ rule, highlight: false }));
        const closure = ref<Array<{ item: LRItem, highlight: boolean }>>([]);
        // 这里声明closureRaw，是因为calculateStep中equalIncludes比较rule用的等号，
        // 而从closure.value获得的item是Proxy，equalIncludes总为false。
        const closureRaw: Array<LRItem> = [];
        const firstResults: Array<Array<FirstResult> | undefined> = [];

        let steps: ClosureSteps = [];
        const idx = ref(-1);
        // 接收事件总线指令，开始进行单步计算。
        function handleClosureStep(res: StateClosureResult) {
            showClosureModal.value = true;
            closure.value = res.state.kernel.map((item) => {
                closureRaw.push(item);
                return { item, highlight: false };
            });
            steps = res.steps;
            steps.forEach(step => firstResults.push(step.first))
            nextStep();
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
            }
        }

        function reset() {
            idx.value = 0;
            closure.value = [];
            steps = [];
            showClosureModal.value = false;
            stepState.value = StepState.Calculate;
        }

        return {
            t,
            algorithm: store.algorithm,
            showClosureModal,
            ruleList,
            closure,
            idx,
            firstResults,
            StepState,
            stepState,
            closureStep,
            reset,
        }
    }
});
</script>
<style scoped>
.first-set-panel {
    width: fit-content;
    max-width: 100%;
}

.panel-title {
    margin: 4px 0;
    font-weight: bold;
}

.first-result-item {
    margin: 0 2px;
}

.rule-list,
.item-list {
    display: inline-block;
    min-width: 200px;
    /* max-width: ; */
    vertical-align: top;
}

.rule-list {
    margin-right: 16px;
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