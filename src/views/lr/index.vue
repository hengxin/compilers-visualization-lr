<template>
    <div v-if="larkLoaded">
        <ControlInputPanel></ControlInputPanel>
        <Automaton></Automaton>
        <ParseTableVue v-if="showParseTable" :parse-table="parseTable!"></ParseTableVue>
    </div>
    <div v-else>
        {{ t("lr.loadingDependecy") }}
        <br />
        <span>{{ loadingMsg }}</span>
    </div>
</template>
<script lang="ts">
import EventBus from "@/utils/eventbus";
import { ref, defineComponent, onMounted, computed, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { useStore } from "vuex";
import { loadDependency } from "./common";
import { ParseTable } from "@/parsers/lr"

import ControlInputPanel from "./control-input-panel/control-input-panel.vue";
import Automaton from "./display-panel/automaton-panel.vue";
import ParseTableVue from "./parse-table/parse-table.vue";

export default defineComponent({
    components: {
        ControlInputPanel,
        Automaton,
        ParseTableVue
    },
    setup() {
        const { t, locale } = useI18n({ useScope: "global" });
        // const store = useStore();
        const showParseTable = ref(false);
        const larkLoaded = ref(false);
        const loadingMsg = ref("");
        function updateLoadingMsg(msg: string) {
            loadingMsg.value = msg;
        }
        onMounted(async () => {
            await loadDependency(updateLoadingMsg);
            larkLoaded.value = true;
        });

        const parseTable = ref<ParseTable>();
        function handleShowParseTable(table: ParseTable) {
            parseTable.value = table;
            showParseTable.value = true;
        }
        const unsubscribe = [
            EventBus.subscribe("lr", "ShowParseTable", handleShowParseTable),
        ];
        onUnmounted(() => unsubscribe.forEach(fn => fn()));
        return {
            t,
            larkLoaded, loadingMsg,
            showParseTable, parseTable,
        }
    }
});

</script>
<style scoped>
</style>