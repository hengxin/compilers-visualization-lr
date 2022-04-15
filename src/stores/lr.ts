import { defineStore } from "pinia";
import { ParseAlgorithm } from "@/parsers/lr"

export const useLrStore = defineStore("lr", {
    state: () => ({
        algorithm: "LR0" as ParseAlgorithm,
        currentStateId: 0,
        showControlPanel: false,
        showAutomaton: false,
        showParseTable: false,
    }),
    actions: {
        SetAlgorithm(payload: ParseAlgorithm) {
            this.algorithm = payload;
        },
        SetCurrentStateId(payload: number) {
            this.currentStateId = payload
        },
        SetShowControlPanel(payload: boolean) {
            this.showControlPanel = payload;
        },
        SetShowAutomaton(payload: boolean) {
            this.showAutomaton = payload;
        },
        SetShowParseTable(payload: boolean) {
            this.showParseTable = payload;
        },
    },
});