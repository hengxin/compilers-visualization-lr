<template>
    <div :class="['__g-switch', disabled ? '__g-switch-disabled' : '']" @click="switchChange()">
        <span class="__g-switch-text __g-switch-text-l" v-if="inactiveText">{{ inactiveText }}</span>
        <span :class="['__g-switch-core', modelValue ? '__g-switch-core-active' : '__g-switch-core-inactive']">
            <div :class="['__g-switch-circle', modelValue ? '__g-switch-circle-active' : '__g-switch-circle-inactive']">
            </div>
        </span>
        <span class="__g-switch-text __g-switch-text-r" v-if="activeText">{{ activeText }}</span>
    </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    props: {
        activeText: { type: String, default: "" },
        inactiveText: { type: String, default: "" },
        modelValue: { type: Boolean },
        disabled: { type: Boolean, default: false },
    },
    emits: ["update:modelValue", "change"],
    setup(props, ctx) {
        function switchChange() {
            if (props.disabled) {
                return;
            }
            ctx.emit("update:modelValue", !props.modelValue);
            ctx.emit("change", props.modelValue);
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

.__g-switch-disabled {
    opacity: 0.6;
    cursor: not-allowed;
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
    background-color: rgb(89, 118, 186);
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

.__g-switch-text {
    font-size: 14px;
}

.__g-switch-text-l {
    margin-right: 4px;
}

.__g-switch-text-r {
    margin-left: 4px;
}
</style>