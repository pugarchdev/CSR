"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line
} from "recharts";

const districtData = [
  { name: "Pune", value: 45000000 },
  { name: "Mumbai City", value: 38000000 },
  { name: "Thane", value: 32000000 },
  { name: "Gadchiroli", value: 25000000 },
  { name: "Nandurbar", value: 18000000 },
  { name: "Others", value: 26000000 }
];

const projectStatusData = [
  { name: "Submitted", count: 85 },
  { name: "Under Review", count: 42 },
  { name: "Approved", count: 220 },
  { name: "Disbursing", count: 68 },
  { name: "Completed", count: 12 }
];

const transactionAuditsData = [
  { month: "Jan", count: 12 },
  { month: "Feb", count: 18 },
  { month: "Mar", count: 25 },
  { month: "Apr", count: 32 },
  { month: "May", count: 45 },
  { month: "Jun", count: 54 }
];

const BRAND_COLORS = [
  "#14274e", // Navy
  "#f7941d", // Saffron
  "#10b981", // Emerald
  "#6366f1", // Indigo
  "#a855f7", // Purple
  "#64748b"  // Slate
];

export function DistrictBudgetPieChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={districtData}
          cx="50%"
          cy="50%"
          innerRadius={45}
          outerRadius={65}
          paddingAngle={3}
          dataKey="value"
        >
          {districtData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={BRAND_COLORS[index % BRAND_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", color: "#0f172a" }} 
          formatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} 
        />
        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: "10px", fontWeight: 600, color: "#475569" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ProjectStatusWebChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={projectStatusData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
        <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
        <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "12px", color: "#0f172a" }} />
        <Bar dataKey="count" fill="#14274e" radius={[4, 4, 0, 0]}>
          {projectStatusData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={BRAND_COLORS[index % BRAND_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TransactionAuditsLineChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={transactionAuditsData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} />
        <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
        <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "12px", color: "#0f172a" }} />
        <Line type="monotone" dataKey="count" stroke="#f7941d" strokeWidth={3} activeDot={{ r: 8 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
