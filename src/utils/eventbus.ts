interface ICallbackList {
    [id: string]: Function;
}
interface IEventBusModule {
    [eventName: string]: ICallbackList;
}
interface IEventBus {
    [moduleName: string]: IEventBusModule;
}

const _eventBus: IEventBus = {};
let _callbackId = 0;
const EventBus = {
    async publish(moduleName: string, eventName: string, ...args: any[]) {
        console.log("PUBLISH: " + moduleName + "/" + eventName);
        const module = _eventBus[moduleName];
        if (!module) {
            return;
        }
        const callbackList = module[eventName];
        if (!callbackList) {
            return;
        }
        let promises = [];
        for (let id in callbackList) {
            promises.push(callbackList[id](...args));
        }
        return Promise.all(promises);
    },
    subscribe(moduleName: string, eventName: string, callback: Function) {
        if (!_eventBus[moduleName]) {
            _eventBus[moduleName] = {}
        }
        const module = _eventBus[moduleName];
        if (!module[eventName]) {
            module[eventName] = {}
        }
        const eventListObj = module[eventName];
        const id = _callbackId++;
        eventListObj[id] = callback;
        function unSubscribe() {
            delete eventListObj[id];
            if (Object.keys(eventListObj).length === 0) {
                delete module[eventName];
            }
        }

        return unSubscribe;
    }
};

export default EventBus;