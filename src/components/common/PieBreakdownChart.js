import React, { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend, Title);

// Props:
// - title: string
// - values: number[] (e.g., [printer, stock, other])
// - labels?: string[] (defaults to Printer/Stock/Other)
// - colors?: string[]
// - currency?: boolean (format values as currency)
// - height?: number (px)
const PieBreakdownChart = ({
  title = "Revenue Breakdown",
  values,
  labels = ["Printer", "Stock", "Other"],
  colors = ["#3b82f6", "#f59e0b", "#10b981"],
  currency = true,
  height = 260,
}) => {
  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          hoverOffset: 6,
          borderWidth: 0,
        },
      ],
    }),
    [labels, values, colors]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        title: { display: !!title, text: title },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const raw = Number(ctx.raw || 0);
              const txt = currency
                ? `₹${raw.toLocaleString("en-IN")}`
                : String(raw);
              return ` ${ctx.label}: ${txt}`;
            },
          },
        },
      },
      cutout: "56%",
    }),
    [title, currency]
  );

  return (
    <div style={{ width: "100%", height }}>
      <Doughnut data={data} options={options} />
    </div>
  );
};

export default PieBreakdownChart;
