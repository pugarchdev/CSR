"use client";

import React from "react";
import CompanyDashboard from "../page";

export default function CompanyDashboardTab({ params }: { params: { tab: string } }) {
  return <CompanyDashboard params={params} />;
}
