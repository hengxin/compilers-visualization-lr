<template>
    <div class="parse-stack">
        <div v-for="(val, index) in stackValues" :key="val[0]"
            :class="['stack-block', index % 2 ? 'stack-block-odd' : 'stack-block-even']">
            <div class="stack-block-inner"
                :ref="(el) => handleUpdateBlock(val[0], el as (HTMLDivElement | null))">
                <div class="stack-block-text" v-if="mode === 'normal'" :title="val[1].title">{{ val[1].content }}</div>
                <div class="stack-block-text" v-else :title="val[1].title" v-html="val[1].content"></div>
            </div>
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
import { defineComponent, nextTick, PropType, ref } from "vue";
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
                timeout = window.setTimeout(() => { desertedValues.value.splice(0); }, 500);
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

        // blockInner横向溢出，自动滚动动画
        const blockInnerDataMap: Map<symbol, [HTMLDivElement, number | undefined]> = new Map();
        async function handleUpdateBlock(key: symbol, el: HTMLDivElement | null) {
            if (el === null) {
                const blockInnerData = blockInnerDataMap.get(key);
                if (blockInnerData) {
                    clearInterval(blockInnerData[1]);
                    blockInnerDataMap.delete(key);
                }
                return;
            }
            let stackBlockRef = blockInnerDataMap.get(key);
            if (stackBlockRef !== undefined) {
                return;
            }
            await nextTick();
            const d = (el.firstElementChild as HTMLDivElement).offsetWidth - el.offsetWidth;
            const roll = function(moveEl: HTMLDivElement, delta: number) {
                let step = 0;
                const pause = 15;
                return function() {
                    if (step >= pause + (delta + 1) + pause + (delta + 1)) {
                        step = 0;
                    }

                    if (step < pause) {
                        // do nothing
                    } else if (step < pause + (delta + 1)) {
                        moveEl.style.transform = "translateX(-" + (step - pause) + "px)";
                    } else if (step < pause + (delta + 1) + pause) {
                        // do nothing
                    } else if (step < pause + (delta + 1) + pause + (delta + 1)) {
                        moveEl.style.transform = "translateX(-" + (pause + (delta + 1) + pause + (delta + 1) - step - 1) + "px)";
                    }
                    step++;
                }
            }
            if (d > 0) {
                const intervalId = window.setInterval(roll((el.firstElementChild as HTMLDivElement), d), 80);
                blockInnerDataMap.set(key, [el, intervalId]);
            }
        }
        return { stackValues, desertedValues, hideDeserted, push, pop, handleUpdateBlock };
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

.stack-block-inner {
    overflow: hidden;
    width: 100%;
}

.stack-block-text {
    width: fit-content;
    margin: 0 auto;
    color: white;
}
</style>