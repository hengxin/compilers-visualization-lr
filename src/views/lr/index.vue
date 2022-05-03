<template>
    <template v-if="larkLoaded">
        <GWindow class="panel-window" title="Input Panel" :default-style="{ height: '400px' }">
            <InputPanel></InputPanel>
        </GWindow>
        <GWindow class="panel-window" title="Automaton" :default-style="{ height: '80vh' }" v-if="showAutomaton">
            <Automaton></Automaton>
            <!-- <div class="panel-container">
                <div class="automaton-loading-mask" v-if="automatonLoading">
                    <div class="loading">
                        <svg class="loading-svg">
                            <circle class="loading-circle" cx="22" cy="22" r="20"></circle>
                        </svg>
                    </div>
                    <div class="loading">正在加载...</div>
                </div>
            </div> -->
        </GWindow>
        <GWindow class="panel-window" title="Parse Table" :default-style="{ width: 'fit-content', height: 'fit-content', maxWidth: '100%'}"
            v-if="showParseTable">
            <ParseTableVue></ParseTableVue>
        </GWindow>
        <GWindow class="panel-window" title="Parse Tree" :default-style="{ height: '80vh' }" v-if="showParseTree">
            <ParseTree></ParseTree>
        </GWindow>
        <ControlPanel v-if="showControlPanel"></ControlPanel>
    </template>
    <div v-else>
        {{ t("lr.loadingDependecy") }}
        <br />
        <span>{{ loadingMsg }}</span>
    </div>
</template>
<script lang="ts">
import { ref, defineComponent, onMounted, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useLrStore } from "@/stores";
import { LoadDependency } from "@/parsers/lr"
import { GWindow } from "@/components";

import InputPanel from "./input-panel/input-panel.vue";
import ControlPanel from "./control-panel/control-panel.vue";
import Automaton from "./automaton-panel/automaton-panel.vue";
import ParseTableVue from "./parse-table/parse-table.vue";
import ParseTree from "./parse-tree/parse-tree.vue";

export default defineComponent({
    components: {
        InputPanel,
        ControlPanel,
        Automaton,
        ParseTableVue,
        ParseTree,
        GWindow,
    },
    props: { algo: { type: String } },
    setup(props) {
        const { t, locale } = useI18n({ useScope: "global" });
        const lrStore = useLrStore();
        const larkLoaded = ref(false);
        const loadingMsg = ref("");
        function updateLoadingMsg(msg: string) {
            loadingMsg.value = msg;
        }
        onMounted(async () => {
            await LoadDependency(updateLoadingMsg);
            larkLoaded.value = true;
        });
        const showControlPanel = computed(() => lrStore.showControlPanel);
        const showAutomaton = computed(() => lrStore.showAutomaton);
        const showParseTable = computed(() => lrStore.showParseTable);
        const showParseTree = computed(() => lrStore.showParseTree);
        const automatonLoading = computed(() => lrStore.automatonLoading);
        return {
            t,
            larkLoaded, loadingMsg,
            showControlPanel,
            showAutomaton,
            showParseTable,
            showParseTree,
            automatonLoading,
        }
    }
});

</script>
<style scoped>
.panel-window {
    margin-bottom: 4px;
}

.panel-window:last-child {
    margin-bottom: 0;
}

.panel-container {
    position: relative;
}

.automaton-loading-mask {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(255, 255, 255, 0.8);
    z-index: 30;
}

.loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}

.loading-svg {
    width: 44px;
    height: 44px;
    animation: loading-rotate 2s linear infinite;
}

.loading-circle {
    stroke: var(--color-klein-blue);
    stroke-width: 2;
    fill: none;
    animation: loading-dash 1.5s ease-in-out infinite;
}

@keyframes loading-rotate {
    0% {
        transform: rotate(0);
    }

    100% {
        transform: rotate(360deg);
    }
}

@keyframes loading-dash {
    0% {
        stroke-dasharray: 1, 200;
        stroke-dashoffset: 0;
    }

    50% {
        stroke-dasharray: 90, 150;
        stroke-dashoffset: -40px;
    }

    100% {
        stroke-dasharray: 90, 150;
        stroke-dashoffset: -120px;
    }
}
</style>