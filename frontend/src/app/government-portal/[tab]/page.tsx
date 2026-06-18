"use client";

import React from "react";
import GovernmentPortal from "../page";

export default function GovernmentPortalTab({ params }: { params: { tab: string } }) {
  return <GovernmentPortal params={params} />;
}
