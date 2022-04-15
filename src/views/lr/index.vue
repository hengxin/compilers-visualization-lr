<template>
    <div v-if="larkLoaded">
        <InputPanel></InputPanel>
        <!-- <ControlPanel></ControlPanel> -->
        <Automaton v-if="showAutomaton"></Automaton>
        <ParseTableVue v-if="showParseTable" :parse-table="parseTable!"></ParseTableVue>
        <ParseTree></ParseTree>
    </div>
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
import { loadDependency } from "./common";
import { ParseTable } from "@/parsers/lr"

import InputPanel from "./input-panel/input-panel.vue";
import ControlPanel from "./control-panel/control-panel.vue";
import Automaton from "./display-panel/automaton-panel.vue";
import ParseTableVue from "./parse-table/parse-table.vue";
import ParseTree from "./parse-tree/parse-tree.vue";

export default defineComponent({
    components: {
        InputPanel,
        ControlPanel,
        Automaton,
        ParseTableVue,
        ParseTree
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
            await loadDependency(updateLoadingMsg);
            larkLoaded.value = true;
        });
        const showAutomaton = computed(() => lrStore.showAutomaton);
        const showParseTable = computed(() => lrStore.showParseTable);
        const parseTable = ref<ParseTable>();
        return {
            t,
            larkLoaded, loadingMsg,
            showAutomaton,
            showParseTable, parseTable,
        }
    }
});

</script>
<style scoped>
</style>