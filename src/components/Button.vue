<template>
    <button :class="['__g-button', '__g-button-type-' + type]">
        <slot />
    </button>
</template>
<script lang="ts">
import { defineComponent, PropType } from "vue";
type ButtonType = "default" | "primary" | "success" | "warning" | "error" | "info";
export default defineComponent({
    props: {
        type: { type: String as PropType<ButtonType>, default: "default" },
    },
    setup() {
    }
});
</script>
<style>
.__g-button {
    padding: 6px 8px;
    font-size: 1em;
    line-height: 1em;
    border: 1px var(--color-gainsboro) solid;
    border-radius: 2px;
    background-color: var(--color-white);
    color: #333333;
    cursor: pointer;
    font-weight: bold;
    user-select: none;
}

.__g-button-type-default {
    border-color: var(--color-gainsboro);
    background-color: var(--color-white);
    color: #333333;
}

.__g-button-type-primary {
    border-color: var(--color-primary);
    background-color: var(--color-primary);
    color: white;
}

.__g-button-type-success {
    border-color: var(--color-success);
    background-color: var(--color-success);
    color: white;
}

.__g-button-type-warning {
    border-color: var(--color-warning);
    background-color: var(--color-warning);
    color: white;
}

.__g-button-type-error {
    border-color: var(--color-error);
    background-color: var(--color-error);
    color: white;
}

.__g-button-type-info {
    border-color: var(--color-info);
    background-color: var(--color-info);
    color: white;
}
</style>