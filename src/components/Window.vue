<template>
    <div class="__g-window" ref="windowRef">
        <div class="__g-window-bar" ref="barRef">
            <span class="__g-window-bar-title">{{ title }}</span>
            <span class="__g-window-bar-button">minimize</span>
            <span class="__g-window-bar-button" @click="changePinned()">pin</span>
        </div>
        <div class="__g-window-inner">
            <slot></slot>
        </div>
    </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';

const props = defineProps<{ title: string }>();

const state = {
    pinned: true,
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    inited: false,
};

function changePinned() {
    let newPinnedState = !state.pinned;
    if (newPinnedState) {
        // 固定（恢复文档流）
        windowRef.value!.removeAttribute("style");
        windowRef.value!.onmousemove = null;
        windowRef.value!.onmousedown = null;
        barRef.value!.onmousedown = null;
        document.onmousemove = null;
        document.onmouseup = null;
    } else {
        // 取消固定（脱离文档流）
        if (!state.inited) {
            let left = windowRef.value!.offsetLeft;
            let top = windowRef.value!.offsetTop;
            let current = windowRef.value!.offsetParent as HTMLElement;
            while (current) {
                left += current.offsetLeft;
                top += current.offsetTop;
                current = current.offsetParent as HTMLElement;
            }
            state.left = left;
            state.top = top;
            state.width = windowRef.value!.offsetWidth;
            state.height = windowRef.value!.offsetHeight;
        }
        console.log(state);
        windowRef.value!.style.left = state.left + "px";
        windowRef.value!.style.top = state.top + "px";
        windowRef.value!.style.width = state.width + "px";
        windowRef.value!.style.height = state.height + "px";
        windowRef.value!.style.position = "fixed";
        windowRef.value!.onmousemove = changeCursor;
        /** 
         * 仅需给windowRef添加mousedown事件，
         * 对应mousemove、mouseup的操作在startResize中被添加到document上。
         * 如果mousemove、mouseup的操作也添加的windowRef上，则鼠标拽到元素外就会失效。
         */
        windowRef.value!.onmousedown = startResize;
        barRef.value!.onmousedown = startDrag;
    }
    state.pinned = newPinnedState;
}

const windowRef = ref<HTMLDivElement>();
const barRef = ref<HTMLDivElement>();
const mouseState = {
    clickX: 0,
    clickY: 0,
    direction: "",
};
const MARGIN = 8;
const MIN_SIZE = 200;

function mousedown(ev: MouseEvent) {
    mouseState.clickX = ev.pageX;
    mouseState.clickY = ev.pageY;
    mouseState.direction = getCursorDirection(ev);
    state.inited = true;
    state.left = windowRef.value!.offsetLeft;
    state.top = windowRef.value!.offsetTop;
    state.width = windowRef.value!.offsetWidth;
    state.height = windowRef.value!.offsetHeight;
}

function mouseup() {
    state.left = windowRef.value!.offsetLeft;
    state.top = windowRef.value!.offsetTop;
    state.width = windowRef.value!.offsetWidth;
    state.height = windowRef.value!.offsetHeight;
    document.onmousemove = null;
    document.onmouseup = null;
}

function startDrag(ev: MouseEvent) {
    mousedown(ev);
    document.onmousemove = drag;
    document.onmouseup = mouseup;
}

function drag(ev: MouseEvent) {
    const [distanceX, distanceY] = [ev.pageX - mouseState.clickX, ev.pageY - mouseState.clickY];
    windowRef.value!.style.left = (state.left + distanceX) + "px";
    windowRef.value!.style.top = (state.top + distanceY) + "px";
}

function getCursorDirection(ev: MouseEvent): string {
    const pointerX = ev.offsetX;
    const pointerY = ev.offsetY;
    let dir = "";
    if (pointerY < MARGIN) {
        dir += "n";
    } else if (pointerY > (ev.target as HTMLElement).offsetHeight - MARGIN) {
        dir += "s";
    }
    if (pointerX < MARGIN) {
        dir += "w";
    } else if (pointerX > (ev.target as HTMLElement).offsetWidth - MARGIN) {
        dir += "e";
    }
    return dir;
}

function changeCursor(ev: MouseEvent) {
    windowRef.value!.style.cursor = "auto";
    let direction = getCursorDirection(ev);
    windowRef.value!.style.cursor = direction === "" ? "auto" : direction + "-resize";
}

function startResize(ev: MouseEvent) {
    mousedown(ev);
    document.onmousemove = resize;
    document.onmouseup = mouseup;
}

function resize(ev: MouseEvent) {
    if (mouseState.direction === "") return;
    const [distanceX, distanceY] = [ev.pageX - mouseState.clickX, ev.pageY - mouseState.clickY];
    const n = () => {
        windowRef.value!.style.height = (Math.max(state.height - distanceY, MIN_SIZE)) + "px";
        windowRef.value!.style.top = (state.top + distanceY) + "px";
    }
    const s = () => {
        windowRef.value!.style.height = (Math.max(state.height + distanceY, MIN_SIZE)) + "px";
    }
    const w = () => {
        windowRef.value!.style.width = (Math.max(state.width - distanceX, MIN_SIZE)) + "px";
        windowRef.value!.style.left = (state.left + distanceX) + "px";
    }
    const e = () => {
        windowRef.value!.style.width = (Math.max(state.width + distanceX, MIN_SIZE)) + "px";
    }
    if (mouseState.direction === "e") { e(); }
    else if (mouseState.direction === "ne") { n(); e(); }
    else if (mouseState.direction === "nw") { n(); w(); }
    else if (mouseState.direction === "n") { n(); }
    else if (mouseState.direction === "se") { s(); e(); }
    else if (mouseState.direction === "sw") { s(); w(); }
    else if (mouseState.direction === "s") { s(); }
    else if (mouseState.direction === "w") { w(); }
}
</script>
<style>
.__g-window {
    overflow: auto;
    z-index: 10;
    border: 2px var(--color-klein-blue) solid;
}

.__g-window-bar {
    width: 100%;
    height: 16px;
    background-color: var(--color-klein-blue);
    font-size: 12px;
    padding: 0 4px;
    color: white;
}

.__g-window-bar-title {
    font-size: 12px;
    font-weight: bold;
}

.__g-window-bar-button {
    cursor: pointer;
}

.__g-window-inner {
    width: 100%;
    height: calc(100% - 16px);
    overflow: auto;
}
</style>