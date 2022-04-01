<template>
    <div class="arrow" ref="arrow">
        <div class="arrow-inner" ref="arrowInner"></div>
    </div>
</template>
<script lang="ts">
import { defineComponent, onMounted, ref, PropType, computed, StyleValue } from "vue";
const props = {
    direction: { type: String as PropType<"up" | "down" | "left" | "right">, required: true },
    size: {type: Number, default: 16},
}
export default defineComponent({
    props,
    setup(props, ctx) {
        const arrow = ref<HTMLDivElement>();
        const arrowInner = ref<HTMLDivElement>();
        onMounted(() => {
            arrow.value!.style.height = (arrowInner.value!.offsetHeight / 2) + "px";
        });
// TODO
        const arrowStyle = computed<StyleValue>(() => ({
            borderWidth: props.size,
            
        }));
        return {
            arrow, arrowInner
        }
    }
});
</script>
<style scoped>
.arrow {
    box-sizing: content-box;
    cursor: pointer;
    padding: 4px;
    width: fit-content;
    overflow: hidden;
}
.arrow-inner {
    width: 0;
    height: 0;
    border: 12px solid;
    border-style: solid;
    border-color: var(--color-klein-blue) transparent transparent transparent;
    position: relative;
}
.arrow-inner::after {
    content: "";
    position: absolute;
    top: -14px;
    left: -12px;
    border: 12px solid;
    border-color: var(--color-white) transparent transparent transparent;
}
</style>