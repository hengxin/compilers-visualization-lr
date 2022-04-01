<script lang="ts">
import { defineComponent, PropType, h } from "vue";
import { LRItem } from "@/parsers/lr";

export default defineComponent({
    props: { lrItem: { type: Object as PropType<LRItem>, required: true } },
    setup(props, ctx) {
        const lrItem: LRItem = props.lrItem;
        let renderData: Array<{ value: string, class: string }> = [];
        lrItem.rule.expansion.forEach((sym) => {
            renderData.push({ value: sym.name, class: "lr-item-symbol " + (sym.isTerm ? "terminal" : "non-terminal") });
        });
        renderData.splice(lrItem.index, 0, { value: "·", class: "lr-item-dot" });
        let lookahead = Array.from(lrItem.lookahead);
        if (lookahead.length > 0) {
            renderData.push({ value: ",", class: "lr-item-comma" });
            renderData.push({ value: lookahead[0].name, class: "lr-item-lookahead" });
            for (let i = 1; i < lookahead.length; i++) {
                renderData.push({ value: "/", class: "lr-item-lookahead-sep" });
                renderData.push({ value: lookahead[i].name, class: "lr-item-lookahead" });
            }
        }
        // 之前都是在renderData里面直接填h(...)，但是发现标签内没有data-xxxx属性导致scoped无效
        // 所以renderdata里只填数据，在return时map到h(...)
        return () => h("div", { class: "lr-item" }, [
            h("span", { class: "lr-item-symbol non-terminal" }, lrItem.rule.origin.name),
            h("span", { class: "lr-item-arrow" }, "→"),
            ...renderData.map((r) => h("span", { class: r.class }, r.value)),
        ]);
    }
});
</script>
<style scoped>
.lr-item-symbol,
.lr-item-dot {
    margin: 0 2px;
}

.lr-item-arrow {
    margin: 0 4px;
}
.terminal {
    font-family: "Times New Roman";
}
.non-terminal,
.lr-item-arrow,
.lr-item-dot,
.lr-item-comma,
.lr-item-lookahead-sep {
    font-family: "Cambria Math";
}
</style>