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
import { ref, defineComponent, onErrorCaptured, onMounted, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useLrStore } from "@/stores";
import { MessageSchema } from "@/i18n"
import { LoadDependency, ParserError, ParserInfo } from "@/parsers/lr"
import { GWindow, GLoading, GNotification } from "@/components";
import { CommonError } from "@/utils/exception";

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

        onErrorCaptured((err, instance, info) => {
            if (err instanceof ParserError) {
                GNotification({
                    title: t("LR.Exception." + err.message) + (err.extra ? err.extra : ""),
                    content: t("LR.Exception.ParserErrorExtra"),
                    type: "error"
                })
            } else if (err instanceof ParserInfo) {
                GNotification({ title: t("LR.Exception." + err.message), content: "", type: "info" });
            } else if (err instanceof CommonError) {
                GNotification({
                    title: t("LR.Exception." + err.message),
                    content: err.extra ? err.extra : "",
                    type: "error"
                });
            } else {
                return true;
            }
            // return值表示是否还要将错误传递给上层组件
            return false;
        });

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