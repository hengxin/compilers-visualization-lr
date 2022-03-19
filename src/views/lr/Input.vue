<template>
    <div class="algorithm-selector"></div>
    <textarea placeholder="文法" v-model="grammar"></textarea>
    <textarea placeholder="代码" v-model="text"></textarea>
    <button>Parse</button>
</template>
<script lang="ts">
import { ref, defineComponent } from "vue";
export default defineComponent({
    setup() {
        const grammar = ref("");
        const text = ref("");

        function parse() {
            
        }

        return {
            grammar, text
        };
    }
});
</script>