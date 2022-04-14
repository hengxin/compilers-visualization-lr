<template>
    <div
        :id="id"
        class="g-notification"
        ref="notification"
        :class="active ? 'notification-active' : ''"
        :style="{ top: verticalOffset + 'px' }"
        @mouseenter="stopTimer"
        @mouseleave="startTimer"
    >
        <div
            :class="[
                'notification-type-' + type,
                'notification-inner'
            ]"
        >
            <div class="notification-title">{{title}}</div>
            <div class="notification-content">{{content}}</div>
        </div>
    </div>
</template>
<script lang="ts">
import { defineComponent, onMounted, PropType, ref } from "vue";
import { NotificationType } from "./notification";
const props = {
    title: String,
    content: String,
    type: { type: String as PropType<NotificationType>, default: "primary" },
    verticalOffset: { type: Number, default: 60 },
    duration: { type: Number, default: 4000 },
    id: { type: String, required: true },
}
export default defineComponent({
    props,
    setup(props, ctx) {
        const notification = ref<HTMLDivElement>();
        const active = ref(false);
        let timer: number | undefined = undefined;
        function startTimer() {
            timer = setTimeout(() => { active.value = false; }, props.duration);
        }
        function stopTimer() {
            clearTimeout(timer);
            timer = undefined;
        }
        onMounted(() => {
            notification.value?.addEventListener('transitionend', () => {
                if (active.value === false) {
                    ctx.emit("destroy", props.id);
                }
            });
            startTimer();
            // TODO 用settimeout解决弹入通知没有动画的问题
            setTimeout(() => { active.value = true; }, 0);
        });
        return {
            active, notification,
            startTimer, stopTimer
        }
    }
});
</script>
<style scoped>
.g-notification {
    width: fit-content;
    max-width: 400px;
    min-width: 250px;
    background-color: white;
    position: fixed;
    right: -400px;
    transition: right 0.5s, top 0.5s;
}
.notification-active {
    right: 16px;
}
.notification-inner {
    padding: 8px;
    max-height: 400px;
    overflow-y: scroll;
}
.notification-type-primary {
    background-color: var(--color-primary-light);
    color: var(--color-primary);
    border: 2px var(--color-primary) solid;
}
.notification-type-success {
    background-color: var(--color-success-light);
    color: var(--color-success);
    border: 2px var(--color-success) solid;
}
.notification-type-warning {
    background-color: var(--color-warning-light);
    color: var(--color-warning);
    border: 2px var(--color-warning) solid;
}
.notification-type-error {
    background-color: var(--color-error-light);
    color: var(--color-error);
    border: 2px var(--color-error) solid;
}
.notification-type-info {
    background-color: var(--color-info-light);
    color: var(--color-info);
    border: 2px var(--color-info) solid;
}
.notification-title {
    font-weight: bold;
}
</style>