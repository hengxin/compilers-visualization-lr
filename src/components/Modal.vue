<template>
    <div class="__g-modal-mask" v-show="visible"></div>
    <div class="__g-modal-wrap" v-show="visible">
        <div class="__g-modal"
            :style="{ width: width }">
            <div class="__g-modal-header">
                <button type="button"
                    class="__g-modal-close"
                    @click="close()">
                    <i class="bi bi-x"></i>
                </button>
                <slot name="header" v-if="$slots.header"></slot>
                <span class="__g-modal-title" v-else>{{ title }}</span>
            </div>
            <div class="__g-modal-body">
                <slot></slot>
            </div>
            <div class="__g-modal-footer" v-if="$slots.footer">
                <slot name="footer"></slot>
            </div>
        </div>
    </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
    props: {
        title: { type: String },
        visible: { type: Boolean, default: false },
        width: { type: String },
    },
    emits: ["update:visible", "close"],
    setup(props, ctx) {
        function close() {
            ctx.emit("update:visible", false);
            ctx.emit("close");
        }

        return { close };
    },
});
</script>
<style>
.__g-modal-mask,
.__g-modal-wrap {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 10000;
}

.__g-modal-mask {
    background-color: rgba(0, 0, 0, 0.4);
}

.__g-modal-wrap {
    overflow: auto;
}

.__g-modal {
    margin: 100px auto;
    background-color: white;
    width: fit-content;
    max-width: calc(100% - 64px);
    border-radius: 2px;
    box-shadow: 0 0 8px 2px gray;
}

.__g-modal-close {
    position: absolute;
    top: 50%;
    right: 0;
    width: 36px;
    height: 36px;
    transform: translateY(-50%);
    background-color: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    font-size: 24px;
    line-height: 36px;
    color: darkgray;
    transition: color 0.2s;
}

.__g-modal-close:hover {
    color: gray;
}

.__g-modal-header {
    position: relative;
    min-height: 36px;
    padding: 8px 36px 8px 16px;
    border-bottom: 1px solid gainsboro;
}

.__g-modal-title {
    line-height: 20px;
    font-weight: bold;
    font-size: 16px;
}

.__g-modal-body {
    padding: 8px 16px;
}

.__g-modal-footer {
    padding: 4px 16px;
    border-top: 1px solid gainsboro;
}
</style>