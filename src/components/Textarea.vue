<template>
    <textarea
        ref="textarea"
        class="g-textarea"
        :placeholder="placeholder"
        :style="textareaStyle"
        :rows="rows"
        @input="handleTextareaInput"
    ></textarea>
</template>
<script lang="ts">
import { computed, defineComponent, PropType, ref } from "vue";
import type { StyleValue } from "vue";
const props = {
    placeholder: { type: String, default: "" },
    resize: { type: String as PropType<"none" | "both" | "horizontal" | "vertical">, default: "none" },
    modelValue: { type: String, default: "", },
    // TODO 这里rows default值无效，为什么？
    rows: { type: Number, defalut: 10 },
}
type TextareaProp = typeof props;
export default defineComponent({
    props: props,
    setup(props, ctx) {
        const textarea = ref<HTMLTextAreaElement>();
        const textareaStyle = computed<StyleValue>(() => ({
            resize: props.resize,
        }));
        function handleTextareaInput(event: Event) {
            const value = (event.target as HTMLTextAreaElement).value;
            ctx.emit("update:modelValue", value);
        }

        return {
            textareaStyle,
            handleTextareaInput,
        }
    }
});
</script>
<style scoped>
.g-textarea {
    width: 100%;
    border-radius: 2px;
    border: 1px var(--color-gainsboro) solid;
    outline: none;
}
.g-textarea:focus {
    box-shadow: 0 0 0 1px var(--color-klein-blue);
}
</style>