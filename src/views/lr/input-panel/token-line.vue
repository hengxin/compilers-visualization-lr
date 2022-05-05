<template>
    <div class="token-line" :class="[wrap ? 'token-line-wrap' : '']">
        <span class="token-line-no">{{ lineNo }}</span>
        <div class="token-line-item" :class="[wrap ? 'token-line-item-wrap' : '']">
            <div
                class="token-tag"
                v-for="tag in tagList"
                :style="tag.active ? { backgroundColor: tag.color[0], color: tag.color[1], borderColor: tag.color[1] } :
                    { backgroundColor: inactiveColor[0], color: inactiveColor[1], borderColor: inactiveColor[1] }"
            >
                <span :class="tag.token.symbol.isTerm ? 'terminal' : 'non-terminal'">{{ tag.token.symbol.name }}</span>
                <template v-if="tag.token.symbol.name !== tag.token.value">
                    <span>(</span>
                    <span class="non-terminal">{{ tag.token.value }}</span>
                    <span>)</span>
                </template>
            </div>
        </div>
    </div>
</template>
<script lang="ts">
import { Token } from "@/parsers/lr";
import { defineComponent, PropType, ref } from "vue";
import { TokenTagData, inactiveColor, getColorPair } from "./token-tag";
const props = {
    tokenLine: { type: Array as PropType<Array<Token>>, required: true, default: [] },
    lineNo: { type: Number, required: true },
    wrap: { type: Boolean, default: false },
}
export default defineComponent({
    props,
    setup(props, ctx) {
        const tagList = ref<Array<TokenTagData>>([]);
        props.tokenLine.forEach((token) => {
            let colorPair = getColorPair(token);
            let tagData: TokenTagData = { token, active: true, color: colorPair };
            tagList.value.push(tagData);
        });

        return { tagList, inactiveColor };
    }
});
</script>
<style scoped>
.token-line {
    font-size: 12px;
    display: flex;
    flex-direction: row;
    align-items: center;
    background-color: whitesmoke;
    padding: 4px 4px 2px 4px;
}
.token-line-no {
    font-size: small;
    margin-right: 4px;
    color: var(--color-klein-blue);
}
.token-line-item {
    display: flex;
    flex-direction: row;
}

.token-line-wrap {
    align-items: flex-start;
}

.token-line-item-wrap {
    flex-wrap: wrap;
}

.token-tag {
    flex-basis: 0;
    text-align: center;
    margin: 0 4px 2px 0;
    padding: 0 4px;
    border-radius: 4px;
    border-width: 1px;
    border-style: solid;
}
/* .token-tag-sm {
    font-style: italic;
    font-weight: normal;
} */
</style>