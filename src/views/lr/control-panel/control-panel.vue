<template>
    <div class="control-panel">
        <template v-if="parserStatus === ParserStatus.Automaton">
        <template v-if="automatonStatus === AutomatonStatus.Calculate">
        <!-- 自动机控制面板 -->
            <div class="control-panel-group">
                <div>
                    {{ t('LR.ControlPanel.CurrentState') }}
                    <span class="non-terminal">I</span><sub class="non-terminal">{{ currentStateId }}</sub>
                </div>
                <GButton v-show="showCalcClosureButton" type="success" @click="CalcClosure(true)">{{ t('LR.ControlPanel.StepClosure') }}</GButton>
                <GButton v-show="showCalcClosureButton" type="success" @click="CalcClosure()">{{ t('LR.ControlPanel.CalcualteClosure') }}</GButton>
                <GButton v-show="showAppendStatesButton" type="success" @click="AppendStates()">{{ t('LR.ControlPanel.AppendStates') }}</GButton>
                <GButton v-show="showSkipButton" type="info" @click="skipAutomaton()">{{ t('LR.ControlPanel.Skip') }}</GButton>
                <GButton v-show="showClosureStepButton" type="success" @click="calcClosureStep()">{{ t('LR.ControlPanel.StepClosureStep') }}</GButton>
            </div>
            <div class="control-panel-group" v-show="!lrStore.showClosureModal">
                <span>
                    {{ t('LR.ControlPanel.ManualMode') }}
                    <a :href="t('GuideURLs.ManualMode')" target="_blank">
                        <i class="bi bi-question-circle" style="color: gray; font-size: 12px;"></i>
                    </a>
                </span>
                
                <GSwitch :model-value="manual" @change="SwitchMode" :disabled="manual"></GSwitch>
            </div>
        </template>
        <template v-if="automatonStatus === AutomatonStatus.Merge">
            <GButton type="info" @click="MergeLr1States()">{{ t('LR.ControlPanel.MergeLR1') }}</GButton>
        </template>
        <template v-if="automatonStatus === AutomatonStatus.Done">
            <GButton type="info" v-show="showCalcParseTableButton" @click="CalcParseTable()">{{ t('LR.ControlPanel.CalculateParseTable') }}</GButton>
        </template>
        </template>

        <template v-if="parserStatus === ParserStatus.ParseTable">
            <GButton type="info" @click="startParse()">{{ t('LR.ControlPanel.StartParse') }}</GButton>
        </template>

        <div class="control-panel-group" v-if="parserStatus === ParserStatus.ParseTree">
            <GButton type="success" @click="parse()">{{ t('LR.ControlPanel.ParseStep') }}</GButton>
            <GButton type="info" @click="skipParse()">{{ t('LR.ControlPanel.Skip') }}</GButton>
        </div>
        
        <span v-if="parserStatus === ParserStatus.Done">{{ t('LR.ControlPanel.Finish') }}</span>
        <GButton @click="reset()" type="error">{{ t('LR.ControlPanel.Reset') }}</GButton>
    </div>
</template>
<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { useI18n } from "vue-i18n";
import { MessageSchema } from "@/i18n";
import { GButton, GSwitch } from "@/components";
import { useLrStore } from "@/stores";
import { GetParser } from "@/parsers/lr";
import EventBus from "@/utils/eventbus";

const { t } = useI18n<{ message: MessageSchema }>({ useScope: "global" });
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

enum ParserStatus {
    Automaton, ParseTable, ParseTree, Done,
}
const parserStatus = ref(ParserStatus.Automaton);

const showCalcClosureButton = computed(() => !lrStore.showClosureModal &&
    (manual.value || (!lrStore.stateFlags[currentStateId.value].closureDone && automatonStatus.value === AutomatonStatus.Calculate)));
const showAppendStatesButton = computed(() => {
    const flags = lrStore.stateFlags[currentStateId.value];
    return !lrStore.showClosureModal &&
        (manual.value || (flags.closureDone && !flags.appended && automatonStatus.value === AutomatonStatus.Calculate));
});
const showCalcParseTableButton = computed(() => !manual.value && automatonStatus.value === AutomatonStatus.Done && !lrStore.showClosureModal);
const showSkipButton = computed(() => !lrStore.showClosureModal && !manual.value);
const showClosureStepButton = computed(() => lrStore.showClosureModal);
async function CalcClosure(step: boolean = false) {
    const res = parser.automaton.CalcStateClosure(currentStateId.value, algorithm.value);
    if (algorithm.value === "LR1" || algorithm.value === "LR1_LALR1") {
        parser.automaton.MergeLookaheads(currentStateId.value);
    }
    lrStore.stateFlags[currentStateId.value].closureDone = true;
    if (step) {
        EventBus.publish("lr", "InitClosureStep", res);
    }
    await EventBus.publish("lr", "State" + currentStateId.value + "Closure", res.state);
}

function calcClosureStep() {
    EventBus.publish("lr", "ClosureStep");
}

async function AppendStates() {
    const res = parser.automaton.AppendStates(currentStateId.value);
    await EventBus.publish("lr", "AutomatonAppendStates", res);
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

async function skipAutomaton() {
    lrStore.automatonLoading = true;
    // 这里使用setTimeout是为了事件顺序，让loading先显示？
    setTimeout(async () => {
        while (automatonStatus.value === AutomatonStatus.Calculate) {
            const flags = lrStore.stateFlags[currentStateId.value];
            if (!flags.closureDone) {
                await CalcClosure();
            }
            if (!flags.appended) {
                await AppendStates();
            }
        }
        if (automatonStatus.value === AutomatonStatus.Merge) {
            await MergeLr1States();
        }
        lrStore.automatonLoading = false;
    });
}

async function MergeLr1States() {
    const res = parser.automaton.mergeLr1();
    await EventBus.publish("lr", "AutomatonMergeLr1States", res);
    automatonStatus.value = AutomatonStatus.Done;
}

function CalcParseTable() {
    parser.parseTable.calc();
    parserStatus.value = ParserStatus.ParseTable;
    lrStore.showParseTable = true;
    nextTick(() => {
        document.getElementById("parsetable")?.scrollIntoView({ behavior: "smooth" });
    });
}

function startParse() {
    parserStatus.value = ParserStatus.ParseTree;
    lrStore.showParseTree = true;
    nextTick(() => {
        document.getElementById("parsetree")?.scrollIntoView({ behavior: "smooth" });
    });
}

function parse() {
    const res = parser.parseByStep();
    EventBus.publish("lr", "ParseTreeStep", res);
    EventBus.publish("lr", "ParseTableHighlight", res.actionSource);
    EventBus.publish("lr", "AutomatonStatesPath", res);
    if (parser.done) {
        parserStatus.value = ParserStatus.Done;
    }
}

function skipParse() {
    while(!parser.done) {
        parse();
    }
}

function reset() {
    EventBus.publish("lr", "InputPanelReset");
    // 为什么不用重新设置ParserStauts和AutomatonStatus?
    // 因为reset后，index的v-if会直接将该组件卸载，重新加载就直接重新初始化了。
}

</script>
<style scoped>
.control-panel {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 64px;
    margin: 0 auto;
    width: 500px;
    background-color: white;
    border: 2px solid rgb(33, 166, 117);
    border-radius: 4px;
    padding: 8px;
    background-color: #d3ede3;
    z-index: 9999;
}

.control-panel-group {
    display: flex;
    flex-direction: row;
    align-items: center;
}

.control-panel-group > * {
    margin-right: 4px;
}
</style>