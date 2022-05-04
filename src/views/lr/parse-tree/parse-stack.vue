<template>
    <div class="parse-stack">
        <div v-for="(val, index) in stackValues" :key="val[0]"
            :class="['stack-block', index % 2 ? 'stack-block-odd' : 'stack-block-even']">
            <div class="stack-block-text" v-if="mode === 'normal'" :title="val[1].title">{{ val[1].content }}</div>
            <div class="stack-block-text" v-else :title="val[1].title" v-html="val[1].content"></div>
        </div>
        <div v-for="(val, index) in desertedValues" :key="val[0]"
            :class="['stack-block', 'stack-block-deserted', hideDeserted ? 'stack-block-hide' : '', (index) % 2 ? 'stack-block-odd' : 'stack-block-even']">
            <div class="stack-block-text" v-if="mode === 'normal'" :title="val[1].title">{{ val[1].content }}</div>
            <div class="stack-block-text" v-else :title="val[1].title" v-html="val[1].content"></div>
        </div>
        <!-- empty block -->
        <div class="stack-block stack-block-empty"></div>
    </div>
</template>
<script lang="ts">
import { defineComponent, PropType, ref } from "vue";
type StackBlockValue = { title?: string, content: string };
export default defineComponent({
    props: {
        mode: { type: String as PropType<"normal" | "html">, default: "normal" },
        color1: { type: String, required: true },
        color2: { type: String, required: true },
    },
    setup() {
        // Symbol()是为了让key唯一
        const stackValues = ref<Array<[symbol, StackBlockValue]>>([]);
        const desertedValues = ref<Array<[symbol, StackBlockValue]>>([]);

        let timeout: number | undefined = undefined;
        const hideDeserted = ref(false);
        function push(...values: Array<StackBlockValue>) {
            if (!hideDeserted.value) {
                timeout = setTimeout(() => { desertedValues.value.splice(0); }, 500);
            }
            hideDeserted.value = true;
            values.forEach(val => stackValues.value.push([Symbol(), val]));
        }

        function pop(count: number) {
            clearTimeout(timeout);
            desertedValues.value.splice(0);
            hideDeserted.value = false;
            desertedValues.value.push(...stackValues.value.splice(-count, count));
        }
        return { stackValues, desertedValues, hideDeserted, push, pop };
    },
});
</script>
<style scoped>
.parse-stack-container {
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    margin: 50px;
    width: 96px;
    height: 100px;
}

.parse-stack {
    height: 100%;
    width: 72px;
    border: 4px solid v-bind(color1);
    border-top: none;
    display: flex;
    flex-direction: column-reverse;
    text-align: center;
    overflow-y: auto;
    scrollbar-width: none;
}

.parse-stack::-webkit-scrollbar {
    display: none;
}

.stack-block {
    flex-shrink: 0;
    width: 100%;
    height: 20px;
    padding: 0 4px;
    transition: all 1s;
    animation: slide-in ease 0.4s;
    display: flex;
    align-items: center;
}

.stack-block-empty {
    height: 16px;
}

@keyframes slide-in {
    0% {
        opacity: 0;
        transform: translateY(-100%);
    }

    100% {
        transform: translateY(0);
    }
}

.stack-block-odd {
    background-color: v-bind(color1);
}

.stack-block-even {
    background-color: v-bind(color2);
}

.stack-block-deserted {
    animation: desert 0.5s ease;
    filter: grayscale(100%);
    transform: translateY(-100%);
    opacity: 0.5;
}

@keyframes desert {
    0% {
        filter: none;
        transform: none;
        opacity: 1;
    }

    100% {}
}

.stack-block-hide {
    animation: hide 0.3s ease;
    opacity: 0;
}

@keyframes hide {
    0% {
        opacity: 0.5;
    }
}

.stack-block-text {
    width: 100%;
    overflow: hidden;
    color: white;
}
</style>