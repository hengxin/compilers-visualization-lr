<template>
    <div class="__g-switch" @click="switchChange()">
        <span v-if="activeText">{{ activeText }}</span>
        <span :class="['__g-switch-core', modelValue ? '__g-switch-core-active' : '__g-switch-core-inactive']">
            <div :class="['__g-switch-circle', modelValue ? '__g-switch-circle-active' : '__g-switch-circle-inactive']">
            </div>
        </span>
        <span v-if="inactiveText">{{ inactiveText }}</span>
    </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    props: {
        activeText: { type: String, default: "" },
        inactiveText: { type: String, default: "" },
        modelValue: { type: Boolean, required: true },
    },
    setup(props, ctx) {
        function switchChange() {
            ctx.emit("update:modelValue", !props.modelValue);
        }
        return { switchChange };
    },
});
</script>
<style>
.__g-switch {
    display: inline-flex;
    cursor: pointer;
    align-items: center;
}
.__g-switch-core {
    width: 36px;
    height: 20px;
    border-radius: 10px;
    padding: 2px;
    position: relative;
    transition: background-color 0.3s;
}
.__g-switch-core-active {
    background-color: var(--color-klein-blue);
}
.__g-switch-core-inactive {
    background-color: var(--color-gainsboro);
}
.__g-switch-circle {
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background-color: white;
    position: absolute;
    transition: left 0.3s;
}
.__g-switch-circle-active {
    left: 50%
}
.__g-switch-circle-inactive {
    left: 2px;
}
</style>