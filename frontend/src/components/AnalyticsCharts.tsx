"use client";

import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

const mockSdgStats = [
  { name: "SDG 4: Quality Education", count: 18 },
  { name: "SDG 6: Clean Water", count: 14 },
  { name: "SDG 3: Good Health", count: 12 },
  { name: "SDG 5: Gender Equality", count: 8 },
  { name: "SDG 13: Climate Action", count: 5 }
];

const mockFundingGrowth = [
  { year: "2022", funding: 42000000 },
  { year: "2023", funding: 78000000 },
  { year: "2024", funding: 112000000 },
  { year: "2025", funding: 145000000 },
  { year: "2026", funding: 184000000 }
];

const COLORS = ["#8b5cf6", "#6366f1", "#ec4899", "#0ea5e9", "#f59e0b"];

export function FundingGrowthChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={mockFundingGrowth}>
        <defs>
          <linearGradient id="colorFunding" cx="0" cy="0" r="1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="year" stroke="#64748b" fontSize={11} tickLine={false} />
        <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `₹${val / 10000000}Cr`} />
        <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#f8fafc" }} />
        <Area type="monotone" dataKey="funding" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorFunding)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SdgStatsChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={mockSdgStats}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
        <YAxis stroke="#64748b" fontSize={11} />
        <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#f8fafc" }} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {mockSdgStats.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
