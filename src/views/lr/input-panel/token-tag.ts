import { Token } from "@/parsers/lr";
type ColorPair = [string, string];
interface TokenTagData {
    token: Token,
    active: boolean,
    color: ColorPair
}
const colors: Array<ColorPair> = [
    ["#f1f3ef", "#a81e32"], ["#fdf2f7", "#e77671"], ["#acbeac", "#e94829"], ["#fcf6e8", "#e6653a"],
    ["#f0ecea", "#d05667"], ["#fef5f5", "#962832"], ["#f4f8e9", "#e31b13"], ["#f2f4fa", "#22406a"],
    ["#a1d4bd", "#382c77"], ["#ccccb8", "#004ea2"], ["#e6efc3", "#137fa0"], ["#fdece9", "#a1d4bd"],
    ["#f2f0eb", "#758e61"], ["#faf8d0", "#62be9d"], ["#faf6b7", "#47b897"], ["#eff8fe", "#a8cd34"],
    ["#fcefe8", "#21a675"], ["#ffed95", "#c36625"], ["#fdf8f0", "#eab946"], ["#f5fbfe", "#4e606c"],
    ["#bacac6", "#3f545b"], ["#c8d0d2", "#655756"], ["#f9f9fb", "#382f41"], ["#dedcdf", "#370708"],
    ["#dae5f5", "#874154"], ["#efc5b4", "#564163"], ["#eef0f1", "#c1a1ca"], ["#fff8d9", "#5c1028"],
    ["#fce1d6", "#aaa1ce"],
]
const inactiveColor: ColorPair = ["#f5f5f5", "#d3d3d3"]

function hash(str: string): number {
    let hash = 1315423911;
    for (let i = str.length - 1; i >= 0; i--) {
        let ch = str.charCodeAt(i);
        hash ^= ((hash << 5) + ch + (hash >> 2));
    }
    return (hash & 0x7FFFFFFF);
}

const colorMap: Map<string, ColorPair> = new Map();
let idx = 0;
function getColorPair(token: Token): ColorPair {
    let colorPair = colorMap.get(token.type);
    if (colorPair !== undefined) {
        return colorPair;
    }
    colorPair = colors[idx % colors.length];
    idx++;
    colorMap.set(token.type, colorPair);
    return colorPair;
}

export { type TokenTagData, inactiveColor, type ColorPair, getColorPair };