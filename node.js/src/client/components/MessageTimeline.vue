<template>
  <div class="timeline-container">
    <div id="daily-messages" class="chart"></div>
    <div id="hourly-messages" class="chart"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from "vue";
import Plotly from "plotly.js-dist";

const props = defineProps<{
  dailyData: Array<{ date: string; count: number }>;
  hourlyData: Array<{ hour: number; count: number }>;
}>();

function createDailyChart() {
  const trace = {
    x: props.dailyData.map((d) => d.date),
    y: props.dailyData.map((d) => d.count),
    type: "bar",
    name: "Messages per day",
  };

  const layout = {
    title: "Daily Message Count",
    xaxis: { title: "Date" },
    yaxis: { title: "Messages" },
  };

  Plotly.newPlot("daily-messages", [trace], layout);
}

function createHourlyChart() {
  const trace = {
    x: props.hourlyData.map((d) => d.hour),
    y: props.hourlyData.map((d) => d.count),
    type: "scatter",
    mode: "lines+markers",
    name: "Messages per hour",
  };

  const layout = {
    title: "Hourly Message Distribution",
    xaxis: {
      title: "Hour",
      dtick: 2,
      range: [0, 23],
    },
    yaxis: { title: "Messages" },
  };

  Plotly.newPlot("hourly-messages", [trace], layout);
}

onMounted(() => {
  createDailyChart();
  createHourlyChart();
});

watch(
  () => [props.dailyData, props.hourlyData],
  () => {
    createDailyChart();
    createHourlyChart();
  },
  { deep: true }
);
</script>

<style scoped>
.timeline-container {
  width: 100%;
  display: grid;
  grid-gap: 20px;
}

.chart {
  width: 100%;
  height: 400px;
}
</style>
