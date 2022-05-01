import { ComponentInternalInstance } from "vue"
const windowInstances: Map<symbol, ComponentInternalInstance> = new Map();
let maxZIndex = 0;
function registerWindowInstance(instance: ComponentInternalInstance): [symbol, number] {
    const id = Symbol();
    windowInstances.set(id, instance);
    maxZIndex++;
    return [id, maxZIndex];
}

function unregisterWindowInstance(id: symbol) {
    windowInstances.delete(id);
}

window.addEventListener("resize", handleWindowResize);
// 这个window是浏览器的window，不是window组件。
function handleWindowResize() {
    windowInstances.forEach(instance => instance.exposed!.avoidOutOfBound());
}

function getNewZIndex(currentZIndex: number) {
    if (currentZIndex === maxZIndex) {
        return currentZIndex;
    }
    maxZIndex++;
    return maxZIndex;
}

export { registerWindowInstance, unregisterWindowInstance, getNewZIndex };