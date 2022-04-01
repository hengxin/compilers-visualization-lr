import { createVNode, render, VNode } from "vue";
import Notification from "./Notification.vue"

type NotificationType = "primary" | "success" | "warning" | "error" | "info";
interface NotificationParam {
    title: string,
    content: string,
    type: NotificationType,
    duration?: number,
}
const notifications: Array<VNode> = [];
const GAP_SIZE = 16;
const VERTICAL_TOP = 60;
let seed = 1;
function notify(param: NotificationParam) {
    let verticalOffset = VERTICAL_TOP;
    notifications.forEach((vm) => {
        verticalOffset += (vm.el?.offsetHeight || 0) + GAP_SIZE
    });

    const container = document.createElement('div');
    function onDestroy(id: string) {
        let idx = notifications.findIndex((vm) => vm.component?.props.id === id);
        if (idx === -1) {
            return;
        }
        let vm = notifications[idx];
        let removedHeight: number = vm.el?.offsetHeight || 0;
        notifications.splice(idx, 1);
        for (let i = idx; i < notifications.length; i++) {
            let pos = Number.parseInt(notifications[i].el!.style.top, 10) - removedHeight - GAP_SIZE;
            notifications[i].component!.props.verticalOffset = pos;
        }
        render(null, container);
    }

    let appendTo = document.body;
    const props = {
        title: param.title,
        content: param.content,
        type: param.type,
        verticalOffset,
        id: `g-notification_${seed++}`,
        onDestroy,
    }
    const vm = createVNode(Notification, props);

    render(vm, container);
    appendTo.appendChild(container.firstElementChild!);
    notifications.push(vm);
}

export { NotificationType, notify };