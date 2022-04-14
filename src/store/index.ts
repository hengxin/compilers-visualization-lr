import { InjectionKey } from "vue";
import { createStore, useStore as baseUseStore, Store } from "vuex";
import lr, { LrStoreState } from "./lr";
export interface RootState { }
export interface AllState extends RootState {
    lr: LrStoreState;
}
export const store = createStore<RootState>({
    modules: {
        lr
    },
});
export const key: InjectionKey<Store<AllState>> = Symbol();
export function useStore() {
    return baseUseStore(key);
}