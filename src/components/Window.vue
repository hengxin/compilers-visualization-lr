<template>
    <div class="__g-window" ref="windowRef"
        :style="state.maximized ? { top: 0, bottom: 0, left: 0, right: 0, position: 'fixed', zIndex: state.zIndex } :
        (state.pinned ? (state.minimized ? {...defaultStyle, height: '28px'} : defaultStyle) :
        { width: state.width, height: state.minimized ? '28px' : state.height, top: state.top, left: state.left,
            position, zIndex: state.zIndex, boxShadow: '0 0 8px gray' })">
        <div class="__g-window-bar" ref="barRef">
            <span class="__g-window-bar-title">{{ title }}</span>
            <span class="__g-window-bar-button" ref="minimizeBtn" @click="changeMinimized()">
                <img v-show="!state.minimized" width="16" height="16" src="./icons/minus.svg" alt="min">
                <img v-show="state.minimized" width="16" height="16" src="./icons/switcher.svg" alt="min">
            </span>
            <span class="__g-window-bar-button" ref="maximizeBtn" @click="changeMaximized()">
                <img v-show="!state.maximized" width="16" height="16" src="./icons/border.svg" alt="max">
                <img v-show="state.maximized" width="16" height="16" src="./icons/switcher.svg" alt="max">
            </span>
            <span class="__g-window-bar-button" ref="pinBtn" @click="changePinned()">
                <img v-show="!state.maximized" width="16" height="16" src="./icons/pushpin.svg" alt="pin"
                :style="state.pinned ? {} : {transform: 'rotate(-45deg)'}">
            </span>
        </div>
        <div class="__g-window-inner" ref="innerRef">
            <slot></slot>
        </div>
        <div class="__g-window-resize-area-n" ref="resizeAreaN" v-show="!state.pinned && !state.minimized && !state.maximized"></div>
        <div class="__g-window-resize-area-s" ref="resizeAreaS" v-show="!state.pinned && !state.minimized && !state.maximized"></div>
        <div class="__g-window-resize-area-e" ref="resizeAreaE" v-show="!state.pinned && !state.maximized"
            :style="state.minimized ? { top: 0, bottom: 0 } : {}"></div>
        <div class="__g-window-resize-area-w" ref="resizeAreaW" v-show="!state.pinned && !state.maximized"
            :style="state.minimized ? { top: 0, bottom: 0 } : {}"></div>
        <div class="__g-window-resize-area-ne" ref="resizeAreaNE" v-show="!state.pinned && !state.minimized && !state.maximized"></div>
        <div class="__g-window-resize-area-nw" ref="resizeAreaNW" v-show="!state.pinned && !state.minimized && !state.maximized"></div>
        <div class="__g-window-resize-area-se" ref="resizeAreaSE" v-show="!state.pinned && !state.minimized && !state.maximized"></div>
        <div class="__g-window-resize-area-sw" ref="resizeAreaSW" v-show="!state.pinned && !state.minimized && !state.maximized"></div>
    </div>
</template>
<script setup lang="ts">
import { getCurrentInstance, nextTick, onMounted, onUnmounted, PropType, reactive, ref, StyleValue } from 'vue';
import { registerWindowInstance, unregisterWindowInstance, getNewZIndex } from "./window";

type PositionType = "fixed" | "absolute";
const props = defineProps({
    title: { type: String, required: true },
    defaultStyle: { type: Object as PropType<StyleValue> },
    position: { type: String as PropType<PositionType>, default: "fixed" },
});
const windowRef = ref<HTMLDivElement>();
const barRef = ref<HTMLDivElement>();
const innerRef = ref<HTMLDivElement>();
const minimizeBtn = ref<HTMLDivElement>();
const maximizeBtn = ref<HTMLDivElement>();
const pinBtn = ref<HTMLDivElement>();
const resizeAreaN = ref<HTMLDivElement>();
const resizeAreaS = ref<HTMLDivElement>();
const resizeAreaE = ref<HTMLDivElement>();
const resizeAreaW = ref<HTMLDivElement>();
const resizeAreaNE = ref<HTMLDivElement>();
const resizeAreaNW = ref<HTMLDivElement>();
const resizeAreaSE = ref<HTMLDivElement>();
const resizeAreaSW = ref<HTMLDivElement>();
const MIN_SIZE = 300;

const internalInstance = getCurrentInstance();
const [windowId, zIndex] = registerWindowInstance(internalInstance!);
onMounted(() => {
    windowRef.value?.addEventListener("mousedown", refreshZIndex);
    barRef.value?.addEventListener("mousedown", startDrag);
    // 两个按钮阻止冒泡，是为了防止触发startDrag。
    minimizeBtn.value?.addEventListener("mousedown", ev => ev.stopPropagation());
    maximizeBtn.value?.addEventListener("mousedown", ev => ev.stopPropagation());
    pinBtn.value?.addEventListener("mousedown", ev => ev.stopPropagation());
    /** 
     * 仅需添加mousedown事件，
     * 对应mousemove、mouseup的操作在resizeAreaTouch中被添加到document上。
     * 如果mousemove、mouseup的操作也添加的windowRef上，则鼠标拽到元素外就会失效。
     */
    resizeAreaN.value?.addEventListener("mousedown", (ev) => resizeAreaTouch(ev, "n"));
    resizeAreaS.value?.addEventListener("mousedown", (ev) => resizeAreaTouch(ev, "s"));
    resizeAreaE.value?.addEventListener("mousedown", (ev) => resizeAreaTouch(ev, "e"));
    resizeAreaW.value?.addEventListener("mousedown", (ev) => resizeAreaTouch(ev, "w"));
    resizeAreaNE.value?.addEventListener("mousedown", (ev) => resizeAreaTouch(ev, "ne"));
    resizeAreaNW.value?.addEventListener("mousedown", (ev) => resizeAreaTouch(ev, "nw"));
    resizeAreaSE.value?.addEventListener("mousedown", (ev) => resizeAreaTouch(ev, "se"));
    resizeAreaSW.value?.addEventListener("mousedown", (ev) => resizeAreaTouch(ev, "sw"));
});
onUnmounted(() => {
    unregisterWindowInstance(windowId);
});

type Direction = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | "";
const state = reactive({
    pinned: true,
    minimized: false,
    maximized: false,
    left: "",
    top: "",
    width: "",
    height: "",
    zIndex: zIndex,
});
const mem = {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    inited: false,
}
const mouseState = {
    clickX: 0,
    clickY: 0,
    direction: "" as Direction,
};

function refreshZIndex() {
    if (state.pinned) return;
    state.zIndex = getNewZIndex(state.zIndex);
}

function changeMinimized() {
    state.minimized = !state.minimized;
    if (state.maximized) {
        state.maximized = false;
    }
    refreshZIndex();
}

function changeMaximized() {
    state.maximized = !state.maximized;
    if (state.minimized) {
        state.minimized = false;
    }
    if (!state.maximized) {
        avoidOutOfBound();
    }
    refreshZIndex();
}

function changePinned() {
    let newPinnedState = !state.pinned;
    if (newPinnedState) {
        // 固定（恢复文档流）
    } else {
        // 取消固定（脱离文档流）
        if (!mem.inited) {
            let left = windowRef.value!.offsetLeft;
            let top = windowRef.value!.offsetTop;
            if (props.position === "fixed") {
                let current = windowRef.value!.offsetParent as HTMLElement;
                while (current) {
                    left += current.offsetLeft;
                    top += current.offsetTop;
                    current = current.offsetParent as HTMLElement;
                }
            }
            mem.left = left;
            mem.top = top;
            mem.width = windowRef.value!.offsetWidth;
            mem.height = windowRef.value!.offsetHeight;
        }
        state.left = mem.left + "px";
        state.top = mem.top + "px";
        state.width = mem.width + "px";
        state.height = mem.height + "px";
    }
    state.pinned = newPinnedState;
    nextTick(() => {
        avoidOutOfBound();
    });
    refreshZIndex();
}

function mousedown(ev: MouseEvent) {
    mouseState.clickX = ev.pageX;
    mouseState.clickY = ev.pageY;
    mem.inited = true;
    mem.left = windowRef.value!.offsetLeft;
    mem.top = windowRef.value!.offsetTop;
    mem.width = windowRef.value!.offsetWidth;
    if (!state.minimized) {
        mem.height = windowRef.value!.offsetHeight;
    }
}

function mouseup() {
    mem.left = windowRef.value!.offsetLeft;
    mem.top = windowRef.value!.offsetTop;
    mem.width = windowRef.value!.offsetWidth;
    if (!state.minimized) {
        mem.height = windowRef.value!.offsetHeight;
    }
    document.removeEventListener("mousemove", drag);
    document.removeEventListener("mousemove", resize);
    document.removeEventListener("mouseup", mouseup);
}

function startDrag(ev: MouseEvent) {
    if (state.pinned || state.maximized) return;
    mousedown(ev);
    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", mouseup);
}

function drag(ev: MouseEvent) {
    const [distanceX, distanceY] = [ev.pageX - mouseState.clickX, ev.pageY - mouseState.clickY];
    state.left = (mem.left + distanceX) + "px";
    state.top = (mem.top + distanceY) + "px";
}

function resizeAreaTouch(ev: MouseEvent, direction: Direction) {
    if (state.pinned) return;
    ev.preventDefault();
    mousedown(ev);
    mouseState.direction = direction;
    document.addEventListener("mousemove", resize);
    document.addEventListener("mouseup", mouseup);
}

function resize(ev: MouseEvent) {
    if (mouseState.direction === "") return;
    const [distanceX, distanceY] = [ev.pageX - mouseState.clickX, ev.pageY - mouseState.clickY];
    const n = () => {
        if (mem.height - distanceY < MIN_SIZE) return;
        state.height = (mem.height - distanceY) + "px";
        state.top = (mem.top + distanceY) + "px";
    }
    const s = () => {
        if (mem.height + distanceY < MIN_SIZE) return;
        state.height = (mem.height + distanceY) + "px";
    }
    const w = () => {
        if (mem.width - distanceX < MIN_SIZE) return;
        state.width = (mem.width - distanceX) + "px";
        state.left = (mem.left + distanceX) + "px";
    }
    const e = () => {
        if (mem.width + distanceX < MIN_SIZE) return;
        state.width = (mem.width + distanceX) + "px";
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
function avoidOutOfBound() {
    if (state.pinned || state.maximized || props.position === "absolute") return;
    console.log(window.innerHeight);
    if (mem.top >= window.innerHeight - 200) {
        mem.top = window.innerHeight - 200;
    }
    if (mem.left >= window.innerHeight - 200) {
        mem.left = window.innerHeight - 200;
    }
    state.top = mem.top + "px";
    state.left = mem.left + "px";
}
defineExpose({ avoidOutOfBound });
</script>
<style>
.__g-window {
    z-index: 0;
    border: 2px var(--color-klein-blue) solid;
    position: relative;
    background-color: white;
}

.__g-window-bar {
    width: 100%;
    height: 24px;
    background-color: var(--color-klein-blue);
    font-size: 12px;
    padding: 4px 8px;
    color: white;
    display: flex;
    user-select: none;
}

.__g-window-bar-title {
    font-size: 12px;
    font-weight: bold;
    flex-grow: 1;
}

.__g-window-bar-button {
    cursor: pointer;
    margin-left: 8px;
    flex-shrink: 0;
}

.__g-window-inner {
    width: 100%;
    height: calc(100% - 24px);
    overflow: auto;
}

.__g-window-resize-area-n {
    position: absolute;
    cursor: n-resize;
    top: 0;
    left: 6px;
    right: 6px;
    height: 6px;
}

.__g-window-resize-area-s {
    position: absolute;
    cursor: s-resize;
    bottom: 0;
    left: 6px;
    right: 6px;
    height: 6px;
}

.__g-window-resize-area-e {
    position: absolute;
    cursor: e-resize;
    right: 0;
    top: 6px;
    bottom: 6px;
    width: 6px;
}

.__g-window-resize-area-w {
    position: absolute;
    cursor: w-resize;
    left: 0;
    top: 6px;
    bottom: 6px;
    width: 6px;
}

.__g-window-resize-area-ne {
    position: absolute;
    cursor: ne-resize;
    top: 0;
    right: 0;
    width: 6px;
    height: 6px;
}

.__g-window-resize-area-nw {
    position: absolute;
    cursor: nw-resize;
    top: 0;
    left: 0;
    width: 6px;
    height: 6px;
}

.__g-window-resize-area-se {
    position: absolute;
    cursor: se-resize;
    bottom: 0;
    right: 0;
    width: 6px;
    height: 6px;
}

.__g-window-resize-area-sw {
    position: absolute;
    cursor: sw-resize;
    bottom: 0;
    left: 0;
    width: 6px;
    height: 6px;
}
</style>