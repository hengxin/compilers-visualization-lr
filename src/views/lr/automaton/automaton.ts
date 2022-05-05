import { LRItemSet, _Symbol } from "@/parsers/lr"

type StateItemHighlight = "normal" | "gold" | "green" | "brown";
interface StateItemData {
    state: LRItemSet,
    // StateItem的位置
    top: number,
    left: number,
    column: number,
    linesIn: Array<number>,
    linesToRight: Array<number>,
    linesToLeft: Array<number>,
    linesToSameColumn: Array<number>,
    linesToSelf: Array<number>
    hidden: boolean,
    merged: boolean,
    highlight: StateItemHighlight,
}

type LineBlockType = "Right" | "Left" | "Self" | "SameColumn";
type LineBlockHighlight = "normal" | "green" | "brown";
interface LineBlockData {
    id: number,
    symbol: _Symbol,
    from: number,
    to: number,
    type: LineBlockType,
    points: Array<[number, number]>,
    hidden: boolean,
    highlight: LineBlockHighlight,
}

interface ColumnData {
    stateIds: Array<number>,
    // 不需要top，因为肯定是0
    left: number,
    height: number,
    width: number,

    linesPassByRight: Array<number>,
    linesPassByLeft: Array<number>,
    linesPassByBottom: Array<number>,
}

export { 
    type StateItemHighlight, type StateItemData,
    type LineBlockType, type LineBlockHighlight, type LineBlockData,
    type ColumnData,
};