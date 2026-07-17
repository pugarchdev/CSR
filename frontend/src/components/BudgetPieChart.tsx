"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface BudgetPieChartProps {
  data: Array<{ name: string; value: number }>;
  colors: string[];
}

export default function BudgetPieChart({ data, colors }: BudgetPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#f8fafc" }} 
          formatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} 
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
