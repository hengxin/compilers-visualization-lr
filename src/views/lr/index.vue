<template>
    <div v-if="larkLoaded">
        <ControlInputPanel></ControlInputPanel>
        <Automaton></Automaton>
    </div>
    <div v-else>
        {{ t("lr.loadingDependecy") }}
        <br />
        <span>{{ loadingMsg }}</span>
    </div>
</template>
<script lang="ts">
import { ref, defineComponent, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { loadDependency } from "./common";

import ControlInputPanel from "./control-input-panel/control-input-panel.vue";
import Automaton from "./display-panel/automaton-panel.vue";

export default defineComponent({
    components: {
        ControlInputPanel,
        Automaton,
    },
    setup() {
        const { t, locale } = useI18n({ useScope: "global" });
        const larkLoaded = ref(false);
        const loadingMsg = ref("");
        function updateLoadingMsg(msg: string) {
            loadingMsg.value = msg;
        }
        onMounted(async () => {
            await loadDependency(updateLoadingMsg);
            larkLoaded.value = true;
        });

        return {
            t,
            larkLoaded, loadingMsg,
        }
    }
});

</script>
<style scoped>
</style>