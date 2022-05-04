<template>
    <template v-if="larkLoaded">
        <GWindow class="panel-window" title="Input Panel" :default-style="{ height: '400px', marginBottom: '4px' }"
            position="absolute">
            <InputPanel></InputPanel>
        </GWindow>
        <GWindow class="panel-window" title="Automaton" :default-style="{ height: '80vh', marginBottom: '4px' }"
            position="absolute" v-if="showAutomaton">
            <Automaton></Automaton>
        </GWindow>
        <GWindow class="panel-window" title="Parse Table"
            :default-style="{ width: 'fit-content', height: 'fit-content', maxWidth: '100%', marginBottom: '4px' }"
            position="absolute" v-if="showParseTable">
            <ParseTableVue></ParseTableVue>
        </GWindow>
        <GWindow class="panel-window" title="Parse Tree" :default-style="{ height: '80vh', marginBottom: '64px' }"
            position="absolute" v-if="showParseTree">
            <ParseTree></ParseTree>
        </GWindow>
        <ControlPanel v-if="showControlPanel"></ControlPanel>
    </template>
    <div v-else>
        <GLoading :text="[t('lr.loadingDependecy'), loadingMsg]"></GLoading>
    </div>
</template>
<script lang="ts">
import { ref, defineComponent, onMounted, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useLrStore } from "@/stores";
import { LoadDependency } from "@/parsers/lr"
import { GWindow, GLoading } from "@/components";

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
        GWindow, GLoading,
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
</style>