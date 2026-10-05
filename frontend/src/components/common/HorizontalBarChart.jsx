import React, { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const HorizontalBarChart = ({
  title,
  labels = [],
  values = [],
  color = "#3b82f6",
  xMax,
  valueFormatter,
  useRankColors = true,
  topN = 3,
  lowN = 1,
  rankColors = { top: "#10b981", mid: "#f59e0b", low: "#ef4444" },
  minPlotHeight = 200,
}) => {
  // Build backgroundColor array based on rank if enabled
  const backgroundColor = useMemo(() => {
    const n = values?.length || 0;
    if (!useRankColors || n === 0) return color;
    if (n === 1) return [rankColors.top];

    const indices = Array.from({ length: n }, (_, i) => i);
    indices.sort((a, b) => Number(values[b] || 0) - Number(values[a] || 0));
    const topCount = Math.min(topN, n);
    const topSet = new Set(indices.slice(0, topCount));

    const availableForLow = Math.max(0, n - topCount);
    const lowCount = Math.min(lowN, availableForLow);
    const lowSlice = lowCount > 0 ? indices.slice(-lowCount) : [];
    const lowSet = new Set(lowSlice);

    const arr = Array(n).fill(rankColors.mid);
    for (const idx of topSet) arr[idx] = rankColors.top;
    for (const idx of lowSet) arr[idx] = rankColors.low;
    return arr;
  }, [values, useRankColors, topN, lowN, rankColors, color]);

  const plotData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: title || "",
          data: values,
          backgroundColor,
          borderWidth: 0,
          borderRadius: 6,
          barPercentage: 0.68,
          categoryPercentage: 0.85,
        },
      ],
    }),
    [labels, values, backgroundColor, title]
  );

  const plotOptions = useMemo(
    () => ({
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: false },
        tooltip: {
          titleFont: { family: "Poppins", size: 12, weight: "600" },
          bodyFont: { family: "Poppins", size: 12 },
          callbacks: {
            label: (ctx) => {
              const val = Number(ctx.parsed.x || 0);
              const txt = valueFormatter ? valueFormatter(val) : String(val);
              return ` ${txt}`;
            },
          },
        },
      },
      layout: {
        padding: { left: 4, right: 12, top: 4, bottom: 4 },
      },
      scales: {
        x: {
          beginAtZero: true,
          max: xMax,
          grid: { color: "#f1f5f9" },
          ticks: {
            color: "#64748b",
            font: { family: "Poppins", size: 11, weight: "500" },
            callback: (v) => (valueFormatter ? valueFormatter(Number(v)) : v),
          },
        },
        y: {
          display: true,
          grid: { display: false },
          ticks: {
            color: "#1e293b",
            font: { family: "Poppins", size: 12.5, weight: "600" },
            padding: 10,
          },
        },
      },
    }),
    [xMax, valueFormatter]
  );

  // Dynamic height ensuring each bar has comfortable height (36px per bar + 44px axis space)
  const plotTotalHeight = Math.max(labels.length * 36 + 44, minPlotHeight);

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", boxSizing: "border-box" }}>
      {title ? (
        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: "14px", color: "#0f172a" }}>
          {title}
        </div>
      ) : null}

      <div style={{ width: "100%", height: plotTotalHeight }}>
        <Bar data={plotData} options={plotOptions} />
      </div>
    </div>
  );
};

export default HorizontalBarChart;
