import { defineStore } from "pinia";
import { ParseAlgorithm } from "@/parsers/lr"

interface IStateFlagList {
    [propName: number]: {
        active: boolean,
        closureDone: boolean,
        appended: boolean,
    }
}

export const useLrStore = defineStore("lr", {
    state: () => ({
        manual: false,
        algorithm: "LR0" as ParseAlgorithm,
        currentStateId: 0,
        showControlPanel: false,
        showAutomaton: false,
        showParseTable: false,
        showParseTree: false,
        stateFlags: {
            0: { active: true, closureDone: false, appended: false }
        } as IStateFlagList,
        automatonLoading: false,
    }),
});