<template>
    <template v-if="larkLoaded">
        <GWindow id="input" :title="t('LR.InputPanel.Title')" :default-style="{ height: '400px', marginBottom: '4px' }"
            position="absolute">
            <InputPanel></InputPanel>
        </GWindow>
        <GWindow id="automaton" :title="t('LR.Automaton.Title')" :default-style="{ height: '80vh', marginBottom: '4px' }"
            position="absolute" v-if="showAutomaton">
            <Automaton></Automaton>
        </GWindow>
        <GWindow id="parsetable" :title="t('LR.ParseTable.Title')"
            :default-style="{ width: 'fit-content', height: 'fit-content', maxWidth: '100%', marginBottom: '4px' }"
            position="absolute" v-if="showParseTable">
            <ParseTable></ParseTable>
        </GWindow>
        <GWindow id="parsetree" :title="t('LR.ParseTree.Title')" :default-style="{ height: '80vh' }"
            position="absolute" v-if="showParseTree">
            <ParseTree></ParseTree>
        </GWindow>
        <ControlPanel v-if="showControlPanel"></ControlPanel>
    </template>
    <div v-else>
        <GLoading :text="[t('LR.LoadingDependecy'), t('LR.LoadingDependecyNotice'), loadingMsg]"></GLoading>
    </div>
</template>
<script lang="ts">
import { ref, defineComponent, onMounted, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useLrStore } from "@/stores";
import { MessageSchema } from "@/i18n"
import { LoadDependency } from "@/parsers/lr"
import { GWindow, GLoading } from "@/components";

import InputPanel from "./input-panel/input-panel.vue";
import ControlPanel from "./control-panel/control-panel.vue";
import Automaton from "./automaton/automaton.vue";
import ParseTable from "./parse-table/parse-table.vue";
import ParseTree from "./parse-tree/parse-tree.vue";

export default defineComponent({
    components: {
        InputPanel,
        ControlPanel,
        Automaton,
        ParseTable,
        ParseTree,
        GWindow, GLoading,
    },
    props: { algo: { type: String } },
    setup(props) {
        const { t } = useI18n<{ message: MessageSchema }>({ useScope: "global" });
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
.terminal,
:deep(.terminal) {
    font-family: "KaTex_Main", "Times New Roman";
    font-weight: bold;
}

.non-terminal,
:deep(.non-terminal) {
    font-family: "KaTex_Math", "Cambria Math";
    font-weight: bold;
    font-style: italic;
}
</style>