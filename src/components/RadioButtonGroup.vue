<template>
    <div ref="radioGroupRef">
        <button
            v-for="(option, index) in options"
            :class="[
                'g-radio-button',
                disable ? 'disable' : '',
                index === activeRadioIndex ? 'active' : '',
            ]"
            @click="disable ? undefined : updateValue(index)"
        >{{ option }}</button>
    </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, PropType, ref } from "vue";

const props = {
    options: { type: Array as PropType<Array<string>>, default: [] },
    disable: { type: Boolean, default: false, },
    modelValue: { type: String, default: "", },
}
type RadioGroupProps = typeof props;

export default defineComponent({
    name: "GRadioGroup",
    props: props,
    setup(props, ctx) {
        const activeRadioIndex = ref<number>(0);
        const index = props.options.indexOf(props.modelValue);
        if (index !== -1) {
            activeRadioIndex.value = index;
        }

        function updateValue(index: number) {
            activeRadioIndex.value = index;
            ctx.emit("update:modelValue", props.options[index]);
        }

        if (props.options.length > 0) {
            updateValue(activeRadioIndex.value);
        }

        return {
            activeRadioIndex,
            updateValue,
        };
    }
})
</script>

<style scoped>
.g-radio-button {
    padding: 8px 12px;
    border: 1px var(--color-gainsboro) solid;
    border-right-width: 0;
    background-color: var(--color-white);
    cursor: pointer;
    font-weight: bold;
}
.g-radio-button:first-child {
    border-radius: 2px 0 0 2px;
}
.g-radio-button:last-child {
    border-radius: 0 2px 2px 0;
    border-right-width: 1px;
}
.active {
    background-color: var(--color-klein-blue);
    color: var(--color-white);
}

.disable {
    cursor: not-allowed;
}
</style>