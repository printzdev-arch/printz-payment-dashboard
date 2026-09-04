import React, { useMemo, useRef, useEffect } from "react";
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

// Props:
// - title: string
// - labels: string[] (y-axis)
// - values: number[] (x-axis)
// - color?: string (uniform bar color if rank coloring disabled)
// - xMax?: number (optional max for x scale)
// - valueFormatter?: (n:number)=>string (tooltip/tick formatter)
// - maxVisible?: number (default 8)
// - useRankColors?: boolean (default true)
// - topN?: number (default 3)
// - lowN?: number (default 1)
// - rankColors?: { top: string, mid: string, low: string }
// - yAxisWidth?: number (px width of fixed y label column, default 160)
// - minPlotHeight?: number (min height of plot area to keep single bar centered, default 240)
const HorizontalBarChart = ({
  title,
  labels,
  values,
  color = "#3b82f6",
  xMax,
  valueFormatter,
  maxVisible = 8,
  useRankColors = true,
  topN = 3,
  lowN = 1,
  rankColors = { top: "#10b981", mid: "#f59e0b", low: "#ef4444" },
  yAxisWidth = 160,
  minPlotHeight = 240,
}) => {
  // Estimate y-axis width from longest label if wider than default
  const estimatedYAxis = useMemo(() => {
    const longest = (labels || []).reduce(
      (m, s) => (s && s.length > m ? s.length : m),
      0
    );
    // Approx pixels per char; adjust if needed
    const px = longest * 8 + 24; // char width * 8 + padding
    return Math.max(yAxisWidth, Math.min(px, 320));
  }, [labels, yAxisWidth]);
  // Build backgroundColor array based on rank if enabled
  const backgroundColor = useMemo(() => {
    const n = values?.length || 0;
    if (!useRankColors || n === 0) return color;
    if (n === 1) return [rankColors.top];

    // indices [0..n-1]
    const indices = Array.from({ length: n }, (_, i) => i);
    // sort by value desc, stable-ish
    indices.sort((a, b) => Number(values[b] || 0) - Number(values[a] || 0));
    const topCount = Math.min(topN, n);
    const topSet = new Set(indices.slice(0, topCount));

    // number of items available for low rank (excluding top)
    const availableForLow = Math.max(0, n - topCount);
    const lowCount = Math.min(lowN, availableForLow);
    const lowSlice = lowCount > 0 ? indices.slice(-lowCount) : [];
    const lowSet = new Set(lowSlice);

    // default all to mid
    const arr = Array(n).fill(rankColors.mid);
    // apply top
    for (const idx of topSet) arr[idx] = rankColors.top;
    // apply low (override)
    for (const idx of lowSet) arr[idx] = rankColors.low;
    return arr;
  }, [values, useRankColors, topN, lowN, rankColors, color]);

  // Build datasets for the scrollable plot area and a bottom fixed x-axis strip
  const plotData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: title,
          data: values,
          backgroundColor,
          borderWidth: 0,
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
        padding: { left: 8, right: 8, top: 4, bottom: 4 },
      },
      scales: {
        x: {
          beginAtZero: true,
          max: xMax,
          grid: { display: true },
          ticks: {
            callback: (v) => (valueFormatter ? valueFormatter(Number(v)) : v),
          },
        },
        y: {
          display: false, // hide y labels inside canvas; we render them externally
        },
      },
      elements: {
        bar: {
          borderRadius: 4,
          inflateAmount: 2,
        },
      },
    }),
    [xMax, valueFormatter]
  );

  // Sizing and scroll behavior
  const rowHeight = 26; // px per bar
  const visibleRows = Math.max(1, Math.min(maxVisible, labels.length));
  const plotMaxHeight = Math.max(visibleRows * rowHeight, minPlotHeight);
  const plotTotalHeight = Math.max(labels.length * rowHeight, minPlotHeight);

  const yScrollRef = useRef(null);
  const plotScrollRef = useRef(null);
  useEffect(() => {
    const el = plotScrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (yScrollRef.current) yScrollRef.current.scrollTop = el.scrollTop;
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [labels.length]);

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      {/* Title (fixed) */}
      {title ? (
        <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
      ) : null}

      {/* Body: y labels (fixed) + plot (scrollable) */}
      <div style={{ display: "flex", width: "100%" }}>
        {/* Fixed Y-axis labels column */}
        <div
          style={{
            width: estimatedYAxis,
            flex: "0 0 auto",
            overflow: "hidden",
            borderRight: "1px solid #e5e7eb",
          }}
        >
          <div
            ref={yScrollRef}
            style={{
              maxHeight: plotMaxHeight,
              overflowY: "hidden",
            }}
          >
            <div style={{ height: plotTotalHeight }}>
              {labels.map((lbl, idx) => (
                <div
                  key={`yl-${idx}`}
                  style={{
                    height: rowHeight,
                    display: "flex",
                    alignItems: "center",
                    padding: "0 8px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontSize: 12,
                  }}
                  title={lbl}
                >
                  {lbl}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable plot area */}
        <div
          ref={plotScrollRef}
          style={{
            flex: 1,
            overflowY: labels.length > maxVisible ? "auto" : "hidden",
            maxHeight: plotMaxHeight,
          }}
        >
          <div style={{ height: plotTotalHeight }}>
            <Bar data={plotData} options={plotOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HorizontalBarChart;
