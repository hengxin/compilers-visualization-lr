<template>
    <div class="parse-tree-container">
        <div ref="chartRef"></div>
    </div>
</template>
<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import * as echarts from "echarts/core";
import { TooltipComponent, TooltipComponentOption } from "echarts/components";
import { TreeChart } from "echarts/charts";
import { SVGRenderer } from "echarts/renderers";
echarts.use([TreeChart, SVGRenderer]);
type ECOption = echarts.ComposeOption<TooltipComponentOption>
export default defineComponent({
    setup() {
        const chartRef = ref<HTMLDivElement>();
        onMounted(() => {
            const chart = echarts.init(chartRef.value!);
            // chart.setOption()
        });
        return { chartRef }
    },
});
</script>
<style scoped>
</style>