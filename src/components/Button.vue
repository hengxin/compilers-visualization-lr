<template>
    <button class="g-button"><slot /></button>
</template>
<script lang="ts">import { defineComponent } from "vue";

export default defineComponent({
    setup() {
    }
});
</script>
<style scoped>
.g-button {
    padding: 8px 12px;
    border: 1px var(--color-gainsboro) solid;
    background-color: var(--color-white);
    cursor: pointer;
    font-weight: bold;
}
</style>