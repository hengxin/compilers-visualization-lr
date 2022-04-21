<template>
    <div v-if="larkLoaded">
        <InputPanel></InputPanel>
        <ControlPanel v-if="showControlPanel"></ControlPanel>
        <Automaton v-if="showAutomaton"></Automaton>
        <ParseTableVue v-if="showParseTable"></ParseTableVue>
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
import { LoadDependency } from "@/parsers/lr"

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
            await LoadDependency(updateLoadingMsg);
            larkLoaded.value = true;
        });
        const showControlPanel = computed(() => lrStore.showControlPanel);
        const showAutomaton = computed(() => lrStore.showAutomaton);
        const showParseTable = computed(() => lrStore.showParseTable);
        return {
            t,
            larkLoaded, loadingMsg,
            showControlPanel,
            showAutomaton,
            showParseTable,
        }
    }
});

</script>
<style scoped>
</style>