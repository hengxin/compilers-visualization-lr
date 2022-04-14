import { Module, MutationTree } from "vuex";
import { RootState } from ".";
import { ParserType } from "@/parsers/lr"
export interface LrStoreState {
    algorithm: ParserType,
    showAutomaton: boolean,
    showParseTable: boolean,
}
const state: LrStoreState = {
    algorithm: "LR0",
    showAutomaton: false,
    showParseTable: false,
}
const mutations: MutationTree<LrStoreState> = {
    setAlgorithm(state, payload: ParserType) {
        state.algorithm = payload;
    },
    setShowAutomaton(state, payload: boolean) {
        state.showAutomaton = payload;
    },
    setShowParseTable(state, payload: boolean) {
        state.showParseTable = payload;
    },
}
const lrStore: Module<LrStoreState, RootState> = {
    namespaced: true,
    state,
    mutations,
};
export default lrStore;