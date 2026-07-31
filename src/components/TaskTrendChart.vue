<script lang="ts">
import * as echartsCore from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

// 在模块加载时注册一次，避免调试环境热更新时重复注册组件。
echartsCore.use([BarChart, LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);
</script>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import * as echarts from "echarts/core";
import type { ComposeOption, ECharts } from "echarts/core";
import type { BarSeriesOption, LineSeriesOption } from "echarts/charts";
import type { GridComponentOption, LegendComponentOption, TooltipComponentOption } from "echarts/components";

type TaskTrendChartOption = ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | GridComponentOption
  | LegendComponentOption
  | TooltipComponentOption
>;

interface TrendPoint {
  date: string;
  label: string;
  completed: number;
  unfinished: number;
  total: number;
}

const props = defineProps<{
  points: TrendPoint[];
  periodLabel: string;
  todayDate: string;
}>();

const chartElement = ref<HTMLElement>();
let chart: ECharts | null = null;
let resizeObserver: ResizeObserver | null = null;

function renderChart() {
  if (!chart) return;
  const todayPoint = props.points.find((point) => point.date === props.todayDate);
  const option: TaskTrendChartOption = {
    animationDuration: 420,
    animationEasing: "cubicOut",
    color: ["#00b96b", "#d89a3c", "#68e0aa"],
    tooltip: {
      trigger: "axis",
      backgroundColor: "#24272e",
      borderColor: "#414752",
      borderWidth: 1,
      padding: [9, 11],
      textStyle: { color: "#eef1f4", fontSize: 12 },
      axisPointer: { type: "shadow", shadowStyle: { color: "rgba(255,255,255,.04)" } },
      formatter: (params: unknown) => {
        const items = (Array.isArray(params) ? params : []) as Array<{ axisValueLabel: string; marker: string; seriesName: string; value: number }>;
        return [
        `<strong>${items[0]?.axisValueLabel || ""}</strong>`,
        ...items.map((item) => `${item.marker}${item.seriesName}　${item.value} 项`)
        ].join("<br/>");
      }
    },
    legend: {
      bottom: 4,
      icon: "roundRect",
      itemWidth: 9,
      itemHeight: 9,
      itemGap: 19,
      textStyle: { color: "#a8afb9", fontSize: 12 },
      data: ["已完成", "未完成", "任务总量"]
    },
    grid: { left: 38, right: 18, top: 16, bottom: 74, containLabel: false },
    xAxis: {
      type: "category",
      boundaryGap: true,
      data: props.points.map((point) => point.label),
      axisLine: { lineStyle: { color: "#3a3e47" } },
      axisTick: { show: false },
      axisLabel: {
        color: "#8c949f",
        fontSize: 11,
        lineHeight: 16,
        margin: 12,
        formatter: (value: string) => value === todayPoint?.label ? `{today|${value}}` : value,
        rich: {
          today: { color: "#ffffff", backgroundColor: "#00b96b", borderRadius: 7, padding: [3, 7], fontWeight: 700, lineHeight: 17 }
        }
      }
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      splitNumber: 4,
      axisLabel: { color: "#8c949f", fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "#353941", type: "dashed" } }
    },
    series: [
      {
        name: "已完成",
        type: "bar",
        data: props.points.map((point) => point.completed),
        barWidth: 20,
        barGap: "32%",
        itemStyle: { color: "#00b96b", borderRadius: 0 },
        emphasis: { focus: "series" }
      },
      {
        name: "未完成",
        type: "bar",
        data: props.points.map((point) => point.unfinished),
        barWidth: 20,
        itemStyle: { color: "#d89a3c", borderRadius: 0 },
        emphasis: { focus: "series" }
      },
      {
        name: "任务总量",
        type: "line",
        data: props.points.map((point) => point.total),
        smooth: true,
        symbol: "circle",
        symbolSize: 7,
        lineStyle: { color: "#68e0aa", width: 2.5 },
        itemStyle: { color: "#1d2026", borderColor: "#68e0aa", borderWidth: 2 },
        emphasis: { focus: "series" }
      }
    ]
  };
  chart.setOption(option, { notMerge: true, lazyUpdate: true });
}

onMounted(async () => {
  await nextTick();
  if (!chartElement.value) return;
  chart = echarts.init(chartElement.value, undefined, { renderer: "canvas" });
  renderChart();
  resizeObserver = new ResizeObserver(() => chart?.resize());
  resizeObserver.observe(chartElement.value);
});

watch(() => [props.points, props.periodLabel, props.todayDate], renderChart, { deep: true });

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  chart?.dispose();
  chart = null;
});
</script>

<template>
  <div ref="chartElement" class="task-trend-chart" :aria-label="`${periodLabel}任务趋势图：柱状显示完成和未完成，折线显示任务总量`" role="img" />
</template>

<style scoped>
.task-trend-chart { width: 100%; height: 308px; }

@media (max-width: 620px) {
  .task-trend-chart { height: 272px; }
}
</style>
