"use client";

import React from "react";
import NgoDashboard from "../page";

export default function NgoDashboardTab({ params }: { params: { tab: string } }) {
  return <NgoDashboard params={params} />;
}
