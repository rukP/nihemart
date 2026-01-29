import React from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface OrderStatusChartProps {
  data: Array<{ label: string; value: string }>;
}

export const OrderStatusChart: React.FC<OrderStatusChartProps> = ({ data }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Order Status Distribution
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Breakdown of orders by status
          </p>
        </div>
      </div>
      <ChartContainer
        config={{
          pending: {
            label: "Pending",
            color: "#f97316",
          },
          assigned: {
            label: "Assigned",
            color: "#a855f7",
          },
          processing: {
            label: "Processing",
            color: "#3b82f6",
          },
          delivered: {
            label: "Delivered",
            color: "#10b981",
          },
          canceled: {
            label: "Canceled",
            color: "#6b7280",
          },
          refunded: {
            label: "Refunded",
            color: "#ef4444",
          },
        }}
        className="h-[280px] w-full"
      >
        <BarChart
          data={data.map((item) => ({
            status: item.label,
            count: parseInt(item.value),
            color:
              item.label.toLowerCase() === "pending"
                ? "#f97316"
                : item.label.toLowerCase() === "assigned"
                  ? "#a855f7"
                  : item.label.toLowerCase() === "processing"
                    ? "#3b82f6"
                    : item.label.toLowerCase() === "delivered"
                      ? "#10b981"
                      : item.label.toLowerCase() === "canceled"
                        ? "#6b7280"
                        : item.label.toLowerCase() === "refunded"
                          ? "#ef4444"
                          : "#f97316",
          }))}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="status"
            tick={{ fill: "#6b7280", fontSize: 12 }}
            axisLine={{ stroke: "#e5e7eb" }}
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 12 }}
            axisLine={{ stroke: "#e5e7eb" }}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent className="rounded-lg border border-gray-200 shadow-lg" />
            }
          />
          <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={60}>
            {data.map((item, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  item.label.toLowerCase() === "pending"
                    ? "#f97316"
                    : item.label.toLowerCase() === "assigned"
                      ? "#a855f7"
                      : item.label.toLowerCase() === "processing"
                        ? "#3b82f6"
                        : item.label.toLowerCase() === "delivered"
                          ? "#10b981"
                          : item.label.toLowerCase() === "canceled"
                            ? "#6b7280"
                            : item.label.toLowerCase() === "refunded"
                              ? "#ef4444"
                              : "#f97316"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
};
